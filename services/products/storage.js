const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)

const findAllBy = (fields = {}, initWhereCondition = `p.status = 'ACTIVE'`) => `
  SELECT
    p.id,
    p.product_type,
    p.status,
    p.name,
    p.code,
    p.serial_number,
    p.unit_price,
    p.stock,
    p.description,
    p.image_url,
    p.created_at,
    p.created_by,
    p.updated_at,
    p.updated_by,
    im.id AS product_history__inventory_movement_id,
    im.operation_id AS product_history__operation_id,
    im.product_id AS product_history__product_id,
    im.quantity AS product_history__quantity,
    im.unit_cost AS product_history__unit_cost,
    im.movement_type AS product_history__movement_type,
    im.status AS product_history__status
  FROM products p
  INNER JOIN inventory_movements im ON im.product_id = p.id
  WHERE ${initWhereCondition} ${getWhereConditions({ fields, tableAlias: 'p' })}
`

const checkExists = (fields = {}, initWhereCondition = `status = 'ACTIVE'`) => `
  SELECT id FROM products WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const createProduct = () => `
  INSERT INTO products (product_type, status, name, code, serial_number, unit_price, description, image_url, created_by)
  VALUES(?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)
`

const updateProduct = () => `
  UPDATE products SET name = ?, code = ?, serial_number = ?, unit_price = ?, description = ?, image_url = ?, updated_by = ? WHERE id = ?
`

const setStatusProduct = () => 'UPDATE products SET status = ?, updated_by = ? WHERE id = ?'

module.exports = {
  checkExists,
  createProduct,
  findAllBy,
  setStatusProduct,
  updateProduct,
}
