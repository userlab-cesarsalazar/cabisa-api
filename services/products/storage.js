const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)

const findAllBy = (fields = {}, initWhereCondition = `status = 'ACTIVE'`) => `
  SELECT id, product_type, status, name, code, serial_number, unit_price, stock, description, image_url, created_at, created_by, updated_at, updated_by
  FROM products
  WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
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
  createProduct,
  findAllBy,
  setStatusProduct,
  updateProduct,
}
