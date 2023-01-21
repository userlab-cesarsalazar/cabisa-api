const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const getClientAccountState = (fields = {}) => `
  SELECT 
    s.id,
    s.stakeholder_type,
    s.status,
    s.name,
    s.address,
    s.nit,
    s.email,
    s.phone,
    s.alternative_phone,
    s.business_man,
    s.payments_man,
    s.credit_limit,
    s.total_credit,
    s.paid_credit,
    s.block_reason,
    s.created_at,
    s.created_by,
    s.updated_at,
    s.updated_by
  FROM stakeholders s
  ${getWhereConditions({ fields, tableAlias: 's', hasPreviousConditions: false })}
  ORDER BY s.id DESC
`

const getAccountsReceivable = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'd' })
  const whereConditions = rawWhereConditions.replace(/d.stakeholder_type/i, 's.stakeholder_type').replace(/d.stakeholder_name/i, 's.name')

  return `
    SELECT
      d.id,
      d.document_type,
      d.stakeholder_id,
      s.stakeholder_type,
      s.name AS stakeholder_name,
      d.status,
      d.comments,
      d.description,
      d.subtotal_amount,
      d.total_amount,
      d.credit_status,
      d.paid_credit_amount,
      (d.total_amount - d.paid_credit_amount) AS unpaid_credit_amount,
      d.created_at AS document_date,
      d.credit_due_date,
      d.credit_paid_date
    FROM documents d
    LEFT JOIN stakeholders s ON s.id = d.stakeholder_id
    WHERE (
      (
        d.document_type = '${types.documentsTypes.SELL_INVOICE}' OR
        d.document_type = '${types.documentsTypes.RENT_INVOICE}'
      ) OR (
        (
          d.document_type = '${types.documentsTypes.SELL_PRE_INVOICE}' OR
          d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}'
        )
        AND d.related_internal_document_id IS NULL
      )
    ) AND d.status <> '${types.documentsStatus.CANCELLED}'
    AND d.credit_status IS NOT NULL ${whereConditions}
    ORDER BY d.id DESC
  `
}

const getSales = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'd' })
  const includeInvoices = /d.document_type = 'INVOICES'/i.test(rawWhereConditions)
  const includePreInvoices = /d.document_type = 'PRE_INVOICE'/i.test(rawWhereConditions)
  const includeBoth = !includeInvoices && !includePreInvoices
  const whereConditions = rawWhereConditions
    .replace(/d.client_id/i, 's.id')
    .replace(/AND d.document_type = 'INVOICES'/i, '')
    .replace(/AND d.document_type = 'PRE_INVOICE'/i, '')
    .replace(/start_date/i, 'created_at')
    .replace(/end_date/i, 'created_at')
    .replace(/d.seller_id/i, 'u.id')

  const invoicesWhereConditions =
    includeInvoices || includeBoth
      ? `(
      d.document_type = '${types.documentsTypes.SELL_INVOICE}' OR
      d.document_type = '${types.documentsTypes.RENT_INVOICE}'
    )`
      : ''

  const preInvoicesWhereConditions =
    includePreInvoices || includeBoth
      ? `(d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}' AND d.related_internal_document_id IS NULL)`
      : ''

  const documentTypeWhereOperator = (includeInvoices && includePreInvoices) || includeBoth ? 'OR' : ''

  return `
    SELECT
      d.id,
      d.document_type,
      d.stakeholder_id,
      s.stakeholder_type,
      s.name AS stakeholder_name,
      d.payment_method,
      d.status,
      d.sales_commission_amount,
      d.total_amount,
      d.paid_credit_amount,
      d.created_at,
      u.sales_commission,
      d.created_by AS seller_id,
      u.full_name AS seller_name
    FROM documents d
    LEFT JOIN stakeholders s ON s.id = d.stakeholder_id
    LEFT JOIN users u ON u.id = d.created_by
    WHERE ${includeBoth ? '(' : ''}
        ${invoicesWhereConditions} ${documentTypeWhereOperator} ${preInvoicesWhereConditions}
      ${includeBoth ? ')' : ''} AND
      d.status <> '${types.documentsStatus.CANCELLED}'
      ${whereConditions}
    ORDER BY d.id DESC
  `
}

