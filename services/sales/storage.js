const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)

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
    d.updated_at,
    d.updated_by,
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
  WHERE (
    d.document_type = '${types.documentsTypes.SELL_PRE_INVOICE}' OR
    d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}'
  ) ${getWhereConditions({ fields, tableAlias: 'd' })}
`

const findStakeholder = (fields = {}, initWhereCondition = `status = '${types.stakeholdersStatus.ACTIVE}'`) => `
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
      WHERE subim.movement_type = 'IN' AND subim.status = 'APPROVED' AND subim.product_id IN (${whereIn.join(', ')})
      GROUP BY subim.product_id
    )
  )
  ORDER BY id DESC
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
    d.comments AS comments,
    d.received_by AS received_by,
    d.start_date AS start_date,
    d.end_date AS end_date,
    d.cancel_reason AS cancel_reason,
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
    p.stock AS old_inventory_movements__stock,
    dp.product_id AS old_products__product_id,
    dp.product_price AS old_products__product_price,
    dp.product_quantity AS old_products__product_quantity,
    dp.product_return_cost AS old_products__product_return_cost,
    dp.tax_fee AS old_products__tax_fee,
    dp.unit_tax_amount AS old_products__unit_tax_amount,
    p.stock AS old_products__stock
  FROM documents d
  LEFT JOIN documents_products dp ON dp.document_id = d.id
  LEFT JOIN products p ON p.id = dp.product_id
  LEFT JOIN operations o ON o.id = d.operation_id
  LEFT JOIN inventory_movements im ON im.operation_id = o.id
  WHERE d.id = ?
`

const findDocumentDetails = () => `
  SELECT
    d.id AS document_id,
    d.related_internal_document_id AS related_internal_document_id,
    d.document_type AS document_type,
    d.status AS document_status,
    d.operation_id AS operation_id,
    d.stakeholder_id AS stakeholder_id,
    d.project_id AS project_id,
    o.operation_type AS operation_type,
    dp.product_id AS products__product_id,
    dp.product_quantity AS products__product_quantity,
    dp.product_price AS products__product_price,
    dp.product_return_cost AS products__product_return_cost,
    dp.tax_fee AS products__tax_fee,
    dp.unit_tax_amount AS products__unit_tax_amount
  FROM documents d
  LEFT JOIN documents_products dp ON dp.document_id = d.id
  LEFT JOIN operations o ON o.id = d.operation_id
  LEFT JOIN inventory_movements im ON im.operation_id = o.id
  LEFT JOIN products p ON p.id = im.product_id
  WHERE 
  d.id = ? AND (
    d.document_type = '${types.documentsTypes.SELL_PRE_INVOICE}' OR
    d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}'
  )
`

module.exports = {
  findAllBy,
  findDocumentDetails,
  findDocument,
  findProducts,
  findProductReturnCost,
  findStakeholder,
}
