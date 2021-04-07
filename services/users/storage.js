const findAllBy = (fields = {}, debug) => {
  const whereFields = Object.keys(fields).flatMap(k => (fields[k] ? `${k} = '${fields[k]}'` : []))
  const query = `
    SELECT *
    FROM users
    WHERE is_active = 1 ${whereFields.length > 0 ? 'AND' : ''} ${whereFields.join(' AND ')}
  `
  if (debug) console.log(query)
  return query
}

const createUser = debug => {
  const query = `INSERT INTO users (full_name, email, rol_id, permissions, is_active) VALUES(?,?,?,?, 1)`
  if (debug) console.log(query)
  return query
}

const updateUser = debug => {
  const query = 'UPDATE users SET full_name = ?, email = ?, rol_id = ?, permissions = ? WHERE id = ?'
  if (debug) console.log(query)
  return query
}

const deleteUser = debug => {
  const query = 'UPDATE users SET is_active = 0 WHERE id = ?'
  if (debug) console.log(query)
  return query
}

module.exports = {
  createUser,
  deleteUser,
  findAllBy,
  updateUser,
}
