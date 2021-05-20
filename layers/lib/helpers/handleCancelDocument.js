const types = require('../types')
const appConfig = require('../appConfig')

const handleCancelDocument = async (req, res) => {
  const { document_id, cancel_reason, document_type, related_internal_document_id, operation_id, updated_by = 1 } = req.body

  await res.connection.query(cancelDocument(), [cancel_reason, updated_by, document_id])

  if (related_internal_document_id) await res.connection.query(cancelDocument(), [cancel_reason, updated_by, related_internal_document_id])

  const cancelMovements = appConfig.documents[document_type]?.onCancel?.inventory_movements

  if (operation_id && cancelMovements) await res.connection.query(cancelInventoryMovements(), [operation_id])

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id }, message: 'Document cancelled successfully' },
  }
}

const cancelDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.CANCELLED}', cancel_reason = ?, updated_by = ? WHERE id = ?
`

const cancelInventoryMovements = () => `
  UPDATE inventory_movements SET status = '${types.documentsStatus.CANCELLED}' WHERE operation_id = ?
`

module.exports = handleCancelDocument
