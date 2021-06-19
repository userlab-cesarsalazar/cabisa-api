const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}) => `
  SELECT 
    s.id,
    s.stakeholder_type,
    s.status,
    s.name,
    s.address,
    s.nit,
    s.email,
    s.phone,
    s.alternative_phone,
    s.business_man,
    s.payments_man,
    s.block_reason,
    s.created_at,
    s.created_by,
    s.updated_at,
    s.updated_by,
    p.id AS projects__id,
    p.name AS projects__name,
    p.start_date AS projects__start_date,
    p.end_date AS projects__end_date,
    p.created_at AS projects__created_at
  FROM stakeholders s
  LEFT JOIN projects p ON p.stakeholder_id = s.id
  ${getWhereConditions({ fields, tableAlias: 's', hasPreviousConditions: false })}
`

const findStakeholderTypes = () => `DESCRIBE stakeholders stakeholder_type`

const findOptionsBy = (fields = {}, initWhereCondition = `status = 'ACTIVE'`) => `
  SELECT id, stakeholder_type, name, address, phone, business_man, address, email, nit
  FROM stakeholders
  WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const findProjectsOptionsBy = (fields = {}) => `
  SELECT id, name FROM projects ${getWhereConditions({ fields, hasPreviousConditions: false })}
`

const checkExists = (fields = {}, initWhereCondition = `status = 'ACTIVE'`) => `
  SELECT id FROM stakeholders WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const updateStakeholder = () => `
  UPDATE stakeholders
  SET
    stakeholder_type = ?,
    name = ?,
    address = ?,
    nit = ?,
    email = ?,
    phone = ?,
    business_man = ?,
    payments_man = ?,
    updated_by = ?
  WHERE id = ?
`

const setStatusStakeholder = () => 'UPDATE stakeholders SET status = ?, block_reason = ?, updated_by = ? WHERE id = ?'

const deleteProjects = projectIds => `DELETE FROM projects WHERE stakeholder_id = ? AND id IN (${projectIds.join(', ')})`

const updateProjects = () => `UPDATE projects SET start_date = ?, end_date = ?, name = ?, updated_by = ? WHERE stakeholder_id = ? AND id = ?`

const createProjects = createProjectValues => `
  INSERT INTO projects (stakeholder_id, start_date, end_date, name, created_by)
  VALUES ${createProjectValues.join(', ')}
`

module.exports = {
  checkExists,
  createProjects,
  deleteProjects,
  findAllBy,
  findOptionsBy,
  findProjectsOptionsBy,
  findStakeholderTypes,
  setStatusStakeholder,
  updateProjects,
  updateStakeholder,
}
