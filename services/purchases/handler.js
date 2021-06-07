const {
  types,
  calculateProductTaxes,
  getFormattedDates,
  groupJoinResult,
  db,
  helpers,
  ValidatorException,
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
} = helpers

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

module.exports.create = async event => {
  const inputType = {
    stakeholder_id: { type: ['string', 'number'] },
    // stakeholder_name: { type: 'string', length: 100 },
    // stakeholder_address: { type: 'string', length: 100 },
    // stakeholder_nit: { type: 'string', length: 11 },
    // stakeholder_phone: { type: 'string', length: 20 },
    start_date: { type: 'string', required: true },
    related_external_document_id: { type: ['string', 'number'], required: true },
    comments: { type: 'string' },
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
    const { stakeholder_id, stakeholder_nit, products, start_date } = req.body
    const stakeholder_type = types.stakeholdersTypes.PROVIDER
    const operation_type = types.operationsTypes.PURCHASE

    // can(req.currentAction, operation_type)

    const errors = []
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] ?? []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsStocks = await db.query(storage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsStocks.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['stakeholder_id', 'products', 'related_external_document_id']
    if (!stakeholder_id) requiredFields.push('stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    const requiredProductFields = ['product_id', 'product_quantity', 'product_price']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k]))
    const [stakeholderNitUnique] = stakeholder_nit ? await db.query(storage.findStakeholder({ nit: stakeholder_nit, stakeholder_type })) : []
    const [stakeholderIdExists] = stakeholder_id ? await db.query(storage.findStakeholder({ id: stakeholder_id })) : []

    if (Object.keys(types.operationsTypes).every(k => types.operationsTypes[k] !== operation_type))
      errors.push(
        `The field operation_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (requiredProductErrorFields) errors.push(`The fields ${requiredProductFields.join(', ')} in products are required`)
    if (stakeholderNitUnique) errors.push('The provided nit is already registered')
    if (stakeholder_id && !stakeholderIdExists) errors.push('The provided stakeholder_id is not registered')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`The products with id ${id} is duplicated`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`The products with id ${id} is not registered`))

    if (errors.length > 0) throw new ValidatorException(errors)

    const productsWithTaxes = calculateProductTaxes(products, productsStocks)
    const formattedDates = getFormattedDates({ start_date })

    const { res } = await db.transaction(async connection => {
      const stakeholderCreated = await handleCreateStakeholder(
        { ...req, body: { ...req.body, ...formattedDates, products: productsWithTaxes } },
        { connection }
      )

      const documentCreated = await handleCreateDocument(
        { ...stakeholderCreated.req, body: { ...stakeholderCreated.req.body, document_type: types.documentsTypes.PURCHASE_ORDER } },
        stakeholderCreated.res
      )

      const operationCreated = await handleCreateOperation(
        { ...documentCreated.req, body: { ...documentCreated.req.body, operation_type } },
        documentCreated.res
      )

      const documentApproved = await handleApproveDocument(operationCreated.req, operationCreated.res)

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

    // can(req.currentAction, types.operationsTypes.PURCHASE)

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentMovements = await db.query(storage.findDocumentMovements(), [document_id])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (!documentMovements?.length > 0) errors.push('There is no purchase registered with the provided document_id')
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
