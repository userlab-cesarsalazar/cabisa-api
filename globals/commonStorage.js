const types = require('./types')
const { getWhereConditions } = require('./common')

const findProducts = whereIn => `
  SELECT
    p.id AS product_id,
    p.product_type,
    p.stock,
    p.unit_price AS product_price,
    t.fee AS tax_fee
  FROM products p
  LEFT JOIN taxes t ON t.id = p.tax_id
  WHERE p.id IN (${whereIn.join(', ')})
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

const findDocumentMovements = documentsType => {
  const documentTypeWhereValues = documentsType.map(dt => `d.document_type = '${dt}'`)

  return `
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
  findDocumentMovements,
  findStakeholderCredit,
}
