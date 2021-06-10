const handleDeleteInventoryMovements = async (req, res) => {
  const { old_inventory_movements } = req.body

  const inventoryMovementIds = old_inventory_movements.map(oim => oim.inventory_movement_id)

  if (inventoryMovementIds && inventoryMovementIds[0]) await res.connection.query(deleteInventoryMovementsDetails(inventoryMovementIds))
  if (inventoryMovementIds && inventoryMovementIds[0]) await res.connection.query(deleteInventoryMovements(inventoryMovementIds))

  return { req, res }
}

const deleteInventoryMovements = whereIn => `DELETE FROM inventory_movements WHERE id IN (${whereIn.join(', ')})`

const deleteInventoryMovementsDetails = whereIn => `DELETE FROM inventory_movements_details WHERE inventory_movement_id IN (${whereIn.join(', ')})`

module.exports = handleDeleteInventoryMovements
