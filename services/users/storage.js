const findAllBy = (fields = {}, debug) => {
  const whereFields = Object.keys(fields).map(k => `${k} = ${fields[k] ? `'${fields[k]}'` : null}`)
  const query = `
    SELECT id, full_name, email, rol_id
    FROM users
    WHERE is_active = 1 ${whereFields.length > 0 ? 'AND' : ''} ${whereFields.join(' AND ')}
  `
  if (debug) console.log(query)
  return query
}

const createUser = debug => {
  const query = 'INSERT INTO users (full_name, password, email, rol_id, is_active) VALUES(?, ?, ?, ?, 1)'
  if (debug) console.log(query)
  return query
}

const updateUser = debug => {
  const query = 'UPDATE users SET full_name = ?, email = ?, password = ?, rol_id = ? WHERE id = ?'
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
