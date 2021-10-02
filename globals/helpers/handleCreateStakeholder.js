const types = require('../types')

const handleCreateStakeholder = async (req, res) => {
  const { stakeholder_id, stakeholder_type, email, alternative_phone, business_man, payments_man, credit_limit } = req.body
  const name = req.body.stakeholder_name || req.body.name
  const address = req.body.stakeholder_address || req.body.address
  const nit = req.body.stakeholder_nit || req.body.nit
  const phone = req.body.stakeholder_phone || req.body.phone

  if (stakeholder_id) return { req, res }

  await res.connection.query(createStakeholder(), [
    stakeholder_type,
    name,
    address,
    nit,
    email,
    phone,
    alternative_phone,
    business_man,
    payments_man,
    credit_limit,
    req.currentUser.user_id,
  ])

  const stakeholderId = await res.connection.geLastInsertId()

  return {
    req: { ...req, body: { ...req.body, stakeholder_id: stakeholderId } },
    res: { ...res, statusCode: 201, data: { stakeholder_id: stakeholderId }, message: 'Registro creado exitosamente' },
  }
}

const createStakeholder = () => `
  INSERT INTO stakeholders
  (stakeholder_type, status, name, address, nit, email, phone, alternative_phone, business_man, payments_man, credit_limit, created_by)
  VALUES(?, '${types.stakeholdersStatus.ACTIVE}', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

module.exports = handleCreateStakeholder
