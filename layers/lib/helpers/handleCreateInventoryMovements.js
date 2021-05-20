const appConfig = require('../appConfig')
const types = require('../types')

const handleCreateInventoryMovements = async (req, res) => {
  const { products, operation_id, operation_type } = req.body

  if (!operation_id) return { req, res }

  const movementTypes = appConfig.operations[operation_type].inventoryMovementsType

  const inventoryMovements = movementTypes.reduce((movementsResult, movement_type) => {
    const movements = products.map(p => {
      const unit_cost =
        movement_type === types.inventoryMovementsTypes.IN
          ? operation_type === types.operationsTypes.RENT
            ? p.product_return_cost
            : p.product_price
          : null

      return { operation_id, product_id: p.product_id, quantity: p.product_quantity, unit_cost, movement_type }
    })

    return [...movementsResult, ...movements]
  }, [])

  const inventoryMovmentsQueryValues = inventoryMovements.reduce((result, im) => {
    const insertValues = `(${im.operation_id}, ${im.product_id}, ${im.quantity}, ${im.unit_cost}, '${im.movement_type}')`
    const whereConditions = {
      operationsIds: [...(result?.whereConditions?.operationsIds || []), im.operation_id],
    }

    return {
      ...result,
      insertValues: [...(result.insertValues || []), insertValues],
      where: { ...(result.whereConditions || []), ...whereConditions },
    }
  }, {})

  const { insertValues, where } = inventoryMovmentsQueryValues

  await res.connection.query(createInventoryMovements(insertValues))
  const [inventory_movements] = await res.connection.query(findCreatedInventoryMovements(where.operationsIds))

  return {
    req: { ...req, body: { ...req.body, inventory_movements } },
    res: { ...res, statusCode: 201, data: { inventory_movements }, message: 'Inventory movements created successfully' },
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
  WHERE operation_id IN (${operationsIds.join(', ')})
`

module.exports = handleCreateInventoryMovements
