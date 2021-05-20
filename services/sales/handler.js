const { types, appConfig, db, helpers, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const storage = require('./storage')
const {
  handleRequest,
  handleResponse,
  handleRead,
  handleCreateDocument,
  handleAuthorizeDocument,
  handleCreateInventoryMovements,
  handleAuthorizeInventoryMovements,
} = helpers

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage, nestedFieldsKeys: ['products'] })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  const inputType = {
    stakeholder_id: { type: ['string', 'number'], required: true },
    related_external_document_id: { type: ['string', 'number'] },
    operation_type: {
      type: { enum: types.operationsTypes },
      required: true,
    },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          product_quantity: { type: 'number', min: 0, required: true },
          product_price: { type: 'number', min: 0, required: true },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType, currentAction: types.actions.CREATE })
    const { stakeholder_id, operation_type, products } = req.body
    // can(req.currentAction, operation_type)
    const document_type = appConfig.operations[operation_type]?.initDocument

    const errors = []
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] ?? []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsStocks = await db.query(storage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsStocks.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['stakeholder_id', 'operation_type', 'products']
    const requiredProductFields = ['product_id', 'product_quantity', 'product_price']
    if (appConfig.operations[operation_type]?.hasExternalDocument && !appConfig.documents[document_type].requires.authorization)
      requiredFields.push('related_external_document_id')
    if (operation_type === types.operationsTypes.RENT) requiredFields.push('start_date', 'end_date')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k]))
    const [stakeholderExists] = await db.query(storage.findStakeholder({ id: stakeholder_id }))

    if (Object.keys(types.operationsTypes).every(k => types.operationsTypes[k] !== operation_type))
      errors.push(
        `The field operation_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (requiredProductErrorFields) errors.push(`The fields ${requiredProductFields.join(', ')} in products are required`)
    if (!stakeholderExists) errors.push('The provided stakeholder_id is not registered')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`The products with id ${id} is duplicated`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`The products with id ${id} is not registered`))
    if (appConfig.operations[operation_type]?.inventoryMovementsType?.some(mt => mt === types.inventoryMovementsTypes.OUT)) {
      const productsStocksMap = products.reduce((r, p) => {
        const product = productsStocks.find(ps => Number(ps.product_id) === Number(p.product_id))

        if (product?.stock) return { ...r, [p.product_id]: product.stock - p.product_quantity }
        else return r
      }, {})

      const negativeStocks = Object.keys(productsStocksMap).flatMap(k => (productsStocksMap[k] < 0 ? k : []))
      negativeStocks.forEach(id => errors.push(`The product with id ${id} cannot have negative stock`))
    }

    if (errors.length > 0) throw new ValidatorException(errors)

    const getProductsReturnCost = async () => {
      if (operation_type === types.operationsTypes.RENT) {
        const productsReturnCost = await db.query(storage.findProductReturnCost(productsIds))

        if (!productsReturnCost?.length > 0) return products

        return products.map(p => {
          const product = productsReturnCost.find(prc => Number(prc.product_id) === Number(p.product_id))

          return { ...p, product_return_cost: product.product_return_cost ?? null }
        })
      }

      return products
    }

    const productsWithReturnCost = await getProductsReturnCost()

    const res = await db.transaction(async connection => {
      const documentCreated = await handleCreateDocument(
        { ...req, body: { ...req.body, document_type, products: productsWithReturnCost } },
        { connection, storage }
      )
      const documentApproved = await handleAuthorizeDocument(documentCreated.req, documentCreated.res)
      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentApproved.req, documentApproved.res)
      const inventoryMovementsApproved = await handleAuthorizeInventoryMovements(inventoryMovementsCreated.req, inventoryMovementsCreated.res)

      return inventoryMovementsApproved.res
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.authorize = async event => {
  try {
    const inputType = {
      inventory_movements: {
        type: 'array',
        required: true,
        fields: {
          type: 'object',
          fields: {
            inventory_movement_id: { type: 'number', required: true },
            quantity: { type: 'number', min: 0, required: true },
          },
        },
      },
    }

    const req = await handleRequest({ event, inputType, currentAction: types.actions.APPROVED })
    const { inventory_movements } = req.body
    // can(req.currentAction, 'INVENTORY')

    const errors = []
    const movementsMap = inventory_movements.reduce(
      (r, im) => ({ ...r, [im.inventory_movement_id]: [...(r[im.inventory_movement_id] ?? []), im.inventory_movement_id] }),
      {}
    )
    const duplicateMovements = Object.keys(movementsMap)?.flatMap(k => (movementsMap[k].length > 1 ? k : []))
    const movementsIds = inventory_movements?.map(im => im.inventory_movement_id)
    const movements = await db.query(storage.checkInventoryMovementsExists(movementsIds))
    const movementsExists = inventory_movements?.flatMap(im =>
      !movements?.some(m => Number(m.id) === Number(im.inventory_movement_id)) ? im.inventory_movement_id : []
    )
    const requiredMovementFields = ['inventory_movement_id', 'quantity']
    const requiredMovementErrorFields = requiredMovementFields.some(k => inventory_movements?.some(im => !im[k]))

    if (duplicateMovements?.length > 0) duplicateMovements.forEach(id => errors.push(`The movement with id ${id} is duplicated`))
    if (movementsExists?.length > 0) movementsExists.forEach(id => errors.push(`The movement with id ${id} is not registered`))
    if (requiredMovementErrorFields) errors.push(`The fields ${requiredMovementFields.join(', ')} in inventory_movements are required`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const { res } = await db.transaction(async connection => await handleAuthorizeInventoryMovements(req, { connection, storage }))

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
