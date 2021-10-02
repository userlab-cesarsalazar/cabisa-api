const mysql = require('mysql2/promise')
const {
  commonStorage,
  types,
  mysqlConfig,
  helpers,
  ValidatorException,
  getFormattedDates,
  getDocument,
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
  handleCancelDocument,
  handleCreateOperation,
  handleUpdateStock,
  handleUpdateDocument,
  handleCancelInventoryMovements,
} = helpers
const db = mysqlConfig(mysql)

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, {
      dbQuery: db.query,
      storage: storage.findAllBy,
      nestedFieldsKeys: ['products'],
      uniqueKey: ['document_id'],
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readRepairsStatus = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findRepairsStatus })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  const inputType = {
    product_id: { type: ['string', 'number'], required: true },
    description: { type: 'string' },
    start_date: { type: 'string', required: true },
    end_date: { type: 'string' },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          product_quantity: { type: 'number', min: 1, required: true },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    req.hasPermissions([types.permissions.REPAIRS])

    const operation_type = types.operationsTypes.REPAIR
    const { product_id, start_date, end_date, products } = req.body
    const errors = []
    const [documentProduct] = await db.query(
      commonStorage.findProducts([product_id], `AND p.product_category = '${types.productsCategories.EQUIPMENT}'`)
    )
    const productsMap = products.reduce((r, p) => {
      if (p.parent_product_id) return r

      return { ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }
    }, {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(commonStorage.findProducts(productsIds, `AND p.product_category = '${types.productsCategories.PART}'`))
    const productsExists = products.flatMap(p => (!productsFromDB.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['product_id', 'start_date']
    const requiredProductFields = ['product_id', 'product_quantity']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))

    if (!documentProduct) errors.push(`El producto con id ${product_id} no se encuentra registrado como un equipo`)
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`Los productos con id ${id} no deben estar duplicados`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`El producto con id ${id} no se encuentra registrado como respuesto`))

    if (errors.length > 0) throw new ValidatorException(errors)

    const documentDetailProducts = products.map(p => {
      const sameProduct = productsFromDB.find(ps => Number(ps.product_id) === Number(p.product_id)) || {}

      return { ...sameProduct, ...p }
    })

    const formattedDates = getFormattedDates({ start_date, end_date })

    const { res } = await db.transaction(async connection => {
      const operationCreated = await handleCreateOperation(
        {
          ...req,
          body: {
            ...req.body,
            ...formattedDates,
            operation_type,
            products: [...documentDetailProducts, { ...documentProduct, product_quantity: 1 }],
            document_type: types.documentsTypes.REPAIR_ORDER,
          },
        },
        { connection }
      )

      const documentCreated = await handleCreateDocument(operationCreated.req, { ...operationCreated.res, excludeProductOnCreateDetail: product_id })

      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentCreated.req, {
        ...documentCreated.res,
        onCreateMovementType: types.inventoryMovementsTypes.OUT,
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
    description: { type: 'string' },
    end_date: { type: 'string' },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          product_quantity: { type: 'number', min: 1, required: true },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    req.hasPermissions([types.permissions.REPAIRS])

    const { document_id, end_date, products } = req.body
    const document = await getDocument({
      dbQuery: db.query,
      findDocumentStorage: commonStorage.findDocument,
      inventoryMovementsStatusCancelledType: types.inventoryMovementsStatus.CANCELLED,
      document_id,
      documentsTypes: [types.documentsTypes.REPAIR_ORDER],
    })

    const errors = []
    const productsMap = products.reduce((r, p) => {
      if (p.parent_product_id) return r

      return { ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }
    }, {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(commonStorage.findProducts(productsIds, `AND p.product_category = '${types.productsCategories.PART}'`))
    const productsExists = products.flatMap(p =>
      !productsFromDB || !productsFromDB.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []
    )
    const requiredFields = ['document_id']
    const requiredProductFields = ['product_id', 'product_quantity']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] <= 0))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields) errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero mayor a cero`)
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`Los productos con id ${id} no deben estar duplicados`))
    if (productsExists.length > 0) productsExists.forEach(id => errors.push(`El producto con id ${id} no se encuentra registrado como repuesto`))
    if (!document || !document.document_id) errors.push(`El documento con id ${document_id} no se encuentra registrado`)
    if (document && document.status !== types.documentsStatus.PENDING)
      errors.push(`La edicion solo es permitida en documentos con status ${types.documentsStatus.PENDING}`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const documentDetailProducts = products.map(p => {
      const sameProduct = productsFromDB.find(ps => Number(ps.product_id) === Number(p.product_id)) || {}

      return { ...sameProduct, ...p }
    })

    const formattedDates = getFormattedDates({ end_date })

    const { res } = await db.transaction(async connection => {
      const documentUpdated = await handleUpdateDocument(
        {
          ...req,
          body: { ...document, ...req.body, ...formattedDates, products: documentDetailProducts },
        },
        { connection, excludeProductOnCreateDetail: document.product_id }
      )

      const inventoryMovementsCancelled = await handleCancelInventoryMovements(documentUpdated.req, documentUpdated.res)

      const inventoryMovementsCreated = await handleCreateInventoryMovements(inventoryMovementsCancelled.req, {
        ...inventoryMovementsCancelled.res,
        onCreateMovementType: types.inventoryMovementsTypes.OUT,
      })
      const documentDetailInventoryMovements = inventoryMovementsCreated.req.body.inventory_movements.flatMap(im =>
        Number(im.product_id) !== Number(document.product_id) ? im : []
      )

      const inventoryMovementsApproved = await handleApproveInventoryMovements(
        { ...inventoryMovementsCreated.req, body: { ...inventoryMovementsCreated.req.body, inventory_movements: documentDetailInventoryMovements } },
        inventoryMovementsCreated.res
      )

      return await handleUpdateStock(inventoryMovementsApproved.req, { ...inventoryMovementsApproved.res, updateStockOn: types.actions.APPROVED })
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.approve = async event => {
  try {
    const inputType = {
      document_id: { type: ['number', 'string'], required: true },
    }
    const req = await handleRequest({ event, inputType })
    req.hasPermissions([types.permissions.REPAIRS])

    const { document_id } = req.body
    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentProduct = document_id ? await db.query(commonStorage.findDocumentProduct(), [document_id]) : []
    const document = await getDocument({
      dbQuery: db.query,
      findDocumentStorage: commonStorage.findDocument,
      inventoryMovementsStatusCancelledType: types.inventoryMovementsStatus.CANCELLED,
      document_id,
      documentsTypes: [types.documentsTypes.REPAIR_ORDER],
      documentProduct,
      includeDocumentProductMovement: true,
      includeOldInventoryMovements: false,
      includeInventoryMovements: true,
    })

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!document || !document.document_id) errors.push('No existe una orden de reparacion registrada con la informacion recibida')
    if (document && document.document_status !== types.documentsStatus.PENDING)
      errors.push(`Solo pueden ser aprobados documentos con status ${types.documentsStatus.PENDING}`)
    if (document && !document.end_date) errors.push('La orden de reparacion debe tener una fecha de finalizacion')

    if (errors.length > 0) throw new ValidatorException(errors)

    const { res } = await db.transaction(async connection => {
      const documentApproved = await handleApproveDocument({ ...req, body: { ...document, ...req.body } }, { connection })

      const inventoryMovementsCreated = await handleCreateInventoryMovements(documentApproved.req, {
        ...documentApproved.res,
        onCreateMovementType: types.inventoryMovementsTypes.IN,
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
    req.hasPermissions([types.permissions.REPAIRS])

    const { document_id } = req.body
    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentProduct = document_id ? await db.query(commonStorage.findDocumentProduct(), [document_id]) : []
    const document = await getDocument({
      dbQuery: db.query,
      findDocumentStorage: commonStorage.findDocument,
      inventoryMovementsStatusCancelledType: types.inventoryMovementsStatus.CANCELLED,
      document_id,
      documentsTypes: [types.documentsTypes.REPAIR_ORDER],
      documentProduct,
      includeDocumentProductMovement: true,
      includeInventoryMovements: true,
    })

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!document || !document.document_id) errors.push('No existe una orden de reparacion registrada con la informacion recibida')
    if (document && document.document_status === types.documentsStatus.CANCELLED) errors.push('El documento ya se encuentra cancelado')

    if (errors.length > 0) throw new ValidatorException(errors)

    const { res } = await db.transaction(async connection => {
      const documentCancelled = await handleCancelDocument({ ...req, body: { ...document, ...req.body } }, { connection })

      const inventoryMovementsCancelled = await handleCancelInventoryMovements(documentCancelled.req, {
        ...documentCancelled.res,
        updateInventoryCost: true,
      })

      return await handleUpdateStock(
        { ...inventoryMovementsCancelled.req, body: { ...inventoryMovementsCancelled.req.body, old_inventory_movements: [] } },
        { ...inventoryMovementsCancelled.res, updateStockOn: types.actions.CANCELLED }
      )
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
