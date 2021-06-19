const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}) => `
  SELECT
    id,
    stakeholder_id,
    name,
    start_date,
    end_date,
    created_at,
    created_by,
    updated_at,
    updated_by
  FROM projects
  ${getWhereConditions({ fields, hasPreviousConditions: false })}
`

const findOptionsBy = (fields = {}) => `
  SELECT id, name FROM projects ${getWhereConditions({ fields, hasPreviousConditions: false })}
`

const checkExists = (fields = {}) => `
  SELECT id FROM projects ${getWhereConditions({ fields, hasPreviousConditions: false })}
`

const createProject = () => `
  INSERT INTO projects (stakeholder_id, name, start_date, end_date, created_by)
  VALUES (?, ?, ?, ?, ?)
`

const checkExistsOnUpdate = () => `
  SELECT p.id
  FROM projects p
  WHERE p.name = ? AND p.stakeholder_id = (
    SELECT subp.stakeholder_id
    FROM projects subp
    WHERE subp.id = ?
  )
`

const updateProject = () => `
  UPDATE projects SET name = ?, start_date = ?, end_date = ?, updated_by = ? WHERE id = ?
`

const deleteProject = () => `DELETE FROM projects WHERE id = ?`

module.exports = {
  checkExists,
  checkExistsOnUpdate,
  createProject,
  deleteProject,
  findAllBy,
  findOptionsBy,
  updateProject,
}
