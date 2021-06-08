const {
  types,
  calculateProductTaxes,
  groupJoinResult,
  db,
  helpers,
  ValidatorException,
  getFormattedDates,
} = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
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
  handleCreateOperation,
  handleUpdateStock,
  handleUpdateDocument,
  handleDeleteInventoryMovements,
} = helpers

const config = {
  [types.operationsTypes.SELL]: {
    initDocument: types.documentsTypes.SELL_PRE_INVOICE,
    finishDocument: types.documentsTypes.SELL_INVOICE,
  },
  [types.operationsTypes.RENT]: {
    initDocument: types.documentsTypes.RENT_PRE_INVOICE,
    finishDocument: types.documentsTypes.RENT_INVOICE,
  },
}

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findAllBy, nestedFieldsKeys: ['products'] })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readSalesStatus = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findSalesStatus })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  const inputType = {
    stakeholder_id: { type: ['string', 'number'], required: true },
    // stakeholder_type: { type: { enum: types.stakeholdersTypes } },
    // stakeholder_name: { type: 'string', length: 100 },
    // stakeholder_address: { type: 'string', length: 100 },
    // stakeholder_nit: { type: 'string', length: 11 },
    // stakeholder_phone: { type: 'string', length: 20 },
    related_external_document_id: { type: ['string', 'number'] },
    comments: { type: 'string' },
    received_by: { type: 'string' },
    // operation_type: {
    //   type: { enum: types.operationsTypes },
    //   required: true,
    // },
    project_id: { type: ['string', 'number'], required: true },
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
    const req = await handleRequest({ event, inputType })
    const operation_type = types.operationsTypes.RENT
    const { stakeholder_id, products } = req.body
    // can(req.currentAction, operation_type)

    const errors = []
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] ?? []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsStocks = await db.query(storage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsStocks.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['stakeholder_id', 'project_id', 'products']
    const requiredProductFields = ['product_id', 'product_quantity', 'product_price']
    if (!stakeholder_id) requiredFields.push('stakeholder_type', 'stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    if (operation_type === types.operationsTypes.RENT) requiredFields.push('start_date', 'end_date')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k]))
    const [stakeholderIdExists] = stakeholder_id ? await db.query(storage.findStakeholder({ id: stakeholder_id })) : []

    if (Object.keys(types.operationsTypes).every(k => types.operationsTypes[k] !== operation_type))
      errors.push(
        `The field operation_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (requiredProductErrorFields) errors.push(`The fields ${requiredProductFields.join(', ')} in products are required`)
    if (stakeholder_id && !stakeholderIdExists) errors.push('The provided stakeholder_id is not registered')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`The products with id ${id} is duplicated`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`The products with id ${id} is not registered`))

    if (errors.length > 0) throw new ValidatorException(errors)

    const getProductsReturnCost = async () => {
      if (operation_type === types.operationsTypes.RENT) {
        const productsReturnCost = await db.query(storage.findProductReturnCost(productsIds))

        if (!productsReturnCost?.length > 0) return products

        return products.map(p => {
          const product = productsReturnCost.find(prc => Number(prc.product_id) === Number(p.product_id))

          return { ...p, product_return_cost: product?.product_return_cost ?? null }
        })
      }

      return products
    }

    const productsWithReturnCost = await getProductsReturnCost()

    const productsWithTaxes = calculateProductTaxes(productsWithReturnCost, productsStocks)

    const { res } = await db.transaction(async connection => {
      const stakeholderCreated = await handleCreateStakeholder(
        { ...req, body: { ...req.body, operation_type, products: productsWithTaxes } },
        { connection }
      )

      const documentCreated = await handleCreateDocument(
        { ...stakeholderCreated.req, body: { ...stakeholderCreated.req.body, document_type: config[operation_type].initDocument } },
        stakeholderCreated.res
      )

      const operationCreated = await handleCreateOperation(
        { ...documentCreated.req, body: { ...documentCreated.req.body, operation_type } },
        documentCreated.res
      )

      const documentApproved = await handleApproveDocument(
        { ...operationCreated.req, keepStatus: types.documentsStatus.PENDING },
        operationCreated.res
      )

      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentApproved.req, documentApproved.res)

      const inventoryMovementsApproved = await handleApproveInventoryMovements(inventoryMovementsCreated.req, inventoryMovementsCreated.res)

      return await handleUpdateStock(inventoryMovementsApproved.req, { ...inventoryMovementsApproved.res, updateStockOn: types.actions.APPROVED })
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.update = async event => {
  const inputType = {
    document_id: { type: ['string', 'number'], required: true },
    project_id: { type: ['string', 'number'], required: true },
    related_external_document_id: { type: 'string' },
    comments: { type: 'string' },
    received_by: { type: 'string' },
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
    const req = await handleRequest({ event, inputType })
    const { document_id, products, start_date, end_date } = req.body
    // can(req.currentAction, operation_type)

    const rawDocument = document_id && (await db.query(storage.findDocument(), [document_id]))
    const [documentWithDuplicates] = rawDocument
      ? groupJoinResult({ data: rawDocument, nestedFieldsKeys: ['old_inventory_movements', 'old_products'], uniqueKey: ['document_id'] })
      : []
    const oldProductsWithoutDuplicates = documentWithDuplicates?.old_products.reduce((r, im) => {
      const sameProduct = r.find(rv => Number(rv.product_id) === Number(im.product_id))

      if (sameProduct) return r
      else return [...r, im]
    }, [])

    const oldInventoryMovementsWithoutDuplicates = documentWithDuplicates?.old_inventory_movements.reduce((r, im) => {
      const sameMovement = r.find(rv => Number(rv.inventory_movement_id) === Number(im.inventory_movement_id))

      if (sameMovement) return r
      else return [...r, im]
    }, [])

    const document = {
      ...documentWithDuplicates,
      old_inventory_movements: oldInventoryMovementsWithoutDuplicates,
      old_products: oldProductsWithoutDuplicates,
    }

    const errors = []
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] ?? []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsStocks = await db.query(storage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsStocks?.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['document_id', 'project_id', 'products']
    const requiredProductFields = ['product_id', 'product_quantity', 'product_price']
    if (document?.operation_type === types.operationsTypes.RENT) requiredFields.push('start_date', 'end_date')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k]))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (requiredProductErrorFields) errors.push(`The fields ${requiredProductFields.join(', ')} in products are required`)
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`The products with id ${id} is duplicated`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`The products with id ${id} is not registered`))
    if (document?.status !== types.documentsStatus.PENDING)
      errors.push(`The edition is only allowed when the document has status ${types.documentsStatus.PENDING}`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const productsWithTaxes = calculateProductTaxes(products, productsStocks)

    const formattedDates = getFormattedDates({ start_date, end_date })

    const { res } = await db.transaction(async connection => {
      const documentUpdated = await handleUpdateDocument(
        { ...req, body: { ...document, ...req.body, ...formattedDates, products: productsWithTaxes } },
        { connection }
      )

      const inventoryMovementsDeleted = await handleDeleteInventoryMovements(documentUpdated.req, documentUpdated.res)

      const inventoryMovementsCreated = await handleCreateInventoryMovements(inventoryMovementsDeleted.req, inventoryMovementsDeleted.res)

      const inventoryMovementsApproved = await handleApproveInventoryMovements(inventoryMovementsCreated.req, inventoryMovementsCreated.res)

      return await handleUpdateStock(inventoryMovementsApproved.req, { ...inventoryMovementsApproved.res, updateStockOn: types.actions.APPROVED })
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.invoice = async event => {
  try {
    const inputType = { document_id: { type: ['number', 'string'], required: true } }

    const req = await handleRequest({ event, inputType })
    const { document_id } = req.body

    // can(req.currentAction, types.operationsTypes.PURCHASE)

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentDetails = document_id ? await db.query(storage.findDocumentDetails(), [document_id]) : []
    const invalidStatusProducts = documentDetails.flatMap(pm =>
      pm.products__product_status !== types.productsStatus.ACTIVE ? pm.products__product_id : []
    )

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (!documentDetails?.length > 0) errors.push('There is no document registered with the provided document_id')
    if (invalidStatusProducts?.length > 0)
      invalidStatusProducts.forEach(id => errors.push(`The product with id ${id} must be ${types.productsStatus.ACTIVE}`))
    if (documentDetails[0]?.document_status === types.documentsStatus.CANCELLED) errors.push('The document is cancelled')
    if (documentDetails[0]?.related_internal_document_id)
      errors.push(`The document is already related to the invoice with id ${documentDetails[0]?.related_internal_document_id}`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const [groupedDocumentDetails] = groupJoinResult({
      data: documentDetails,
      nestedFieldsKeys: ['products'],
      uniqueKey: ['document_id'],
    })

    const products = groupedDocumentDetails.products.reduce((r, im) => {
      const sameProduct = r.find(rv => Number(rv.product_id) === Number(im.product_id))

      if (sameProduct) return r
      else return [...r, im]
    }, [])

    const operation_type = groupedDocumentDetails.operation_type

    const { res } = await db.transaction(async connection => {
      const documentCreated = await handleCreateDocument(
        {
          ...req,
          body: { ...req.body, ...groupedDocumentDetails, products, document_type: config[operation_type].finishDocument },
        },
        { connection }
      )

      const documentApproved = await handleApproveDocument(documentCreated.req, documentCreated.res)

      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentApproved.req, documentApproved.res)

      const inventoryMovementsApproved = await handleApproveInventoryMovements(inventoryMovementsCreated.req, inventoryMovementsCreated.res)

      return await handleUpdateStock(inventoryMovementsApproved.req, { ...inventoryMovementsApproved.res, updateStockOn: types.actions.APPROVED })
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
      document_id: { type: ['number', 'string'], required: true },
    }

    const req = await handleRequest({ event, inputType })
    const { document_id } = req.body

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentMovements = await db.query(storage.findDocumentMovements(), [document_id])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (!documentMovements || !documentMovements[0]) errors.push('There is no invoice registered with the provided document_id')
    if (documentMovements[0]?.document_status === types.documentsStatus.CANCELLED) errors.push('The document is already cancelled')

    if (errors.length > 0) throw new ValidatorException(errors)

    const [groupedDocumentMovements] = groupJoinResult({
      data: documentMovements,
      nestedFieldsKeys: ['inventory_movements'],
      uniqueKey: ['document_id'],
    })

    const { res } = await db.transaction(async connection => {
      const documentCancelled = await handleCancelDocument({ ...req, body: { ...req.body, ...groupedDocumentMovements } }, { connection })

      return await handleUpdateStock(documentCancelled.req, { ...documentCancelled.res, updateStockOn: types.actions.CANCELLED })
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
