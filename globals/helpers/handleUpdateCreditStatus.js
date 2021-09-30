// req.body: { credit_status, document_id, related_internal_document_id }

const handleUpdateCreditStatus = async (req, res) => {
  const { credit_status, document_id, related_internal_document_id } = req.body

  await res.connection.query(updateCreditStatus(), [credit_status, document_id])

  if (related_internal_document_id) await res.connection.query(updateCreditStatus(), [credit_status, related_internal_document_id])

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id, credit_status }, message: 'Estado de credito actualizado exitosamente' },
  }
}

const updateCreditStatus = () => `UPDATE documents SET credit_status = ? WHERE id = ?`

module.exports = handleUpdateCreditStatus
