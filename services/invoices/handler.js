const mysql = require('mysql2/promise')
const {
  commonStorage,
  types,
  calculateProductTaxes,
  groupJoinResult,
  mysqlConfig,
  helpers,
  validators,
  ValidatorException,
} = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
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
const { parentChildProductsValidator } = validators
const db = mysqlConfig(mysql)

module.exports.readServiceVersion = async () => {
  try {
    const servicePackage = require('./package.json')

    const res = { statusCode: 200, data: { version: servicePackage.version }, message: 'Successful response' }

    return await handleResponse({ req: {}, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

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

      const products = invoice.products.map(p => {
        return {
          ...p,
          subtotal: p.product_price * p.product_quantity,
          subtotal_tax: p.unit_tax_amount * p.product_quantity,
        }
      })

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

module.exports.readInvoiceServiceType = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findInvoiceServiceType })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readCreditDays = async event => {
  try {
    const req = await handleRequest({ event })

    const data = Object.keys(types.creditsPolicy.creditDaysEnum).map(k => types.creditsPolicy.creditDaysEnum[k])

    const res = { statusCode: 200, data }

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readCreditStatus = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findCreditStatus })

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
    credit_days: { type: { enum: types.creditsPolicy.creditDaysEnum } },
    subtotal_amount: { type: 'number', min: 1, required: true },
    total_discount_amount: { type: 'number', required: true },
    total_tax_amount: { type: 'number', required: true },
    total_amount: { type: 'number', min: 0, required: true },
    // stakeholder_type: { type: { enum: [types.stakeholdersTypes.CLIENT_INDIVIDUAL, types.stakeholdersTypes.CLIENT_COMPANY] } },
    // stakeholder_name: { type: 'string', length: 100 },
    // stakeholder_address: { type: 'string', length: 100 },
    // stakeholder_nit: { type: 'string', length: 11 },
    // stakeholder_phone: { type: 'string', length: 20 },
    related_external_document_id: { type: ['string', 'number'] },
    description: { type: 'string' },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          service_type: { type: { enum: types.documentsServiceType }, required: true },
          product_quantity: { type: 'number', min: 0, required: true },
          product_price: { type: 'number', min: 0, required: true },
          product_discount_percentage: { type: 'number', min: 0 },
          product_discount: { type: 'number', min: 0 },
          parent_product_id: { type: ['string', 'number'] },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    const {
      stakeholder_id,
      project_id,
      stakeholder_type,
      stakeholder_nit,
      payment_method,
      credit_days,
      total_discount_amount,
      total_tax_amount,
      subtotal_amount = 0,
      total_amount,
      products,
    } = req.body
    const operation_type = types.operationsTypes.SELL
    // can(req.currentAction, operation_type)

    const errors = []
    const productsMap = products.reduce((r, p) => {
      if (p.parent_product_id) return r

      return { ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }
    }, {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(commonStorage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsFromDB.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['stakeholder_id', 'products', 'payment_method', 'project_id', 'subtotal_amount', 'total_amount']
    if (Number(total_discount_amount) !== 0) requiredFields.push('total_discount_amount')
    if (Number(total_tax_amount) !== 0) requiredFields.push('total_tax_amount')
    // if (!stakeholder_id) requiredFields.push('stakeholder_type', 'stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    const requiredProductFields = ['product_id', 'service_type', 'product_quantity', 'product_price']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))
    const [stakeholderNitUnique] = stakeholder_nit ? await db.query(commonStorage.findStakeholder({ nit: stakeholder_nit, stakeholder_type })) : []
    const [stakeholderIdExists] = stakeholder_id ? await db.query(commonStorage.findStakeholder({ id: stakeholder_id })) : []
    const [projectExists] = project_id ? await db.query(storage.checkProjectExists(), [project_id]) : []
    const stakeholderCredits = stakeholder_id ? await db.query(commonStorage.findStakeholderCredit(stakeholder_id)) : []
    const currentCredit = stakeholderCredits && stakeholderCredits[0] ? stakeholderCredits.reduce((r, v) => r + v.credit_amount, 0) : 0
    const isInvalidCreditAmount =
      stakeholderIdExists && stakeholderIdExists.credit_limit && currentCredit + subtotal_amount > stakeholderIdExists.credit_limit

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
    if (credit_days && Object.keys(types.creditsPolicy.creditDaysEnum).every(k => types.creditsPolicy.creditDaysEnum[k] !== credit_days))
      errors.push(
        `The field credit_days must contain one of these values: ${Object.keys(types.creditsPolicy.creditDaysEnum)
          .map(k => types.creditsPolicy.creditDaysEnum[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (stakeholderNitUnique) errors.push('El nit ya se encuentra registrado')
    if (stakeholder_id && !stakeholderIdExists) errors.push('El cliente ya se encuentra registrado')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`Los productos con id ${id} no deben estar duplicados`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`El producto con id ${id} no esta registrado`))
    if (project_id && !projectExists) errors.push(`El proyecto no se encuentra registrado`)
    if (subtotal_amount <= 0) errors.push(`El monto subtotal de la factura debe ser mayor a cero`)
    if (total_amount <= 0) errors.push(`El monto total de la factura debe ser mayor a cero`)
    if (credit_days && (!stakeholderIdExists || !stakeholderIdExists.credit_limit))
      errors.push(`Debe asignar un limite de credito al cliente antes de otorgarle un credito`)
    if (credit_days && isInvalidCreditAmount) errors.push(`Se ha superado el limite de credito del cliente`)
    products.forEach(p => {
      if (Object.keys(types.documentsServiceType).every(k => types.documentsServiceType[k] !== p.service_type))
        errors.push(
          `The field service_type must contain one of these values: ${Object.keys(types.documentsServiceType)
            .map(k => types.documentsServiceType[k])
            .join(', ')}`
        )

      if (p.service_type === types.documentsServiceType.SERVICE) {
        const parentChildProductsErrors = parentChildProductsValidator(p, products, productsFromDB)
        parentChildProductsErrors[0] && parentChildProductsErrors.forEach(pce => errors.push(pce))
      }
    })

    if (errors.length > 0) throw new ValidatorException(errors)

    const productsWithTaxes = calculateProductTaxes(products, productsFromDB)

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

      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentApproved.req, {
        ...documentApproved.res,
        createInventoryMovementType: types.inventoryMovementsTypes.OUT,
      })

      const inventoryMovementsApproved = await handleApproveInventoryMovements(inventoryMovementsCreated.req, inventoryMovementsCreated.res)

      return await handleUpdateStock(inventoryMovementsApproved.req, { ...inventoryMovementsApproved.res, updateStockOn: types.actions.APPROVED })
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.updateCreditStatus = async event => {
  try {
    const inputType = {
      document_id: { type: ['number', 'string'], required: true },
      credit_status: { type: { enum: types.creditsPolicy.creditStatusEnum }, required: true },
    }

    const req = await handleRequest({ event, inputType })
    const { document_id, credit_status } = req.body

    const errors = []
    const requiredFields = ['document_id', 'credit_status']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [document] = await db.query(storage.findRelatedDocument(), [document_id])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!document || !document.id)
      errors.push(`El documento debe ser del tipo ${types.documentsTypes.SELL_INVOICE} o ${types.documentsTypes.RENT_INVOICE}`)
    if (!document || !document.credit_days) errors.push(`El documento debe estar asociado a un credito`)
    if (Object.keys(types.creditsPolicy.creditStatusEnum).every(k => types.creditsPolicy.creditStatusEnum[k] !== credit_status))
      errors.push(
        `The field credit_status must contain one of these values: ${Object.keys(types.creditsPolicy.creditStatusEnum)
          .map(k => types.creditsPolicy.creditStatusEnum[k])
          .join(', ')}`
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    await db.transaction(async connection => {
      await connection.query(storage.updateInvoiceStatus(), [credit_status, document_id])

      if (document.related_internal_document_id)
        await connection.query(storage.updateInvoiceStatus(), [credit_status, document.related_internal_document_id])
    })

    return await handleResponse({
      req,
      res: { statusCode: 200, data: { document_id, credit_status }, message: 'Documento actualizado exitosamente' },
    })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.cancel = async event => {
  try {
    const inputType = {
      document_id: { type: ['number', 'string'], required: true },
      cancel_reason: { type: 'string' },
    }

    const req = await handleRequest({ event, inputType })
    const { document_id } = req.body

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentMovements = await db.query(
      commonStorage.findDocumentMovements([types.documentsTypes.SELL_INVOICE, types.documentsTypes.RENT_INVOICE]),
      [document_id]
    )

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!documentMovements || !documentMovements[0]) errors.push('No existen facturas registradas con la informacion recibida')
    if (documentMovements[0] && documentMovements[0].document_status === types.documentsStatus.CANCELLED)
      errors.push('El documento ya se encuentra cancelado')

    if (errors.length > 0) throw new ValidatorException(errors)

    const [groupedDocumentMovements] = groupJoinResult({
      data: documentMovements,
      nestedFieldsKeys: ['inventory_movements'],
      uniqueKey: ['document_id'],
    })

    const { res } = await db.transaction(async connection => {
      const documentCancelled = await handleCancelDocument({ ...req, body: { ...groupedDocumentMovements, ...req.body } }, { connection })

      return await handleUpdateStock(documentCancelled.req, { ...documentCancelled.res, updateStockOn: types.actions.CANCELLED })
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.cronUpdateCreditDefaultStatus = async () => {
  try {
    const creditStatus = types.creditsPolicy.creditStatusEnum.DEFAULT
    const documents = await db.query(storage.findDocumentsWithDefaultCredits())

    if (documents.length > 0) {
      const creditStatusValues = documents.map(
        d => `(${d.id}, ${d.stakeholder_id}, '${creditStatus}', ${d.created_by}, ${d.updated_by || d.created_by})`
      )

      await db.query(storage.bulkUpdateCreditStatus(creditStatusValues))
    }

    return await handleResponse({
      req: {},
      res: { statusCode: 200, data: { documents: documents.map(d => d.id) }, message: 'Documento actualizado exitosamente' },
    })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
