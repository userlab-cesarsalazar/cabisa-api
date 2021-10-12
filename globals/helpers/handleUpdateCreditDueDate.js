const { getFormattedDates } = require('../common')

// req.body: { document_id, credit_days, created_at }

const handleUpdateCreditDueDate = async (req, res) => {
  const { document_id, credit_days = 0 } = req.body

  const [[{ created_at }]] = req.body.created_at
    ? [[{ created_at: req.body.created_at }]]
    : await res.connection.query(getCreationDate(), [document_id])

  const creditDaysInMiliseconds = 1000 * 3600 * 24 * credit_days
  const dueDateInMiliseconds = new Date(created_at).getTime() + creditDaysInMiliseconds
  const { credit_due_date } = getFormattedDates({ credit_due_date: new Date(dueDateInMiliseconds).toISOString() })

  await res.connection.query(updateCreditDueDate(), [credit_due_date, document_id])

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id, credit_due_date }, message: 'Fecha de vencimiento de credito actualizada exitosamente' },
  }
}

const updateCreditDueDate = () => `UPDATE documents SET credit_due_date = ? WHERE id = ?`

const getCreationDate = () => `SELECT created_at FROM documents WHERE id = ?`

module.exports = handleUpdateCreditDueDate