const getInventory = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'p' })
  const whereConditions = rawWhereConditions.replace(/p.start_date/i, 'imd.created_at').replace(/p.end_date/i, 'imd.created_at')

  // Las siguientes dos lineas se agregaron a la query asumiendo que no existen movimientos parciales de inventario
  // De llegar a existir se debe presentar la informacion de otra manera
  //    imd.created_at AS inventory_movements__created_at,
  //    u.full_name AS inventory_movements__creator_name,

  return `
      SELECT
        p.id AS product_id,
        p.description,
        p.code,
        p.serial_number,
        p.product_type,
        p.product_category,
        p.status,
        p.stock,
        p.inventory_unit_value,
        p.inventory_total_value,
        im.id AS inventory_movements__inventory_movement_id,
        im.product_id AS inventory_movements__product_id,
        im.quantity AS inventory_movements__quantity,
        im.unit_cost AS inventory_movements__unit_cost,
        im.total_cost AS inventory_movements__total_cost,
        im.inventory_quantity AS inventory_movements__inventory_quantity,
        im.inventory_unit_cost AS inventory_movements__inventory_unit_cost,
        im.inventory_total_cost AS inventory_movements__inventory_total_cost,
        o.operation_type AS inventory_movements__operation_type,
        im.movement_type AS inventory_movements__movement_type,
        im.status AS inventory_movements__status,
        imd.created_at AS inventory_movements__created_at,
        u.full_name AS inventory_movements__creator_name,
        imd.inventory_movement_id AS inventory_movements_details__inventory_movement_id,
        im.product_id AS inventory_movements_details__product_id,
        imd.quantity AS inventory_movements_details__quantity,
        imd.storage_location AS inventory_movements_details__storage_location,
        imd.comments AS inventory_movements_details__comments,
        imd.created_at AS inventory_movements_details__created_at,
        imd.created_by AS inventory_movements_details__creator_id,
        u.full_name AS inventory_movements_details__creator_name
      FROM products p
      LEFT JOIN inventory_movements im ON im.product_id = p.id
      LEFT JOIN operations o ON o.id = im.operation_id
      LEFT JOIN inventory_movements_details imd ON imd.inventory_movement_id = im.id
      LEFT JOIN users u ON u.id = imd.created_by
      WHERE (
        im.status = '${types.inventoryMovementsStatus.PARTIAL}' OR
        im.status = '${types.inventoryMovementsStatus.APPROVED}'
      ) ${whereConditions}
      ORDER BY im.operation_id, im.id
    `
}

const getInvoice = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'd' })  
  const whereConditions = rawWhereConditions.replace(/d.nit/i, 's.nit').replace(/d.name/i, 's.name').replace(/d.start_date/i, 'DATE(d.created_at)').replace(/d.end_date/i, 'DATE(d.created_at)')
  return `
    SELECT
      d.id,
      d.serie,
      d.document_number,
      d.related_internal_document_id,
      d.uuid,
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
      CASE
        WHEN d.status = 'APPROVED' THEN 'APROBADO'
        WHEN d.status = 'CANCELLED' THEN 'ANULADO'
            ELSE 'NO DISPONIBLE' END as status_spanish,
      d.cancel_reason,
      d.description,
      d.subtotal_amount AS subtotal,
      d.total_discount_amount AS discount,
      d.total_tax_amount AS total_tax,
      d.total_amount AS total,
      d.payment_method,
      CASE
        WHEN d.payment_method = 'CASH' THEN 'EFECTIVO'
        WHEN d.payment_method = 'CARD' THEN 'CREDITO'
            ELSE 'NO DISPONIBLE' END as payment_method_spanish,
      d.credit_days,
      d.credit_status,
      d.created_at,
      d.created_by,
      d.updated_at,
      d.updated_by,
      proj.id AS project_id,
      proj.name AS project_name,
      prod.id AS products__id,
      prod.product_type AS products__product_type,
      prod.status AS products__status,
      prod.code AS products__code,
      prod.serial_number AS products__serial_number,
      prod.description AS products__description,
      prod.image_url AS products__image_url,
      prod.created_at AS products__created_at,
      prod.created_by AS products__created_by,
      dp.service_type AS products__service_type,
      dp.document_id AS products__document_id,
      dp.product_price AS products__product_price,
      dp.product_quantity AS products__product_quantity,
      dp.tax_fee AS products__tax_fee,
      dp.unit_tax_amount AS products__unit_tax_amount,
      dp.discount_percentage AS products__discount_percentage,
      dp.unit_discount_amount AS products__unit_discount_amount,
      dp.parent_product_id AS products__parent_product_id
    FROM documents d
    LEFT JOIN projects proj ON proj.id = d.project_id
    LEFT JOIN stakeholders s ON s.id = d.stakeholder_id
    LEFT JOIN documents_products dp ON dp.document_id = d.id
    LEFT JOIN products prod ON prod.id = dp.product_id
    WHERE (
      d.document_type = '${types.documentsTypes.SELL_INVOICE}' OR
      d.document_type = '${types.documentsTypes.RENT_INVOICE}'
    ) ${whereConditions}
    ORDER BY d.id DESC
  `
}

