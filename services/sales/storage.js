const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}) => `
  SELECT
    d.id,
    d.document_type,
    d.stakeholder_id,
    d.operation_id,
    d.related_internal_document_id,
    d.related_external_document_id,
    d.status,
    d.comments,
    d.received_by,
    d.dispatched_by,
    d.start_date,
    d.end_date,
    d.cancel_reason,
    d.credit_days,
    u.full_name AS creator_name,
    d.created_at,
    d.created_by,
    d.updated_at,
    d.updated_by,
    (CASE
      WHEN 
        (d.related_internal_document_id IS NOT NULL AND d.operation_id IS NOT NULL) OR
        d.status = '${types.documentsStatus.CANCELLED}'
      THEN 1
      ELSE 0
    END) AS has_related_invoice,
    s.id AS stakeholder_id,
    s.stakeholder_type AS stakeholder_type,
    s.name AS stakeholder_name,
    s.nit AS stakeholder_nit,
    s.email AS stakeholder_email,
    s.business_man AS stakeholder_business_man,
    s.address AS stakeholder_address,
    s.phone AS stakeholder_phone,
    proj.id AS project_id,
    proj.name AS project_name,
    prod.id AS products__id,
    prod.status AS products__status,
    dp.service_type AS products__service_type,
    dp.product_price AS products__unit_price,
    dp.product_quantity AS products__quantity,
    dp.tax_fee AS products__tax_fee,
    dp.unit_tax_amount AS products__unit_tax_amount,
    dp.parent_product_id AS products__parent_product_id,
    prod.code AS products__code,
    prod.serial_number AS products__serial_number,
    prod.description AS products__description
  FROM documents d
  INNER JOIN users u ON u.id = d.created_by
  INNER JOIN documents_products dp ON dp.document_id = d.id
  INNER JOIN products prod ON prod.id = dp.product_id
  INNER JOIN stakeholders s ON s.id = d.stakeholder_id
  INNER JOIN projects proj ON proj.id = d.project_id
  WHERE (
    d.document_type = '${types.documentsTypes.SELL_PRE_INVOICE}' OR
    d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}'
  ) ${getWhereConditions({ fields, tableAlias: 'd' })}
  ORDER BY d.id DESC
`

const findSalesStatus = () => `DESCRIBE documents status`

const findDocument = () => `
  SELECT
    d.id AS document_id,
    d.document_type AS document_type,
    d.stakeholder_id AS stakeholder_id,
    d.operation_id AS operation_id,
    o.operation_type AS operation_type,
    d.project_id AS project_id,
    d.related_internal_document_id AS related_internal_document_id,
    d.related_external_document_id AS related_external_document_id,
    d.status AS status,
    d.status AS document_status,
    d.comments AS comments,
    d.received_by AS received_by,
    d.dispatched_by AS dispatched_by,
    d.start_date AS start_date,
    d.end_date AS end_date,
    d.payment_method AS payment_method,
    d.cancel_reason AS cancel_reason,
    d.subtotal_amount AS subtotal_amount,
    d.total_discount_amount AS total_discount_amount,
    d.total_tax_amount AS total_tax_amount,
    d.total_amount AS total_amount,
    d.credit_days AS credit_days,
    d.credit_status AS credit_status,
    d.created_at AS created_at,
    d.created_by AS created_by,
    d.updated_at AS updated_at,
    d.updated_by AS updated_by,
    im.id AS old_inventory_movements__inventory_movement_id,
    im.operation_id AS old_inventory_movements__operation_id,
    im.product_id AS old_inventory_movements__product_id,
    im.quantity AS old_inventory_movements__quantity,
    im.unit_cost AS old_inventory_movements__unit_cost,
    im.movement_type AS old_inventory_movements__movement_type,
    im.status AS old_inventory_movements__status,
    dp.product_id AS old_products__product_id,
    dp.service_type AS products__service_type,
    dp.product_price AS old_products__product_price,
    dp.product_quantity AS old_products__product_quantity,
    dp.tax_fee AS old_products__tax_fee,
    dp.unit_tax_amount AS old_products__unit_tax_amount,
    dp.parent_product_id AS old_products__parent_product_id,
    p.stock AS old_products__stock,
    dp.product_id AS products__product_id,
    dp.product_quantity AS products__product_quantity,
    dp.product_price AS products__product_price,
    dp.tax_fee AS products__tax_fee,
    dp.unit_tax_amount AS products__unit_tax_amount,
    dp.parent_product_id AS products__parent_product_id,
    p.product_type AS products__product_type,
    p.status AS products__product_status,
    p.stock AS products__product_stock
  FROM documents d
  LEFT JOIN documents_products dp ON dp.document_id = d.id
  LEFT JOIN products p ON p.id = dp.product_id
  LEFT JOIN operations o ON o.id = d.operation_id
  LEFT JOIN inventory_movements im ON im.operation_id = o.id
  WHERE d.id = ? AND (
    d.document_type = '${types.documentsTypes.SELL_PRE_INVOICE}' OR
    d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}'
  )
`

module.exports = {
  findAllBy,
  findDocument,
  findSalesStatus,
}
