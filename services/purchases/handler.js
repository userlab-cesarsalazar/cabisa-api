const mysql = require('mysql2/promise')
const {
  commonStorage,
  types,
  calculateProductTaxes,
  getFormattedDates,
  groupJoinResult,
  mysqlConfig,
  helpers,
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
  handleUpdateDocument,
  handleDeleteInventoryMovements,
} = helpers
const db = mysqlConfig(mysql)

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
    stakeholder_id: { type: ['string', 'number'], required: true },
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
          product_price: { type: 'number', min: 0 },
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
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(commonStorage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsFromDB.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['stakeholder_id', 'products', 'related_external_document_id']
    // if (!stakeholder_id) requiredFields.push('stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    const requiredProductFields = ['product_id', 'product_quantity']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))
    const [stakeholderNitUnique] = stakeholder_nit ? await db.query(commonStorage.findStakeholder({ nit: stakeholder_nit, stakeholder_type })) : []
    const [stakeholderIdExists] = stakeholder_id ? await db.query(commonStorage.findStakeholder({ id: stakeholder_id })) : []

    if (Object.keys(types.operationsTypes).every(k => types.operationsTypes[k] !== operation_type))
      errors.push(
        `The field operation_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (stakeholderNitUnique) errors.push('El nit ya se encuentra registrado')
    if (stakeholder_id && !stakeholderIdExists) errors.push('El proveedor no se encuentra registrado')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`El producto con id ${id} se encuentra duplicado`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`El producto con id ${id} no se encuentra registrado`))
    if (productsFromDB && productsFromDB.some(pdb => pdb.product_type === types.productsTypes.SERVICE))
      errors.push('Una compra no puede incluir servicios')

    if (errors.length > 0) throw new ValidatorException(errors)

    const productsWithTaxes = calculateProductTaxes(products, productsFromDB)
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

      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentApproved.req, {
        ...documentApproved.res,
        createInventoryMovementType: types.inventoryMovementsTypes.IN,
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

module.exports.update = async event => {
  const inputType = {
    document_id: { type: ['string', 'number'], required: true },
    stakeholder_id: { type: ['string', 'number'], required: true },
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
          product_price: { type: 'number', min: 0 },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    const { document_id, stakeholder_id, stakeholder_nit, products, start_date } = req.body
    const stakeholder_type = types.stakeholdersTypes.PROVIDER
    const operation_type = types.operationsTypes.PURCHASE

    // can(req.currentAction, operation_type)

    const rawDocument = document_id && (await db.query(commonStorage.findDocument([types.documentsTypes.PURCHASE_ORDER]), [document_id]))
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
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(commonStorage.findProducts(productsIds))
    const productsExists = products.flatMap(p => (!productsFromDB.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['document_id', 'stakeholder_id', 'products', 'related_external_document_id']
    // if (!stakeholder_id) requiredFields.push('stakeholder_name', 'stakeholder_address', 'stakeholder_nit', 'stakeholder_phone')
    const requiredProductFields = ['product_id', 'product_quantity']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))
    const [stakeholderNitUnique] = stakeholder_nit ? await db.query(commonStorage.findStakeholder({ nit: stakeholder_nit, stakeholder_type })) : []
    const [stakeholderIdExists] = stakeholder_id ? await db.query(commonStorage.findStakeholder({ id: stakeholder_id })) : []

    if (Object.keys(types.operationsTypes).every(k => types.operationsTypes[k] !== operation_type))
      errors.push(
        `The field operation_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (stakeholderNitUnique) errors.push('El nit ya se encuentra registrado')
    if (stakeholder_id && !stakeholderIdExists) errors.push('El proveedor no se encuentra registrado')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`El producto con id ${id} se encuentra duplicado`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`El producto con id ${id} no se encuentra registrado`))
    if (productsFromDB && productsFromDB.some(pdb => pdb.product_type === types.productsTypes.SERVICE))
      errors.push('Una compra no puede incluir servicios')
    if (!document || !document.document_id) errors.push(`El documento con id ${document_id} no se encuentra registrado`)
    if (document && document.status === types.documentsStatus.CANCELLED)
      errors.push(`Los documentos con status ${types.documentsStatus.CANCELLED} no pueden ser modificados`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const productsWithTaxes = calculateProductTaxes(products, productsFromDB)
    const formattedDates = getFormattedDates({ start_date })

    const { res } = await db.transaction(async connection => {
      const stakeholderCreated = await handleCreateStakeholder(
        { ...req, body: { ...document, ...req.body, ...formattedDates, products: productsWithTaxes } },
        { connection }
      )

      const documentUpdated = await handleUpdateDocument(stakeholderCreated.req, stakeholderCreated.res)

      const inventoryMovementsDeleted = await handleDeleteInventoryMovements(documentUpdated.req, documentUpdated.res)

      const inventoryMovementsCreated = await handleCreateInventoryMovements(inventoryMovementsDeleted.req, {
        ...inventoryMovementsDeleted.res,
        createInventoryMovementType: types.inventoryMovementsTypes.IN,
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

module.exports.cancel = async event => {
  try {
    const inputType = {
      document_id: { type: ['number', 'string'], required: true },
      cancel_reason: { type: 'string' },
    }

    const req = await handleRequest({ event, inputType })
    const { document_id } = req.body

    // can(req.currentAction, types.operationsTypes.PURCHASE)

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentMovements = await db.query(commonStorage.findDocumentMovements([types.documentsTypes.PURCHASE_ORDER]), [document_id])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!documentMovements || !documentMovements[0]) errors.push('No existen compras registradas con la informacion recibida')
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
