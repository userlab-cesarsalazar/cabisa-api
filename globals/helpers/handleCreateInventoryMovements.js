const types = require('../types')

//  res.onCreateMovementType: types.inventoryMovementsTypes.OUT | types.inventoryMovementsTypes.IN

// req.body: {
//   operation_id,
//   products: [
//     {
//       product_id,
//       product_type,
//       stock,
//       product_price,
//       product_quantity,
//     },
//   ],
// }

const handleCreateInventoryMovements = async (req, res) => {
  if (!res.onCreateMovementType) throw new Error('The field onCreateMovementType is required')

  const { products, operation_id } = req.body

  if (!operation_id) return { req, res }

  const movementType = res.onCreateMovementType

  const inventoryMovements = products.flatMap(p => {
    if (p.product_type === types.productsTypes.SERVICE) return []

    const unit_cost = movementType === types.inventoryMovementsTypes.IN ? p.product_price : null

    return { operation_id, product_id: p.product_id, quantity: p.product_quantity, unit_cost, movement_type: movementType }
  })

  if (!inventoryMovements || !inventoryMovements[0]) return { req, res }

  const inventoryMovmentsQueryValues = inventoryMovements.reduce((result, im) => {
    const insertValues = `(${im.operation_id}, ${im.product_id}, ${im.quantity}, ${im.unit_cost}, '${im.movement_type}')`
    const operationsIds = (result && result.whereConditions && result.whereConditions.operationsIds) || []
    const whereConditions = {
      operationsIds: [...operationsIds, im.operation_id],
    }

    return {
      ...result,
      insertValues: [...(result.insertValues || []), insertValues],
      where: { ...(result.whereConditions || []), ...whereConditions },
    }
  }, {})

  const { insertValues, where } = inventoryMovmentsQueryValues

  await res.connection.query(createInventoryMovements(insertValues))
  const [inventory_movements] = await res.connection.query(findCreatedInventoryMovements(where.operationsIds), [movementType])

  return {
    req: { ...req, body: { ...req.body, inventory_movements } },
    res: { ...res, statusCode: 201, data: { inventory_movements }, message: 'Movimientos de inventario creados exitosamente' },
  }
}

const createInventoryMovements = inventoryMovementsValues => `
  INSERT INTO inventory_movements
  (operation_id, product_id, quantity, unit_cost, movement_type)
  VALUES ${inventoryMovementsValues.join(', ')}
`

const findCreatedInventoryMovements = operationsIds => `
  SELECT id AS inventory_movement_id, product_id, quantity, movement_type
  FROM inventory_movements
  WHERE operation_id IN (${operationsIds.join(', ')}) AND movement_type = ?
`

module.exports = handleCreateInventoryMovements
