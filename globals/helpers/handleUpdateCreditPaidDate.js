const { getFormattedDates } = require('../common')

// req.body: { document_id, creditPaidDate, related_internal_document_id }

const handleUpdateCreditPaidDate = async (req, res) => {
  const { document_id, creditPaidDate, related_internal_document_id } = req.body

  const { credit_paid_date } = getFormattedDates({ credit_paid_date: creditPaidDate })

  await res.connection.query(updateCreditPaidDate(), [credit_paid_date, document_id])
  if (related_internal_document_id) await res.connection.query(updateCreditPaidDate(), [credit_paid_date, related_internal_document_id])

  return {
    req,
    res: {
      ...res,
      statusCode: 200,
      data: { document_id, credit_paid_date: creditPaidDate },
      message: 'Fecha de pago de credito actualizada exitosamente',
    },
  }
}

const updateCreditPaidDate = () => `UPDATE documents SET credit_paid_date = ? WHERE id = ?`

module.exports = handleUpdateCreditPaidDate
