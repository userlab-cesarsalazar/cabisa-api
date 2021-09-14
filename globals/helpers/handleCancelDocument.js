const types = require('../types')

// res.requireCancelMovements: boolean

// req.body: { document_id, cancel_reason, related_internal_document_id, operation_id }

const handleCancelDocument = async (req, res) => {
  const { document_id, cancel_reason, related_internal_document_id, operation_id, updated_by = 1 } = req.body
  const { requireCancelMovements = true } = res

  await res.connection.query(cancelDocument(), [cancel_reason, updated_by, document_id])

  if (related_internal_document_id) await res.connection.query(cancelDocument(), [cancel_reason, updated_by, related_internal_document_id])

  if (operation_id && requireCancelMovements) await res.connection.query(cancelInventoryMovements(), [operation_id])

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id }, message: 'Documento cancelado exitosamente' },
  }
}

const cancelDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.CANCELLED}', cancel_reason = ?, updated_by = ? WHERE id = ?
`

const cancelInventoryMovements = () => `
  UPDATE inventory_movements SET status = '${types.documentsStatus.CANCELLED}' WHERE operation_id = ?
`

module.exports = handleCancelDocument
