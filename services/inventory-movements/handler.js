const { types, db, helpers, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const { handleRequest, handleResponse, handleRead, handleApproveInventoryMovements } = helpers
const storage = require('./storage')

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event, currentAction: types.actions.READ })

    const res = await handleRead(req, { dbQuery: db.query, storage, nestedFieldsKeys: ['products'] })

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

    const req = await handleRequest({ event, inputType, currentAction: types.actions.APPROVED })
    const { inventory_movements } = req.body

    const errors = []
    const movementsMap = inventory_movements.reduce(
      (r, im) => ({ ...r, [im.inventory_movement_id]: [...(r[im.inventory_movement_id] ?? []), im.inventory_movement_id] }),
      {}
    )
    const duplicateMovements = Object.keys(movementsMap)?.flatMap(k => (movementsMap[k].length > 1 ? k : []))
    const movementsIds = inventory_movements?.map(im => im.inventory_movement_id)
    const movements = await db.query(storage.checkInventoryMovementsOnApprove(movementsIds))
    const invalidQuantities = movements.flatMap(m => {
      const inventoryMovement = inventory_movements.find(im => Number(im.inventory_movement_id) === Number(m.id))
      const remainningQty = m.total_qty - m.approved_qty - inventoryMovement?.quantity

      if (inventoryMovement?.quantity <= 0 || remainningQty < 0) return { ...m, remainning: m.total_qty - m.approved_qty }

      return []
    })
    const movementsExists = inventory_movements?.flatMap(im =>
      !movements?.some(m => Number(m.id) === Number(im.inventory_movement_id)) ? im.inventory_movement_id : []
    )
    const requiredMovementFields = ['inventory_movement_id', 'quantity']
    const requiredMovementErrorFields = requiredMovementFields.some(k => inventory_movements?.some(im => !im[k]))

    if (duplicateMovements?.length > 0) duplicateMovements.forEach(id => errors.push(`The movement with id ${id} is duplicated`))
    if (movementsExists?.length > 0) movementsExists.forEach(id => errors.push(`The movement with id ${id} is not registered`))
    if (requiredMovementErrorFields) errors.push(`The fields ${requiredMovementFields.join(', ')} in inventory_movements are required`)
    if (invalidQuantities?.length > 0)
      invalidQuantities.forEach(iq => errors.push(`The quantity for the movement with id ${iq.id} must be less than or equal to ${iq.remainning}`))

    if (errors.length > 0) throw new ValidatorException(errors)

    const { res } = await db.transaction(async connection => await handleApproveInventoryMovements(req, { connection }))

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
