const mysql = require('mysql2/promise')
const { types, mysqlConfig, helpers, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const storage = require('./storage')
const { handleRequest, handleResponse, handleRead, handleApproveInventoryMovements, handleUpdateStock } = helpers
const db = mysqlConfig(mysql)

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findAllBy })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.approve = async event => {
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
            storage_location: { type: 'string' },
            comments: { type: 'string', length: 255 },
          },
        },
      },
    }

    const req = await handleRequest({ event, inputType })
    const { inventory_movements } = req.body

    const errors = []
    const movementsMap = inventory_movements.reduce(
      (r, im) => ({ ...r, [im.inventory_movement_id]: [...(r[im.inventory_movement_id] || []), im.inventory_movement_id] }),
      {}
    )
    const movementsMapKeys = Object.keys(movementsMap) || []
    const duplicateMovements = movementsMapKeys.length > 0 && movementsMapKeys.flatMap(k => (movementsMap[k].length > 1 ? k : []))
    const movementsIds = inventory_movements && inventory_movements.map(im => im.inventory_movement_id)
    const movements = await db.query(storage.checkInventoryMovementsOnApprove(movementsIds))
    const invalidQuantities = movements.flatMap(m => {
      const inventoryMovement = inventory_movements.find(im => Number(im.inventory_movement_id) === Number(m.id))
      const remainningQty = m.total_qty - m.approved_qty - ((inventoryMovement && inventoryMovement.quantity) || 0)

      if ((inventoryMovement && inventoryMovement.quantity <= 0) || remainningQty < 0) return { ...m, remainning: m.total_qty - m.approved_qty }

      return []
    })
    const movementsExists = inventory_movements
      ? inventory_movements.flatMap(im =>
          movements && !movements.some(m => Number(m.id) === Number(im.inventory_movement_id)) ? im.inventory_movement_id : []
        )
      : []
    const requiredMovementFields = ['inventory_movement_id', 'quantity']
    const requiredMovementErrorFields = requiredMovementFields.some(k => inventory_movements && inventory_movements.some(im => !im[k]))

    if (duplicateMovements && duplicateMovements.length > 0)
      duplicateMovements.forEach(id => errors.push(`El movimiento con id ${id} no debe estar duplicado`))
    if (movementsExists && movementsExists.length > 0)
      movementsExists.forEach(id => errors.push(`El movimiento con id ${id} no se encuentra registrado`))
    if (requiredMovementErrorFields) errors.push(`Los campos: ${requiredMovementFields.join(', ')} en los movimientos de inventario son requeridos`)
    if (invalidQuantities && invalidQuantities.length > 0)
      invalidQuantities.forEach(iq =>
        errors.push(`La cantidad para los movimientos con id ${iq.id} debe ser mayor a 0 y menor o igual a ${iq.remainning}`)
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    const handlersConfig = { updateStockOn: types.actions.APPROVED }

    const { res } = await db.transaction(async connection => {
      const inventoryMovementsApproved = await handleApproveInventoryMovements(req, { connection, handlersConfig })
      return await handleUpdateStock(inventoryMovementsApproved.req, inventoryMovementsApproved.res)
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readAdjustments = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findAllAdjustmentsBy, nestedFieldsKeys: ['products'] })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.createAdjustment = async event => {
  const inputType = {
    adjustment_reason: { type: 'string' },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          preview_stock: { type: 'number', min: 0, required: true },
          next_stock: { type: 'number', min: 0, required: true },
        },
      },
    },
  }

  try {
    const req = await handleRequest({ event, inputType })
    const { adjustment_reason = null, products, created_by = 1 } = req.body

    const errors = []
    const productsMap = products.reduce((r, p) => {
      if (p.parent_product_id) return r

      return { ...r, [p.product_id]: [...(r[p.product_id] || []), p.product_id] }
    }, {})
    const productsIds = products.map(p => p.product_id)
    const productsFromDB = await db.query(storage.findAdjustmentProducts(productsIds))
    const invalidProducts = products.flatMap(p =>
      productsFromDB.some(ps => Number(ps.id) === Number(p.product_id) && ps.product_type !== types.productsTypes.PRODUCT) ? p.product_id : []
    )
    const invalidPrevStocks = products.flatMap(p =>
      productsFromDB.some(ps => Number(ps.id) === Number(p.product_id) && Number(ps.stock) !== Number(p.preview_stock)) ? p.product_id : []
    )
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const requiredFields = ['products']
    const requiredProductFields = ['product_id', 'preview_stock', 'next_stock']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k] || p[k] < 0))

    if (invalidProducts.length > 0)
      errors.push(`Los productos con id ${invalidPrevStocks.join(', ')} tienen productType distinto a ${types.productsTypes.PRODUCT}`)
    if (invalidPrevStocks.length > 0)
      errors.push(`El stock previo de los productos con id ${invalidPrevStocks.join(', ')} no coincide con el registrado en base de datos`)
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`El producto con id ${id} se encuentra duplicado`))
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredProductErrorFields)
      errors.push(`Los campos ${requiredProductFields.join(', ')} en productos deben contener un numero diferente de cero`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const updateStockProducts = products.map(p => {
      const sameProduct = productsFromDB.find(ps => Number(ps.id) === Number(p.product_id)) || {}

      return { ...sameProduct, ...p }
    })

    const { res } = await db.transaction(async connection => {
      await connection.query(storage.createInventoryAdjustment(), [adjustment_reason, created_by])
      const newInventoryAdjustmentId = await connection.geLastInsertId()

      const inventoryAdjustmentsProductsValues = products.map(
        p => `(${newInventoryAdjustmentId}, ${p.product_id}, ${p.preview_stock}, ${p.next_stock})`
      )
      await connection.query(storage.createInventoryAdjustmentsProducts(inventoryAdjustmentsProductsValues))

      const updateProductsStockValues = updateStockProducts.map(
        p => `(
          ${p.id},
          '${p.product_type}',
          ${p.product_category ? `'${p.product_category}'` : null},
          '${p.status}',
          ${p.description ? `'${p.description}'` : null},
          ${p.code ? `'${p.code}'` : null},
          ${p.unit_price},
          ${p.next_stock},
          ${p.created_by}
        )`
      )
      await connection.query(storage.updateProductsStock(updateProductsStockValues))

      return {
        req: { ...req, body: { ...req.body, inventory_adjustment_id: newInventoryAdjustmentId } },
        res: {
          statusCode: 201,
          data: { inventory_adjustment_id: newInventoryAdjustmentId },
          message: 'Ajuste de Inventario creado exitosamente',
        },
      }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
