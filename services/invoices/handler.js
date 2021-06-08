const { types, calculateProductTaxes, groupJoinResult, db, helpers, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
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

    const data = res.data.map(invoice => {
      const { discount, discount_percentage, subtotal, total_tax, total } = invoice.products.reduce((r, p) => {
        const discount = (r.discount || 0) + p.unit_discount_amount * p.product_quantity
        const subtotal = (r.subtotal || 0) + p.product_price * p.product_quantity
        const total_tax = (r.total_tax || 0) + p.unit_tax_amount * p.product_quantity

        return {
          discount,
          discount_percentage: p.discount_percentage,
          subtotal,
          total_tax,
          total: subtotal + total_tax,
        }
      }, {})

      const products = invoice.products.map(p => ({
        ...p,
        subtotal: p.product_price * p.product_quantity,
        subtotal_tax: p.unit_tax_amount * p.product_quantity,
      }))

      return {
        ...invoice,
        discount,
        discount_percentage,
        subtotal,
        total_tax,
        total,
        products,
      }
    })

    return await handleResponse({ req, res: { ...res, data } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readPaymentMethods = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findPaymentMethods })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readInvoicesStatus = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findInvoiceStatus })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  const inputType = {
    stakeholder_id: { type: ['string', 'number'], required: true },
    payment_method: { type: { enum: types.documentsPaymentMethods }, required: true },
    project_id: { type: ['string', 'number'], required: true },
    // stakeholder_type: { type: { enum: [types.stakeholdersTypes.CLIENT_INDIVIDUAL, types.stakeholdersTypes.CLIENT_COMPANY] } },
    // stakeholder_name: { type: 'string', length: 100 },
    // stakeholder_address: { type: 'string', length: 100 },
    // stakeholder_nit: { type: 'string', length: 11 },
    // stakeholder_phone: { type: 'string', length: 20 },
    related_external_document_id: { type: ['string', 'number'] },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          product_quantity: { type: 'number', min: 0, required: true },
          product_price: { type: 'number', min: 0, required: true },
          product_discount_percentage: { type: 'number', min: 0 },
          product_discount: { type: 'number', min: 0 },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    const { stakeholder_id, project_id, stakeholder_type, stakeholder_nit, payment_method, products } = req.body
    const operation_type = types.operationsTypes.SELL
    // can(req.currentAction, operation_type)

    const errors = []
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] ?? []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsStocks = await db.query(storage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsStocks.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['stakeholder_id', 'products', 'payment_method', 'project_id']
    // if (!stakeholder_id) requiredFields.push('stakeholder_type', 'stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    const requiredProductFields = ['product_id', 'product_quantity', 'product_price']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k]))
    const [stakeholderNitUnique] = stakeholder_nit ? await db.query(storage.findStakeholder({ nit: stakeholder_nit, stakeholder_type })) : []
    const [stakeholderIdExists] = stakeholder_id ? await db.query(storage.findStakeholder({ id: stakeholder_id })) : []
    const [projectExists] = project_id ? await db.query(storage.checkProjectExists(), [project_id]) : []

    if (Object.keys(types.operationsTypes).every(k => types.operationsTypes[k] !== operation_type))
      errors.push(
        `The field operation_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (Object.keys(types.documentsPaymentMethods).every(k => types.documentsPaymentMethods[k] !== payment_method))
      errors.push(
        `The field payment_method must contain one of these values: ${Object.keys(types.documentsPaymentMethods)
          .map(k => types.documentsPaymentMethods[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (requiredProductErrorFields) errors.push(`The fields ${requiredProductFields.join(', ')} in products are required`)
    if (stakeholderNitUnique) errors.push('The provided nit is already registered')
    if (stakeholder_id && !stakeholderIdExists) errors.push('The provided stakeholder_id is not registered')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`The products with id ${id} is duplicated`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`The products with id ${id} is not registered`))
    if (project_id && !projectExists) errors.push(`The provided project_id is not registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const productsWithTaxes = calculateProductTaxes(products, productsStocks)

    const { res } = await db.transaction(async connection => {
      const stakeholderCreated = await handleCreateStakeholder({ ...req, body: { ...req.body, products: productsWithTaxes } }, { connection })

      const initDocumentCreated = await handleCreateDocument(
        { ...stakeholderCreated.req, body: { ...stakeholderCreated.req.body, document_type: types.documentsTypes.SELL_PRE_INVOICE } },
        stakeholderCreated.res
      )

      const finishDocumentCreated = await handleCreateDocument(
        { ...initDocumentCreated.req, body: { ...initDocumentCreated.req.body, document_type: types.documentsTypes.SELL_INVOICE } },
        initDocumentCreated.res
      )

      const operationCreated = await handleCreateOperation(
        { ...finishDocumentCreated.req, body: { ...finishDocumentCreated.req.body, operation_type } },
        finishDocumentCreated.res
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
