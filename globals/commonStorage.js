const types = require('./types')
const { getWhereConditions } = require('./common')

const findProducts = (whereIn, extraWhereConditions = '') => `
  SELECT
    p.id AS product_id,
    p.product_type,
    p.stock,
    p.unit_price AS product_price,
    t.fee AS tax_fee
  FROM products p
  LEFT JOIN taxes t ON t.id = p.tax_id
  WHERE p.id IN (${whereIn.join(', ')}) ${extraWhereConditions}
`

const findStakeholder = (fields = {}, initWhereCondition = `status = '${types.stakeholdersStatus.ACTIVE}'`) => `
  SELECT 
    id,
    id AS stakeholder_id,
    stakeholder_type,
    status,
    name,
    address,
    nit,
    email,
    credit_limit,
    phone,
    alternative_phone,
    business_man,
    payments_man,
    block_reason,
    created_at,
    created_by,
    updated_at,
    updated_by
  FROM stakeholders
  WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const findDocument = documentsType => {
  const documentTypeWhereValues = documentsType.map(dt => `d.document_type = '${dt}'`)

  return `
  SELECT
    d.id AS document_id,
    d.document_type AS document_type,
    d.stakeholder_id AS stakeholder_id,
    d.operation_id AS operation_id,
    o.operation_type AS operation_type,
    d.product_id AS product_id,
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
  WHERE d.id = ? AND (${documentTypeWhereValues.join(' OR ')})
`
}

const findDocumentMovements = documentsType => {
  const documentTypeWhereValues = documentsType.map(dt => `d.document_type = '${dt}'`)

  return `
    SELECT
      d.id AS document_id,
      d.product_id AS repair_product_id,
      d.related_internal_document_id AS related_internal_document_id,
      d.document_type AS document_type,
      d.end_date AS end_date,
      d.status AS document_status,
      d.operation_id AS operation_id,
      im.id AS inventory_movements__inventory_movement_id,
      im.movement_type AS inventory_movements__movement_type,
      im.product_id AS inventory_movements__product_id,
      im.quantity AS inventory_movements__quantity,
      im.quantity AS inventory_movements__product_quantity,
      p.stock AS inventory_movements__stock,
      p.status AS inventory_movements__product_status,
      p.product_type AS inventory_movements__product_type,
      p.unit_price AS inventory_movements__product_price
    FROM documents d
    LEFT JOIN operations o ON o.id = d.operation_id
    LEFT JOIN inventory_movements im ON im.operation_id = o.id
    LEFT JOIN products p ON p.id = im.product_id
    WHERE d.id = ? AND (${documentTypeWhereValues.join(' OR ')})
  `
}

// Las ventas generan un documento con (document_type = 'RENT_PRE_INVOICE' AND credit_days = NULL AND credit_status = NULL AND status = 'PENDING') pero aun asi se consideran creditos
// Las ventas pueden generar facturas, es decir, genera un nuevo documento asociado al docuemnto de la venta con (document_type = 'RENT_INVOICE')
// Las facturacion genera dos documentos al mismos tiempo con (document_type = 'SELL_PRE_INVOICE' y document_type = 'SELL_INVOICE') ambos con (status = 'APPROVED')
// Las facturas pueden ser a credito o no. Por ejemplo, pueden tener (credit_days = 30 AND credit_status = 100) o (credit_days = NULL AND credit_status = NULL)
const findStakeholderCredit = stakeholder_id => `
  SELECT d.id, d.subtotal_amount AS credit_amount
  FROM documents d
  WHERE (
      d.stakeholder_id = ${stakeholder_id} AND
      d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}' AND
      d.status = '${types.documentsStatus.PENDING}'
    ) OR (
      d.stakeholder_id = ${stakeholder_id} AND
      (document_type = '${types.documentsTypes.RENT_INVOICE}' OR document_type = '${types.documentsTypes.SELL_INVOICE}') AND
      d.status <> '${types.documentsStatus.CANCELLED}' AND
      d.credit_days IS NOT NULL AND d.credit_days > 0 AND
      d.credit_status <> '${types.creditsPolicy.creditStatusEnum.PAID}'
    );
`

module.exports = {
  findProducts,
  findStakeholder,
  findDocument,
  findDocumentMovements,
  findStakeholderCredit,
}
