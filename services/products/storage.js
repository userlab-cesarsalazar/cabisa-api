const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)

const findAllBy = (fields = {}, debug) => {
  const query = `
    SELECT p.id, p.name, p.description, p.code, p.serial_number, p.cost, p.category_id, p.service_type_id, c.name AS category, st.name AS service_type 
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id
    INNER JOIN service_types st ON p.service_type_id = st.id
    WHERE p.is_active = 1 ${getWhereConditions({ fields, tableName: 'p', hasPreviousConditions: true })}
  `
  if (debug) console.log(query)
  return query
}

const createProduct = debug => {
  const query = `
    INSERT INTO products (name, description, code, serial_number, cost, category_id, service_type_id, is_active)
    VALUES(?, ?, ?, ?, ?, ?, ?, 1)
  `
  if (debug) console.log(query)
  return query
}

const updateProduct = debug => {
  const query = `UPDATE products SET name = ?, description = ?, code = ?, serial_number = ?, cost = ?, category_id = ?, service_type_id = ? WHERE id = ?`
  if (debug) console.log(query)
  return query
}

const deleteProduct = debug => {
  const query = 'UPDATE products SET is_active = 0 WHERE id = ?'
  if (debug) console.log(query)
  return query
}

module.exports = {
  createProduct,
  deleteProduct,
  findAllBy,
  updateProduct,
}
