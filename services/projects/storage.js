const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

const findAllBy = (fields = {}) => `
  SELECT
    id,
    stakeholder_id,
    status,
    name,
    description,
    start_date,
    end_date,
    business_man,
    created_at,
    created_by,
    updated_at,
    updated_by
  FROM projects
  ${getWhereConditions({ fields, hasPreviousConditions: false })}
`

const findOptionsBy = (fields = {}) => `
  SELECT id, name
  FROM projects
  ${getWhereConditions({ fields, hasPreviousConditions: false })}
`

const findProjectsStatus = () => `DESCRIBE projects status`

module.exports = {
  findAllBy,
  findOptionsBy,
  findProjectsStatus,
}
