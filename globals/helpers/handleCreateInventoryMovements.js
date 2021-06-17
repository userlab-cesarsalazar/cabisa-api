const types = require('../types')

// req.body: {
//   document_type,
//   operation_id,
//   products: [
//     {
//       product_id,
//       product_type,
//       stock,
//       product_price,
//       tax_fee,
//       product_quantity,
//       product_discount_percentage,
//       product_discount,
//       unit_tax_amount,
//     },
//   ],
// }

const handleCreateInventoryMovements = async (req, res) => {
  // if both are needed, keep the order in the next array, first 'OUT' then 'IN'
  // [inventoryMovementsTypes.OUT, inventoryMovementsTypes.IN],
  const config = {
    [types.documentsTypes.SELL_INVOICE]: [types.inventoryMovementsTypes.OUT],
    [types.documentsTypes.PURCHASE_ORDER]: [types.inventoryMovementsTypes.IN],
    [types.documentsTypes.RENT_PRE_INVOICE]: [types.inventoryMovementsTypes.OUT],
    [types.documentsTypes.RENT_INVOICE]: [types.inventoryMovementsTypes.IN],
  }

  const { products, document_type, operation_id } = req.body

  if (!operation_id) return { req, res }

  const movementTypes = config[document_type]

  const inventoryMovements = movementTypes.reduce((movementsResult, movement_type) => {
    const movements = products.flatMap(p => {
      if (p.product_type === types.productsTypes.SERVICE) return []

      const unit_cost = movement_type === types.inventoryMovementsTypes.IN ? p.product_price : null

      return { operation_id, product_id: p.product_id, quantity: p.product_quantity, unit_cost, movement_type }
    })

    return [...movementsResult, ...movements]
  }, [])

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
  const queryMovementTypes = movementTypes.map(mt => `'${mt}'`)

  await res.connection.query(createInventoryMovements(insertValues))
  const [inventory_movements] = await res.connection.query(findCreatedInventoryMovements(where.operationsIds, queryMovementTypes))

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

const findCreatedInventoryMovements = (operationsIds, movementTypes) => `
  SELECT id AS inventory_movement_id, product_id, quantity, movement_type
  FROM inventory_movements
  WHERE operation_id IN (${operationsIds.join(', ')}) AND movement_type IN (${movementTypes.join(', ')})
`

module.exports = handleCreateInventoryMovements
