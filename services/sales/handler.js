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
  getFormattedDates,
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
  handleUpdateDocument,
  handleDeleteInventoryMovements,
} = helpers
const { parentChildProductsValidator } = validators
const db = mysqlConfig(mysql)

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
    dispatched_by: { type: 'string' },
    // operation_type: {
    //   type: { enum: types.operationsTypes },
    //   required: true,
    // },
    project_id: { type: ['string', 'number'], required: true },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    subtotal_amount: { type: 'number', min: 1, required: true },
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
          parent_product_id: { type: ['string', 'number'] },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    const operation_type = types.operationsTypes.RENT
    const { stakeholder_id, subtotal_amount = 0, products } = req.body
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
    const requiredFields = ['stakeholder_id', 'project_id', 'products', 'subtotal_amount']
    const requiredProductFields = ['product_id', 'service_type', 'product_quantity', 'product_price']
    // if (!stakeholder_id) requiredFields.push('stakeholder_type', 'stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    if (operation_type === types.operationsTypes.RENT) requiredFields.push('start_date', 'end_date')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))
    const [stakeholderIdExists] = stakeholder_id ? await db.query(commonStorage.findStakeholder({ id: stakeholder_id })) : []
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
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (stakeholder_id && !stakeholderIdExists) errors.push('El cliente no se encuentra registrado')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`Los productos con id ${id} no deben estar duplicados`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`El producto con id ${id} no se encuentra registrado`))
    if (subtotal_amount <= 0) errors.push(`El monto subtotal de la factura debe ser mayor a cero`)
    if (!stakeholderIdExists || !stakeholderIdExists.credit_limit)
      errors.push(`Debe asignar un limite de credito al cliente antes de otorgarle un credito`)
    if (isInvalidCreditAmount) errors.push(`Se ha superado el limite de credito del cliente`)
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
    dispatched_by: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    subtotal_amount: { type: 'number', min: 1, required: true },
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
          parent_product_id: { type: ['string', 'number'] },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    const { document_id, products, start_date, end_date, subtotal_amount = 0 } = req.body
    // can(req.currentAction, operation_type)

    const rawDocument =
      document_id &&
      (await db.query(commonStorage.findDocument([types.documentsTypes.SELL_PRE_INVOICE, types.documentsTypes.RENT_PRE_INVOICE]), [document_id]))
    const [documentWithDuplicates] = rawDocument
      ? groupJoinResult({ data: rawDocument, nestedFieldsKeys: ['old_inventory_movements', 'old_products'], uniqueKey: ['document_id'] })
      : []
    const oldProductsWithoutDuplicates =
      documentWithDuplicates &&
      documentWithDuplicates.old_products &&
      documentWithDuplicates.old_products.length > 0 &&
      documentWithDuplicates.old_products.reduce((r, im) => {
        const sameProduct = r.find(rv => Number(rv.product_id) === Number(im.product_id))

        if (sameProduct) return r
        else return [...r, im]
      }, [])

    const oldInventoryMovementsWithoutDuplicates =
      documentWithDuplicates &&
      documentWithDuplicates.old_inventory_movements &&
      documentWithDuplicates.old_inventory_movements.length > 0 &&
      documentWithDuplicates.old_inventory_movements.reduce((r, im) => {
        const sameMovement = r.find(rv => Number(rv.inventory_movement_id) === Number(im.inventory_movement_id))

        if (sameMovement) return r
        else {
          const product = oldProductsWithoutDuplicates.find(op => Number(op.product_id) === Number(im.product_id)) || {}
          const inventoryMovement = { ...im, ...product, stock: product.stock || 0 }
          return [...r, inventoryMovement]
        }
      }, [])

    const document = {
      ...documentWithDuplicates,
      old_inventory_movements: oldInventoryMovementsWithoutDuplicates,
      old_products: oldProductsWithoutDuplicates,
    }

    const errors = []
    const productsMap = products.reduce((r, p) => {
      if (p.parent_product_id) return r

      return { ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }
    }, {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(commonStorage.findProducts(productsIds))
    const productsExists = products.flatMap(p =>
      !productsFromDB || !productsFromDB.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []
    )
    const requiredFields = ['document_id', 'project_id', 'products', 'subtotal_amount']
    const requiredProductFields = ['product_id', 'service_type', 'product_quantity', 'product_price']
    if (document && document.operation_type === types.operationsTypes.RENT) requiredFields.push('start_date', 'end_date')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))
    const [stakeholderIdExists] =
      document && document.stakeholder_id ? await db.query(commonStorage.findStakeholder({ id: document.stakeholder_id })) : []
    const stakeholderCredits = document && document.stakeholder_id ? await db.query(commonStorage.findStakeholderCredit(document.stakeholder_id)) : []
    const currentCredit =
      stakeholderCredits && stakeholderCredits[0]
        ? stakeholderCredits.reduce((r, v) => (Number(document_id) === Number(v.id) ? r : r + v.credit_amount), 0)
        : 0
    const isInvalidCreditAmount =
      stakeholderIdExists && stakeholderIdExists.credit_limit && currentCredit + subtotal_amount > stakeholderIdExists.credit_limit

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`Los productos con id ${id} no deben estar duplicados`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`El producto con id ${id} no se encuentra registrado`))
    if (!document || !document.document_id) errors.push(`El documento con id ${document_id} no se encuentra registrado`)
    if (document && document.status !== types.documentsStatus.PENDING)
      errors.push(`La edicion solo es permitida en documentos con status ${types.documentsStatus.PENDING}`)
    if (subtotal_amount <= 0) errors.push(`El monto subtotal de la factura debe ser mayor a cero`)
    if (!stakeholderIdExists || !stakeholderIdExists.credit_limit)
      errors.push(`Debe asignar un limite de credito al cliente antes de otorgarle un credito`)
    if (isInvalidCreditAmount) errors.push(`Se ha superado el limite de credito del cliente`)
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
    const inputType = {
      document_id: { type: ['number', 'string'], required: true },
      payment_method: { type: { enum: types.documentsPaymentMethods }, required: true },
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

    const req = await handleRequest({ event, inputType })
    const {
      document_id,
      payment_method,
      credit_days,
      subtotal_amount = 0,
      total_discount_amount,
      total_tax_amount,
      total_amount,
      products,
    } = req.body

    // can(req.currentAction, types.operationsTypes.PURCHASE)

    const errors = []
    const productsMap = products.reduce((r, p) => {
      if (p.parent_product_id) return r

      return { ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }
    }, {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(commonStorage.findProducts(productsIds))
    const requiredFields = ['document_id', 'payment_method', 'subtotal_amount', 'total_amount']
    if (Number(total_discount_amount) !== 0) requiredFields.push('total_discount_amount')
    if (Number(total_tax_amount) !== 0) requiredFields.push('total_tax_amount')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductFields = ['product_id', 'service_type', 'product_quantity', 'product_price']
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))
    const documentDetails = document_id
      ? await db.query(commonStorage.findDocument([types.documentsTypes.SELL_PRE_INVOICE, types.documentsTypes.RENT_PRE_INVOICE]), [document_id])
      : []
    const invalidStatusProducts = documentDetails.flatMap(pm =>
      pm.products__product_status !== types.productsStatus.ACTIVE ? pm.products__product_id : []
    )

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`Los productos con id ${id} no deben estar duplicados`))
    if (!documentDetails || !documentDetails[0]) errors.push('El documento recibido no se encuentra registrado')
    if (invalidStatusProducts && invalidStatusProducts[0])
      invalidStatusProducts.forEach(id => errors.push(`El producto con id ${id} debe tener status ${types.productsStatus.ACTIVE}`))
    if (documentDetails[0] && documentDetails[0].document_status === types.documentsStatus.CANCELLED)
      errors.push('El documento ya se encuentra cancelado')
    if (documentDetails[0] && documentDetails[0].related_internal_document_id)
      errors.push(`El documento ya esta relacionado a una factura con id ${documentDetails[0].related_internal_document_id}`)
    if (subtotal_amount <= 0) errors.push(`El monto subtotal de la factura debe ser mayor a cero`)
    if (total_amount <= 0) errors.push(`El monto total de la factura debe ser mayor a cero`)
    if (Object.keys(types.documentsPaymentMethods).every(k => types.documentsPaymentMethods[k] !== payment_method))
      errors.push(
        `The field payment_method must contain one of these values: ${Object.keys(types.documentsPaymentMethods)
          .map(k => types.documentsPaymentMethods[k])
          .join(', ')}`
      )

    const [groupedDocumentDetails] = groupJoinResult({
      data: documentDetails,
      nestedFieldsKeys: ['products'],
      uniqueKey: ['document_id'],
    })

    const invalidProducts =
      groupedDocumentDetails &&
      products &&
      products[0] &&
      products.flatMap(p => {
        const isValid = groupedDocumentDetails.products.some(
          sale => Number(sale.product_id) === Number(p.product_id) && Number(sale.product_quantity) === Number(p.product_quantity)
        )

        if (isValid) return []
        else return p
      })

    if (invalidProducts && invalidProducts[0]) errors.push(`La cantidad de productos no coincide con los registrados en la nota de servicio`)
    if (credit_days) {
      const [stakeholderIdExists] =
        groupedDocumentDetails && groupedDocumentDetails.stakeholder_id
          ? await db.query(commonStorage.findStakeholder({ id: groupedDocumentDetails.stakeholder_id }))
          : []
      const stakeholderCredits =
        groupedDocumentDetails && groupedDocumentDetails.stakeholder_id
          ? await db.query(commonStorage.findStakeholderCredit(groupedDocumentDetails.stakeholder_id))
          : []
      const currentCredit =
        stakeholderCredits && stakeholderCredits[0]
          ? stakeholderCredits.reduce((r, v) => (Number(document_id) === Number(v.id) ? r : r + v.credit_amount), 0)
          : 0
      const isInvalidCreditAmount =
        stakeholderIdExists && stakeholderIdExists.credit_limit && currentCredit + subtotal_amount > stakeholderIdExists.credit_limit

      if (Object.keys(types.creditsPolicy.creditDaysEnum).every(k => types.creditsPolicy.creditDaysEnum[k] !== credit_days))
        errors.push(
          `The field credit_days must contain one of these values: ${Object.keys(types.creditsPolicy.creditDaysEnum)
            .map(k => types.creditsPolicy.creditDaysEnum[k])
            .join(', ')}`
        )
      if (!stakeholderIdExists || !stakeholderIdExists.credit_limit)
        errors.push(`Debe asignar un limite de credito al cliente antes de otorgarle un credito`)
      if (isInvalidCreditAmount) errors.push(`Se ha superado el limite de credito del cliente`)
    }
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

    const productsWithTaxes = calculateProductTaxes(products, groupedDocumentDetails.products)
    const operation_type = groupedDocumentDetails.operation_type
    const document_type = config[operation_type].finishDocument

    const { res } = await db.transaction(async connection => {
      const documentCreated = await handleCreateDocument(
        {
          ...req,
          body: { ...groupedDocumentDetails, ...req.body, products: productsWithTaxes, document_type },
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
      cancel_reason: { type: 'string' },
    }

    const req = await handleRequest({ event, inputType })
    const { document_id } = req.body

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentMovements = await db.query(
      commonStorage.findDocumentMovements([types.documentsTypes.SELL_PRE_INVOICE, types.documentsTypes.RENT_PRE_INVOICE]),
      [document_id]
    )

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!documentMovements || !documentMovements[0]) errors.push('No existe una venta registrada con la informacion recibida')
    if (documentMovements[0] && documentMovements[0].document_status === types.documentsStatus.CANCELLED)
      errors.push('El documento ya se encuentra cancelado')
    if (documentMovements[0] && documentMovements[0].related_internal_document_id) errors.push(`No puede cancelar una venta con factura asociada`)

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
