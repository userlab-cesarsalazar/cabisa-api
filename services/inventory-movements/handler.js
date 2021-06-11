const mysql = require('mysql2/promise')
const { types, mysqlConfig, helpers, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const storage = require('./storage')
const { handleRequest, handleResponse, handleRead, handleApproveInventoryMovements, handleUpdateStock } = helpers
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
      invalidQuantities.forEach(iq => errors.push(`La cantidad para los movimientos con id ${iq.id} debe ser menor o igual a ${iq.remainning}`))

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
