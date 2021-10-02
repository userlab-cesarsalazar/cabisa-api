// req.body: { stakeholder_id, total_credit, paid_credit }

const handleUpdateStakeholderCredit = async (req, res) => {
  const { stakeholder_id, total_credit, paid_credit } = req.body

  await res.connection.query(updateCredit(), [total_credit, paid_credit, req.currentUser.user_id, stakeholder_id])

  return {
    req,
    res: { ...res, statusCode: 200, data: { stakeholder_id, total_credit, paid_credit }, message: 'Credito actualizado exitosamente' },
  }
}

const updateCredit = () => `UPDATE stakeholders SET total_credit = ?, paid_credit = ?, updated_by = ? WHERE id = ?`

module.exports = handleUpdateStakeholderCredit
