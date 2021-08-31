const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}) => `
  SELECT
    d.id AS document_id,
    d.product_id,
    d.document_type,
    d.operation_id,
    d.status,
    d.description,
    d.start_date,
    d.end_date,
    d.created_at,
    d.created_by,
    d.updated_at,
    d.updated_by,
    prod.id AS products__id,
    prod.status AS products__status,
    dp.service_type AS products__service_type,
    dp.product_price AS products__unit_price,
    dp.product_quantity AS products__quantity,
    prod.code AS products__code,
    prod.serial_number AS products__serial_number,
    prod.description AS products__description
  FROM documents d
  LEFT JOIN documents_products dp ON dp.document_id = d.id
  LEFT JOIN products prod ON prod.id = dp.product_id
  WHERE d.document_type = '${types.documentsTypes.REPAIR_ORDER}' ${getWhereConditions({ fields, tableAlias: 'd' })}
  ORDER BY d.id DESC
`

const findRepairsStatus = () => `DESCRIBE documents status`

module.exports = {
  findAllBy,
  findRepairsStatus,
}
