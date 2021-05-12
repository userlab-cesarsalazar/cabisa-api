const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)

const findAllBy = (fields = {}, initWhereCondition = `status = 'ACTIVE'`) => `
  SELECT id, stakeholder_type, status, name, address, nit, email, phone, alternative_phone, business_man, payments_man,block_reason, created_at, created_by, updated_at, updated_by
  FROM stakeholders
  WHERE ${initWhereCondition} ${getWhereConditions({ fields })}
`

const createStakeholder = () => `
  INSERT INTO stakeholders
  (stakeholder_type, status, name, address, nit, email, phone, alternative_phone, business_man, payments_man, created_by)
  VALUES(?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const updateStakeholder = () => `
  UPDATE stakeholders
  SET name = ?, address = ?, nit = ?, email = ?, phone = ?, alternative_phone = ?, business_man = ?, payments_man = ?, updated_by = ?
  WHERE id = ?
`

const setStatusStakeholder = () => 'UPDATE stakeholders SET status = ?, block_reason = ?, updated_by = ? WHERE id = ?'

module.exports = {
  createStakeholder,
  findAllBy,
  setStatusStakeholder,
  updateStakeholder,
}
