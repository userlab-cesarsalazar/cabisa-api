const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}) => `
  SELECT
  im.id,
  im.operation_id,
  im.product_id,
  im.quantity,
  im.unit_cost,
  im.movement_type,
  im.status
  FROM inventory_movements im
  LEFT JOIN inventory_movements_details imd ON imd.inventory_movement_id = im.id
  LEFT JOIN operations o ON o.id = im.operation_id
  LEFT JOIN documents d ON d.operation_id = o.id
  ${getWhereConditions({ fields, tableAlias: 'im', hasPreviousConditions: false })}
  ORDER BY im.id DESC
`

const checkInventoryMovementsOnApprove = whereIn => `
  SELECT im.id, im.quantity AS total_qty, SUM(imd.quantity) AS approved_qty
  FROM inventory_movements im
  LEFT JOIN inventory_movements_details imd ON imd.inventory_movement_id = im.id
  WHERE
    im.status <> '${types.inventoryMovementsStatus.CANCELLED}' AND
    im.status <> '${types.inventoryMovementsStatus.APPROVED}' AND
    im.id IN (${whereIn.join(', ')})
  GROUP BY im.id, imd.inventory_movement_id
`

module.exports = {
  checkInventoryMovementsOnApprove,
  findAllBy,
}
