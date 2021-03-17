const findAll = debug => {
  const query = 'SELECT id, full_name, is_active, email, rol_id FROM users'
  if (debug) console.log(query)
  return query
}

const findBy = (whereField, debug) => {
  const query = `SELECT id, full_name, is_active, email, rol_id FROM users WHERE ${whereField} = ?`
  if (debug) console.log(query)
  return query
}

const createUser = debug => {
  const query = 'INSERT INTO users (full_name, password, email, rol_id) VALUES(?, ?, ?, ?)'
  if (debug) console.log(query)
  return query
}

const updateUser = debug => {
  const query = 'UPDATE users SET full_name = ?, is_active = ?, password = ?, rol_id = ? WHERE id = ?'
  if (debug) console.log(query)
  return query
}

const deleteUser = debug => {
  const query = 'DELETE FROM users WHERE id = ?'
  if (debug) console.log(query)
  return query
}

module.exports = {
  createUser,
  deleteUser,
  findAll,
  findBy,
  updateUser,
}
