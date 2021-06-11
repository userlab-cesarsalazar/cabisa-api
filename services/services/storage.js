const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}, initWhereCondition = `p.product_type = '${types.productsTypes.SERVICE}'`) => `
  SELECT
    p.id,
    p.status,
    p.code,
    p.unit_price,
    p.description,
    p.created_at,
    p.created_by,
    p.updated_at,
    p.updated_by
  FROM products p
  WHERE ${initWhereCondition} ${getWhereConditions({ fields, tableAlias: 'p' })}
`

const findServicesStatus = () => `DESCRIBE products status`

const checkExists = (
  fields = {},
  initWhereCondition = `p.status = '${types.productsStatus.ACTIVE}' AND p.product_type = '${types.productsTypes.SERVICE}'`
) => `
  SELECT id FROM products p WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const findTaxIdExento = () => `SELECT id FROM taxes WHERE name = 'EXENTO'`

const createService = () => `
  INSERT INTO products (status, code, unit_price, description, tax_id, created_by, stock)
  VALUES(?, ?, ?, ?, ?, ?, 1000)
`

const updateService = () => `
  UPDATE products SET status = ?, code = ?, unit_price = ?, description = ?, updated_by = ? WHERE id = ?
`

const deleteService = () => `DELETE FROM products WHERE product_type = '${types.productsTypes.SERVICE}' AND id = ?`

module.exports = {
  checkExists,
  createService,
  deleteService,
  findAllBy,
  findServicesStatus,
  findTaxIdExento,
  updateService,
}