const getReceipts = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'd' })
  const whereConditions = rawWhereConditions.replace(/d.nit/i, 's.nit').replace(/d.name/i, 's.name').replace(/d.start_date/i, 'DATE(d.created_at)').replace(/d.end_date/i, 'DATE(d.created_at)')

  return `
    SELECT
      d.id,
      d.document_number,
      d.related_internal_document_id,
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
      d.description,
      d.subtotal_amount,
      d.total_discount_amount,
      d.total_tax_amount,
      d.total_amount,
      CASE
        WHEN d.payment_method = 'CASH' THEN 'EFECTIVO'
        WHEN d.payment_method = 'CARD' THEN 'CREDITO'
        WHEN d.payment_method = 'CHECK' THEN 'CHEQUE'
        WHEN d.payment_method = 'DEPOSIT' THEN 'DEPOSITO'
        WHEN d.payment_method = 'TRANSFER' THEN 'TRANSFERENCIA'
            ELSE 'NO DISPONIBLE' END as payment_method_spanish,
      d.payment_method,
      d.credit_days,
      d.credit_status,
      CASE
        WHEN d.credit_status = 'UNPAID' THEN 'PAGO PENDIENTE'
        WHEN d.credit_status = 'PAID' THEN 'PAGADO'
        WHEN d.credit_status = 'DEFAULT' THEN 'EN MORA'
          ELSE 'NO DISPONIBLE' END as credit_status_spanish,
      d.created_at,
      d.created_by,
      d.updated_at,
      d.updated_by,
      proj.id AS project_id,
      proj.name AS project_name,
      prod.id AS products__id,
      prod.product_type AS products__product_type,
      prod.status AS products__status,
      prod.code AS products__code,
      prod.serial_number AS products__serial_number,
      prod.description AS products__description,
      prod.image_url AS products__image_url,
      prod.created_at AS products__created_at,
      prod.created_by AS products__created_by,
      dp.service_type AS products__service_type,
      dp.document_id AS products__document_id,
      dp.product_price AS products__product_price,
      dp.product_quantity AS products__product_quantity,
      dp.tax_fee AS products__tax_fee,
      dp.unit_tax_amount AS products__unit_tax_amount,
      dp.discount_percentage AS products__discount_percentage,
      dp.unit_discount_amount AS products__unit_discount_amount,
      dp.parent_product_id AS products__parent_product_id,
      pay.id AS payments__id,
      pay.id AS payments__payment_id,
      pay.document_id AS payments__document_id,
      pay.payment_amount AS payments__payment_amount,
      pay.payment_method AS payments__payment_method,
      pay.payment_date AS payments__payment_date,
      pay.related_external_document AS payments__related_external_document,
      pay.description AS payments__description,
      pay.is_deleted AS payments__is_deleted,
      pay.created_at AS payments__created_at,
      pay.created_by AS payments__created_by
    FROM documents d
    LEFT JOIN projects proj ON proj.id = d.project_id
    LEFT JOIN stakeholders s ON s.id = d.stakeholder_id
    LEFT JOIN documents_products dp ON dp.document_id = d.id
    LEFT JOIN products prod ON prod.id = dp.product_id
    LEFT JOIN payments pay ON pay.document_id = d.id
    WHERE (
      d.document_type = '${types.documentsTypes.SELL_INVOICE}' OR
      d.document_type = '${types.documentsTypes.RENT_INVOICE}'
    ) ${whereConditions}
    ORDER BY d.id DESC
  `
}

const getManualReceipts = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'd' })
  const whereConditions = rawWhereConditions.replace(/d.nit/i, 's.nit').replace(/d.name/i, 's.name').replace(/d.start_date/i, 'DATE(d.created_at)').replace(/d.end_date/i, 'DATE(d.created_at)')

  return `
  SELECT
  d.id,
  d.created_at,
  d.status,
  d.total_amount,
  d.stakeholder_id,
  s.name AS stakeholder_name,
  s.nit AS stakeholder_nit,
  s.stakeholder_type AS stakeholder_type,
  s.email AS stakeholder_email,
  s.phone AS stakeholder_phone,
  s.address AS stakeholder_address,
  proj.id AS project_id,
  proj.name AS project_name,
  paydetail.related_external_document AS payments__related_external_document,
  paydetail.id AS payments__id,
  paydetail.id AS payments__payment_id,
  d.id AS payments__document_id,
  paydetail.payment_amount AS payments__payment_amount,
  paydetail.payment_method AS payments__payment_method,
  paydetail.payment_date AS payments__payment_date,
  paydetail.description AS payments__description,
  paydetail.is_deleted AS payments__is_deleted,
  paydetail.created_at AS payments__created_at,
  paydetail.created_by AS payments__created_by
FROM manual_payments d
LEFT JOIN manual_payments_detail paydetail on d.id = paydetail.manual_payment
LEFT JOIN projects proj ON d.project_id = proj.id
LEFT JOIN stakeholders s ON d.stakeholder_id = s.id
    WHERE 1 = 1      
    ${whereConditions}
    ORDER BY d.id DESC
  `
}

module.exports = {
  getAccountsReceivable,
  getClientAccountState,
  getInventory,
  getSales,
  getInvoice,
  getReceipts,
  getManualReceipts
}
