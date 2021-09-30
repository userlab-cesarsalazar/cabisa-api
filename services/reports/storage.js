const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

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
      d.credit_status,
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
    ) AND d.status <> '${types.documentsStatus.CANCELLED}' ${whereConditions}
    ORDER BY d.id DESC
  `
}

const getSales = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'd' })
  const includeInvoices = /d.document_type = 'INVOICE'/i.test(rawWhereConditions)
  const includePreInvoices = /d.document_type = 'PRE_INVOICE'/i.test(rawWhereConditions)
  const includeBoth = !includeInvoices && !includePreInvoices
  const whereConditions = rawWhereConditions
    .replace(/d.stakeholder_name/i, 's.name')
    .replace(/AND d.document_type = 'INVOICE'/i, '')
    .replace(/AND d.document_type = 'PRE_INVOICE'/i, '')
    .replace(/start_date/i, 'created_at')
    .replace(/end_date/i, 'created_at')
    .replace(/d.seller_name/i, 'u.full_name')

  const invoicesWhereConditions =
    includeInvoices || includeBoth
      ? `(
      d.document_type = '${types.documentsTypes.SELL_INVOICE}' OR
      d.document_type = '${types.documentsTypes.RENT_INVOICE}'
    )`
      : ''

  const preInvoicesWhereConditions =
    includePreInvoices || includeBoth
      ? `(
      (
        d.document_type = '${types.documentsTypes.SELL_PRE_INVOICE}' OR
        d.document_type = '${types.documentsTypes.RENT_PRE_INVOICE}'
      )
      AND d.related_internal_document_id IS NULL
    )`
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

module.exports = {
  getAccountsReceivable,
  getInventory,
  getSales,
}
