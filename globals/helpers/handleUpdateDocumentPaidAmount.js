// req.body: { document_id, paid_credit_amount }

const handleUpdateDocumentPaidAmount = async (req, res) => {
  const { document_id, paid_credit_amount } = req.body

  await res.connection.query(updateDocumentPaidAmount(), [paid_credit_amount, document_id])

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id, paid_credit_amount }, message: 'Monto de credito pagado actualizado exitosamente' },
  }
}

const updateDocumentPaidAmount = () => `UPDATE documents SET paid_credit_amount = ? WHERE id = ?`

module.exports = handleUpdateDocumentPaidAmount
