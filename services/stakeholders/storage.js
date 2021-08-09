const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}, initWhereCondition = `(p.is_active = 1 OR p.is_active IS NULL)`) => `
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
    s.credit_limit,
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
  WHERE ${initWhereCondition} ${getWhereConditions({ fields, tableAlias: 's' })}
  ORDER BY s.id DESC
`

const findStakeholderTypes = () => `DESCRIBE stakeholders stakeholder_type`

const findOptionsBy = (fields = {}, initWhereCondition = `status = 'ACTIVE'`) => `
  SELECT id, stakeholder_type, name, address, phone, business_man, address, email, nit
  FROM stakeholders
  WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const findProjectsOptionsBy = (fields = {}, initWhereCondition = `is_active = 1`) => `
  SELECT id, name FROM projects WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
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
    credit_limit = ?,
    updated_by = ?
  WHERE id = ?
`

const setStatusStakeholder = () => 'UPDATE stakeholders SET status = ?, block_reason = ?, updated_by = ? WHERE id = ?'

const deleteProjects = projectIds => `
  UPDATE projects SET is_active = 0 WHERE stakeholder_id = ? AND id IN (${projectIds.join(', ')})
`

const crupdateProjects = valuesArray => `
  INSERT INTO projects (id, stakeholder_id, start_date, end_date, name, created_by)
  VALUES ${valuesArray.join(', ')}
  ON DUPLICATE KEY UPDATE
    start_date = VALUES(start_date),
    end_date = VALUES(end_date),
    name = VALUES(name),
    created_by = VALUES(created_by)
`

module.exports = {
  checkExists,
  crupdateProjects,
  deleteProjects,
  findAllBy,
  findOptionsBy,
  findProjectsOptionsBy,
  findStakeholderTypes,
  setStatusStakeholder,
  updateStakeholder,
}
