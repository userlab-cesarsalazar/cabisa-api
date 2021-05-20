const { types, appConfig, db, helpers, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const storage = require('./storage')
const {
  handleRequest,
  handleResponse,
  handleRead,
  handleCreateDocument,
  handleApproveDocument,
  handleCreateInventoryMovements,
  handleApproveInventoryMovements,
  handleCreateStakeholder,
  handleCancelDocument,
  handleCancelInventoryMovements,
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
  // proyecto
  // encargado
  // fecha

  // observaciones -> comments
  // quien-entrega -> es el usuario logieado (que cobra comision)
  // quien-recibe -> string
  const inputType = {
    stakeholder_id: { type: ['string', 'number'] },
    stakeholder_name: { type: 'string', length: 100 },
    stakeholder_address: { type: 'string', length: 100 },
    stakeholder_nit: { type: 'string', length: 11 },
    stakeholder_phone: { type: 'string', length: 20 },
    related_external_document_id: { type: ['string', 'number'], required: true },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          product_quantity: { type: 'number', min: 0, required: true },
          product_price: { type: 'number', min: 0 },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType, currentAction: types.actions.CREATE })
    const { stakeholder_id, stakeholder_nit, products } = req.body
    const stakeholder_type = types.stakeholdersTypes.PROVIDER
    const operation_type = types.operationsTypes.PURCHASE
    const document_type = appConfig.operations[operation_type]?.initDocument

    // can(req.currentAction, operation_type)

    const errors = []
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] ?? []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsStocks = await db.query(storage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsStocks.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['products', 'related_external_document_id']
    if (stakeholder_id) requiredFields.push('stakeholder_id')
    if (!stakeholder_id) requiredFields.push('stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    const requiredProductFields = ['product_id', 'product_quantity']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k]))
    const [stakeholderNitExists] = stakeholder_nit ? await db.query(storage.findStakeholder({ nit: stakeholder_nit, stakeholder_type })) : []
    const [stakeholderIdExists] = stakeholder_id ? await db.query(storage.findStakeholder({ id: stakeholder_id })) : []

    if (Object.keys(types.operationsTypes).every(k => types.operationsTypes[k] !== operation_type))
      errors.push(
        `The field operation_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (requiredProductErrorFields) errors.push(`The fields ${requiredProductFields.join(', ')} in products are required`)
    if (stakeholderNitExists) errors.push('The provided nit is already registered')
    if (!stakeholderIdExists) errors.push('The provided stakeholder_id is not registered')
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

    const actualProducts = products.map(p => {
      const sameProduct = productsStocks.find(ps => Number(ps.product_id) === Number(p.product_id))

      return {
        ...p,
        product_price: p?.product_price > 0 ? p.product_price : sameProduct.product_price,
        tax_fee: sameProduct.tax_fee,
        tax_amount: sameProduct.tax_amount,
      }
    })

    const { res } = await db.transaction(async connection => {
      const stakeholderCreated = await handleCreateStakeholder(
        { ...req, body: { ...req.body, products: actualProducts, document_type, stakeholder_type, operation_type } },
        { connection, storage }
      )
      const documentCreated = await handleCreateDocument(stakeholderCreated.req, stakeholderCreated.res)
      const documentApproved = await handleApproveDocument(documentCreated.req, documentCreated.res)
      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentApproved.req, documentApproved.res)
      return await handleApproveInventoryMovements(inventoryMovementsCreated.req, inventoryMovementsCreated.res)
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.cancel = async event => {
  try {
    const inputType = {
      document_id: { type: 'number || string', required: true },
      cancel_reason: { type: 'string', required: true },
    }

    const req = await handleRequest({ event, inputType, currentAction: types.actions.CANCELLED })
    const { document_id } = req.body

    // can(req.currentAction, types.operationsTypes.PURCHASE)

    const errors = []
    const requiredFields = ['document_id', 'cancel_reason']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [purchaseMovements] = document_id
      ? await db.query(storage.findPurchaseMovements({ id: document_id, document_type: types.documentsTypes.PURCHASE_ORDER }))
      : []
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (!purchaseMovements) errors.push('There is no purchase registered with the provided document_id')

    if (errors.length > 0) throw new ValidatorException(errors)

    const { res } = await db.transaction(
      async connection => await handleCancelDocument({ ...req, body: { ...req.body, ...purchaseMovements } }, { connection, storage })
    )

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
