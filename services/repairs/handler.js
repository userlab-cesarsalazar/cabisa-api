const mysql = require('mysql2/promise')
const {
  commonStorage,
  types,
  calculateProductTaxes,
  groupJoinResult,
  mysqlConfig,
  helpers,
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

    const result = await handleRead(req, {
      dbQuery: db.query,
      storage: storage.findAllBy,
      nestedFieldsKeys: ['products'],
      uniqueKey: ['document_id'],
    })

    const res = {
      ...result,
      data: result.data.map(d => {
        const documentProduct = d.products.find(p => Number(p.id) === Number(d.product_id))

        return {
          ...d,
          product_description: documentProduct.description,
          code: documentProduct.code,
          serial_number: documentProduct.serial_number,
          products: d.products.flatMap(p => (Number(p.id) !== Number(d.product_id) ? p : [])),
        }
      }),
    }

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
    const operation_type = types.operationsTypes.REPAIR
    const { product_id, start_date, end_date, products } = req.body

    const errors = []
    const [documentProduct] = await db.query(
      commonStorage.findProducts([product_id, `AND p.product_category = '${types.productsCategories.EQUIPMENT}'`])
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

      await handleCreateDocument(operationCreated.req, operationCreated.res)

      const inventoryMovementsCreated = await handleCreateInventoryMovements(operationCreated.req, {
        ...operationCreated.res,
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
    const { document_id, end_date, products } = req.body

    const rawDocument = document_id && (await db.query(commonStorage.findDocument([types.documentsTypes.REPAIR_ORDER]), [document_id]))
    const [documentWithDuplicates] = rawDocument
      ? groupJoinResult({ data: rawDocument, nestedFieldsKeys: ['old_inventory_movements', 'old_products'], uniqueKey: ['document_id'] })
      : []
    const oldProductsWithoutDuplicates =
      documentWithDuplicates &&
      documentWithDuplicates.old_products &&
      documentWithDuplicates.old_products.length > 0 &&
      documentWithDuplicates.old_products.reduce((r, im) => {
        const sameProduct = r.find(rv => Number(rv.product_id) === Number(im.product_id))

        if (sameProduct || im.product_id === documentWithDuplicates.product_id) return r
        else return [...r, im]
      }, [])

    const oldInventoryMovementsWithoutDuplicates =
      documentWithDuplicates &&
      documentWithDuplicates.old_inventory_movements &&
      documentWithDuplicates.old_inventory_movements.length > 0 &&
      documentWithDuplicates.old_inventory_movements.reduce((r, im) => {
        const sameMovement = r.find(rv => Number(rv.inventory_movement_id) === Number(im.inventory_movement_id))

        if (sameMovement || im.product_id === documentWithDuplicates.product_id) return r
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
        { ...req, body: { ...document, ...req.body, ...formattedDates, products: documentDetailProducts } },
        { connection }
      )

      const inventoryMovementsDeleted = await handleDeleteInventoryMovements(documentUpdated.req, documentUpdated.res)

      const inventoryMovementsCreated = await handleCreateInventoryMovements(inventoryMovementsDeleted.req, {
        ...inventoryMovementsDeleted.res,
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
    const { document_id } = req.body

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentMovements = document_id
      ? await db.query(commonStorage.findDocumentMovements([types.documentsTypes.REPAIR_ORDER]), [document_id])
      : []

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!documentMovements || !documentMovements[0]) errors.push('No existe una orden de reparacion registrada con la informacion recibida')
    if (documentMovements[0] && documentMovements[0].document_status !== types.documentsStatus.PENDING)
      errors.push(`Solo pueden ser aprobados documentos con status ${types.documentsStatus.PENDING}`)
    if (documentMovements[0] && !documentMovements[0].end_date) errors.push('La orden de reparacion debe tener una fecha de finalizacion')

    if (errors.length > 0) throw new ValidatorException(errors)

    const [groupedDocumentMovements] = groupJoinResult({
      data: documentMovements,
      nestedFieldsKeys: ['inventory_movements'],
      uniqueKey: ['document_id'],
    })

    const document = {
      ...groupedDocumentMovements,
      products: groupedDocumentMovements.inventory_movements.flatMap(im =>
        Number(im.product_id) === Number(groupedDocumentMovements.repair_product_id) ? im : []
      ),
    }

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
    const { document_id } = req.body

    const errors = []
    const requiredFields = ['document_id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const documentMovements = await db.query(commonStorage.findDocumentMovements([types.documentsTypes.REPAIR_ORDER]), [document_id])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!documentMovements || !documentMovements[0]) errors.push('No existe una orden de reparacion registrada con la informacion recibida')
    if (documentMovements[0] && documentMovements[0].document_status === types.documentsStatus.CANCELLED)
      errors.push('El documento ya se encuentra cancelado')
    if (documentMovements[0] && !documentMovements[0].end_date) errors.push('La orden de reparacion debe tener una fecha de finalizacion')

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
