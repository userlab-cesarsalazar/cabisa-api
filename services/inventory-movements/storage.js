const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)

const findAllBy = (fields = {}) => `
  SELECT
    d.id,
    d.document_type,
    d.stakeholder_id,
    d.operation_id,
    d.status,
    d.start_date,
    d.end_date,
    d.cancel_reason,
    d.created_at,
    d.created_by,
    d.authorized_at,
    d.authorized_by,
    p.id AS products__id,
    p.name AS products__name,
    p.product_type AS products__product_type,
    p.status AS products__status,
    dp.product_price AS products__product_price,
    dp.product_quantity AS products__product_quantity,
    dp.product_return_cost AS products__product_return_cost,
    p.code AS products__code,
    p.serial_number AS products__serial_number,
    p.description AS products__description,
    p.image_url AS products__image_url,
    p.created_at AS products__created_at,
    p.created_by AS products__created_by
  FROM documents d
  INNER JOIN documents_products dp ON dp.document_id = d.id
  INNER JOIN products p ON p.id = dp.product_id
  ${getWhereConditions({ fields, tableAlias: 'd', hasPreviousConditions: false })}
`

const findStakeholder = (fields = {}, initWhereCondition = `status = 'ACTIVE'`) => `
  SELECT id, stakeholder_type, status, name, address, nit, email, phone, alternative_phone, business_man, payments_man,block_reason, created_at, created_by, updated_at, updated_by
  FROM stakeholders
  WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const findProductReturnCost = whereIn => `
  SELECT im.product_id, im.unit_cost AS product_return_cost
  FROM inventory_movements im
  WHERE im.id IN (
    (
      SELECT MAX(subim.id) AS id
      FROM inventory_movements subim
      WHERE subim.movement_type = 'IN' AND status = 'COMPLETED' AND subim.product_id IN (${whereIn.join(', ')})
      GROUP BY subim.product_id
    )
  )
  ORDER BY id DESC
`

const findProducts = whereIn => `
  SELECT id AS product_id, stock
  FROM products
  WHERE id IN (${whereIn.join(', ')})
`

const createDocument = () => `
  INSERT INTO documents
  (document_type, stakeholder_id, start_date, end_date, created_by)
  VALUES(?, ?, ?, ?, ?)
`
const createDocumentsProducts = valuesArray => `
  INSERT INTO documents_products
  (document_id, product_id, product_price, product_quantity, product_return_cost)
  VALUES ${valuesArray.join(', ')}
`

const createOperation = () => `INSERT INTO operations (operation_type, created_by) VALUES(?, ?)`

const authorizeInternalDocument = () => `
  UPDATE documents SET status = 'APPROVED', operation_id = ?, related_internal_document_id = ?, authorized_by = ? WHERE id = ?
`

const authorizeExternalDocument = () => `
  UPDATE documents SET status = 'APPROVED', operation_id = ?, related_external_document_id = ?, authorized_by = ? WHERE id = ?
`

const createInventoryMovements = inventoryMovementsValues => `
  INSERT INTO inventory_movements
  (operation_id, product_id, quantity, unit_cost, movement_type)
  VALUES ${inventoryMovementsValues.join(', ')}
`

const findCreatedInventoryMovements = operationsIds => `
  SELECT id AS inventory_movement_id, product_id, quantity
  FROM inventory_movements
  WHERE operation_id IN (${operationsIds.join(', ')})
`

const createInventoryMovementsDetails = () => `
  INSERT INTO inventory_movements_details
  (inventory_movement_id, quantity, storage_location, comments, created_by)
  VALUES(?, ?, ?, ?, ?)
`

const authorizeInventoryMovements = () => `UPDATE inventory_movements SET status = ? WHERE id = ?`

const findInventoryMovementsDetails = whereIn => `
  SELECT im.id AS inventory_movement_id, imd.quantity AS detail_qty, im.quantity AS total_qty, im.movement_type, p.id AS product_id, p.stock
  FROM inventory_movements im
  LEFT JOIN inventory_movements_details imd ON imd.inventory_movement_id = im.id
  LEFT JOIN products p ON p.id = im.product_id
  WHERE im.id IN (${whereIn.join(', ')})
`

const updateStock = () => `UPDATE products SET stock = ? WHERE id = ?`

const updateDocument = () => `
  UPDATE documents
  SET stakeholder_id = ?, operation_id = ?, status = ?, start_date = ?, end_date = ?, cancel_reason = ?, created_at = ?, created_by = ?, authorized_at = ?, authorized_by = ?
  WHERE id = ?
`

const setStatusDocument = () => 'UPDATE documents SET status = ?, block_reason = ? WHERE id = ?'

const updateProductStock = () => `UPDATE products SET stock = ? WHERE id = ?`

module.exports = {
  authorizeInternalDocument,
  authorizeInventoryMovements,
  authorizeExternalDocument,
  createDocument,
  createDocumentsProducts,
  createInventoryMovements,
  createInventoryMovementsDetails,
  createOperation,
  findAllBy,
  findCreatedInventoryMovements,
  findInventoryMovementsDetails,
  findProducts,
  findProductReturnCost,
  findStakeholder,
  setStatusDocument,
  updateDocument,
  updateProductStock,
  updateStock,
}
