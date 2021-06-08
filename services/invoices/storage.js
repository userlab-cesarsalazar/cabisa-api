const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)

const findAllBy = (fields = {}) => `
  SELECT
    d.id,
    d.document_type,
    d.stakeholder_id,
    s.name AS stakeholder_name,
    s.nit AS stakeholder_nit,
    s.stakeholder_type AS stakeholder_type,
    s.email AS stakeholder_email,
    s.phone AS stakeholder_phone,
    s.address AS stakeholder_address,
    d.operation_id,
    d.status,
    d.cancel_reason,
    d.payment_method,
    d.created_at,
    d.created_by,
    d.updated_at,
    d.updated_by,
    proj.id AS project_id,
    proj.name AS project_name,
    prod.id AS products__id,
    prod.product_type AS products__product_type,
    prod.status AS products__status,
    dp.product_price AS products__product_price,
    dp.product_quantity AS products__product_quantity,
    dp.tax_fee AS products__tax_fee,
    dp.unit_tax_amount AS products__unit_tax_amount,
    dp.discount_percentage AS products__discount_percentage,
    dp.unit_discount_amount AS products__unit_discount_amount,
    prod.code AS products__code,
    prod.serial_number AS products__serial_number,
    prod.description AS products__description,
    prod.image_url AS products__image_url,
    prod.created_at AS products__created_at,
    prod.created_by AS products__created_by
  FROM documents d
  LEFT JOIN projects proj ON proj.id = d.project_id
  LEFT JOIN stakeholders s ON s.id = d.stakeholder_id
  LEFT JOIN documents_products dp ON dp.document_id = d.id
  LEFT JOIN products prod ON prod.id = dp.product_id
  WHERE (
    d.document_type = '${types.documentsTypes.SELL_INVOICE}' OR
    d.document_type = '${types.documentsTypes.RENT_INVOICE}'
  ) ${getWhereConditions({ fields, tableAlias: 'd' })}
`

const findPaymentMethods = () => `DESCRIBE documents payment_method`

const findInvoiceStatus = () => `DESCRIBE documents status`

const findStakeholder = (fields = {}, initWhereCondition = `status = '${types.stakeholdersStatus.ACTIVE}'`) => `
  SELECT id, stakeholder_type, status, name, address, nit, email, phone, alternative_phone, business_man, payments_man,block_reason, created_at, created_by, updated_at, updated_by
  FROM stakeholders
  WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const findProducts = whereIn => `
  SELECT
    p.id AS product_id,
    p.stock,
    p.unit_price AS product_price,
    t.fee AS tax_fee
  FROM products p
  LEFT JOIN taxes t ON t.id = p.tax_id
  WHERE p.id IN (${whereIn.join(', ')})
`

const checkProjectExists = () => `SELECT id FROM projects WHERE id = ?`

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

const findDocumentMovements = () => `
  SELECT
    d.id AS document_id,
    d.related_internal_document_id AS related_internal_document_id,
    d.document_type AS document_type,
    d.status AS document_status,
    d.operation_id AS operation_id,
    im.id AS inventory_movements__inventory_movement_id,
    im.movement_type AS inventory_movements__movement_type,
    im.product_id AS inventory_movements__product_id,
    im.quantity AS inventory_movements__quantity,
    p.stock AS inventory_movements__stock,
    p.status AS inventory_movements__product_status
  FROM documents d
  LEFT JOIN operations o ON o.id = d.operation_id
  LEFT JOIN inventory_movements im ON im.operation_id = o.id
  LEFT JOIN products p ON p.id = im.product_id
  WHERE
    d.id = ? AND (
      d.document_type = '${types.documentsTypes.SELL_INVOICE}' OR
      d.document_type = '${types.documentsTypes.RENT_INVOICE}'
    )
`

module.exports = {
  checkInventoryMovementsOnApprove,
  checkProjectExists,
  findAllBy,
  findInvoiceStatus,
  findPaymentMethods,
  findProducts,
  findDocumentMovements,
  findStakeholder,
}
