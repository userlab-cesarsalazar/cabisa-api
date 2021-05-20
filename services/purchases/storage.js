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

const findProducts = whereIn => `
  SELECT
    p.id AS product_id,
    p.stock,
    p.unit_price AS product_price,
    t.fee AS tax_fee,
    (p.unit_price * (t.fee / 100)) AS tax_amount
  FROM products p
  LEFT JOIN taxes t ON t.id = p.tax_id
  WHERE p.id IN (${whereIn.join(', ')})
`

const checkInventoryMovementsOnApprove = whereIn => `
  SELECT im.id, im.quantity AS total_qty, SUM(imd.quantity) AS approved_qty
  FROM inventory_movements im
  LEFT JOIN inventory_movements_details imd ON imd.inventory_movement_id = im.id
  WHERE im.status <> 'CANCELLED' AND im.status <> 'APPROVED' AND im.id IN (${whereIn.join(', ')})
  GROUP BY im.id, imd.inventory_movement_id
`

const findPurchaseMovements = (fields = {}) => `
  SELECT d.id AS document_id, d.related_internal_document_id, d.document_type, d.operation_id
  FROM documents d
  ${getWhereConditions({ fields, hasPreviousConditions: false })}
`

module.exports = {
  checkInventoryMovementsOnApprove,
  findAllBy,
  findProducts,
  findPurchaseMovements,
  findStakeholder,
}
