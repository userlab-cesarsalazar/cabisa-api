const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}, initCondition = `u.is_active = 1`) => `
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.rol_id,
    r.name AS rol_name,
    r.permissions AS permissions
  FROM users u
  INNER JOIN roles r ON r.id = u.rol_id
  WHERE ${initCondition} ${getWhereConditions({ fields, tableAlias: 'u', hasPreviousConditions: true })}
`

const checkExists = (fields = {}) => `SELECT id, email FROM users ${getWhereConditions({ fields, hasPreviousConditions: false })}`

const createUser = () => `
  INSERT INTO users (full_name, password, email, rol_id, is_active) VALUES(?, ?, ?, ?, 1)
`

const updateUser = () => `UPDATE users SET full_name = ?, email = ?, rol_id = ? WHERE id = ?`

const deleteUser = () => `UPDATE users SET is_active = 0 WHERE id = ?`

module.exports = {
  createUser,
  deleteUser,
  findAllBy,
  updateUser,
  checkExists,
}
