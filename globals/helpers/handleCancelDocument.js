const types = require('../types')

// req.body: { document_id, cancel_reason, related_internal_document_id }

const handleCancelDocument = async (req, res) => {
  const { document_id, cancel_reason, related_internal_document_id } = req.body

  await res.connection.query(cancelDocument(), [cancel_reason, req.currentUser.user_id, document_id])

  if (related_internal_document_id)
    await res.connection.query(cancelDocument(), [cancel_reason, req.currentUser.user_id, related_internal_document_id])

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id }, message: 'Documento cancelado exitosamente' },
  }
}

const cancelDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.CANCELLED}', cancel_reason = ?, updated_by = ? WHERE id = ?
`

module.exports = handleCancelDocument
