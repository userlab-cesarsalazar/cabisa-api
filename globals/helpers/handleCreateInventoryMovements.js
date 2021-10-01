const types = require('../types')
const { calculateInventoryCost } = require('../common')
const { updateProductsInventoryCosts } = require('../commonStorage')

//  res.onCreateMovementType: types.inventoryMovementsTypes.OUT | types.inventoryMovementsTypes.IN

// req.body: {
//   operation_id,
//   operation_type,
//   products: [
//     {
//       product_id,
//       description,
//       code,
//       product_type,
//       stock,
//       product_price,
//       product_quantity,
//       inventory_unit_value,
//       inventory_total_value,
//       created_by,
//     },
//   ],
// }

const handleCreateInventoryMovements = async (req, res) => {
  if (!res.onCreateMovementType) throw new Error('The field onCreateMovementType is required')

  const { products, operation_id, operation_type } = req.body

  if (!operation_id) return { req, res }

  const movementType = res.onCreateMovementType

  const inventoryMovements = products.flatMap(p => {
    if (p.product_type === types.productsTypes.SERVICE) return []

    const product = { ...p, movement_type: movementType }
    const isInventoryReceipt = movementType === types.inventoryMovementsTypes.IN
    const isPurchase = operation_type === types.operationsTypes.PURCHASE
    const productWithInventoryCost = calculateInventoryCost('weightedAverage', { product, isInventoryReceipt, isPurchase })

    return { ...productWithInventoryCost, operation_id }
  })

  if (!inventoryMovements || !inventoryMovements[0]) return { req, res }

  const { insertValues, productsInventoryValues, where } = inventoryMovements.reduce((result, im) => {
    const insertValues = `(
      ${im.operation_id},
      ${im.product_id},
      ${im.quantity},
      '${im.movement_type}',
      ${im.unit_cost},
      ${im.total_cost},
      ${im.inventory_quantity},
      ${im.inventory_unit_cost},
      ${im.inventory_total_cost}
    )`
    const productsInventoryValues = `(
      ${im.product_id},
      ${im.inventory_unit_cost},
      ${im.inventory_total_cost},
      '${im.description}',
      '${im.code}',
      ${im.created_by},
      ${req.currentUser.user_id}
    )`
    const operationsIds = (result && result.whereConditions && result.whereConditions.operationsIds) || []
    const whereConditions = {
      operationsIds: [...operationsIds, im.operation_id],
    }

    return {
      ...result,
      insertValues: [...(result.insertValues || []), insertValues],
      productsInventoryValues: [...(result.productsInventoryValues || []), productsInventoryValues],
      where: { ...(result.whereConditions || []), ...whereConditions },
    }
  }, {})

  await res.connection.query(createInventoryMovements(insertValues))
  await res.connection.query(updateProductsInventoryCosts(productsInventoryValues))
  const [inventory_movements] = await res.connection.query(findCreatedInventoryMovements(where.operationsIds), [movementType])

  return {
    req: { ...req, body: { ...req.body, inventory_movements } },
    res: { ...res, statusCode: 201, data: { inventory_movements }, message: 'Movimientos de inventario creados exitosamente' },
  }
}

const createInventoryMovements = inventoryMovementsValues => `
  INSERT INTO inventory_movements
  (operation_id, product_id, quantity, movement_type, unit_cost, total_cost, inventory_quantity, inventory_unit_cost, inventory_total_cost)
  VALUES ${inventoryMovementsValues.join(', ')}
`

const findCreatedInventoryMovements = operationsIds => `
  SELECT id AS inventory_movement_id, product_id, quantity, movement_type
  FROM inventory_movements
  WHERE operation_id IN (${operationsIds.join(', ')}) AND movement_type = ? AND status <> '${types.inventoryMovementsStatus.CANCELLED}'
`

module.exports = handleCreateInventoryMovements
