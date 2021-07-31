const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}, initCondition = `u.is_active = 1`) => `
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.sales_commission,
    u.rol_id,
    r.name AS rol_name,
    u.permissions AS permissions
  FROM users u
  INNER JOIN roles r ON r.id = u.rol_id
  WHERE ${initCondition} ${getWhereConditions({ fields, tableAlias: 'u' })}
`

const findRoles = (fields = {}, initCondition = `is_active = 1`) => `
  SELECT id, name
  FROM roles
  WHERE ${initCondition} ${getWhereConditions({ fields })}
`

const checkExists = (fields = {}) => `SELECT id, email, password FROM users ${getWhereConditions({ fields, hasPreviousConditions: false })}`

const createUser = () => `
  INSERT INTO users (full_name, password, email, sales_commission, rol_id, is_active, permissions)
  VALUES(?, ?, ?, ?, ?, 1, (SELECT permissions FROM roles WHERE id = ?))
`

const updatePermissions = (newPermissions, id) => `UPDATE users SET permissions = '${newPermissions}' WHERE id = ${id}`

const findPassword = () => `SELECT password FROM users WHERE id = ?`

const updatePassword = () => `UPDATE users SET password = ? WHERE id = ?`

const updateUser = () => `UPDATE users SET full_name = ?, email = ?, sales_commission = ?, rol_id = ? WHERE id = ?`

const deleteUser = () => `UPDATE users SET is_active = 0 WHERE id = ?`

module.exports = {
  createUser,
  deleteUser,
  findAllBy,
  findPassword,
  findRoles,
  updatePassword,
  updatePermissions,
  updateUser,
  checkExists,
}
