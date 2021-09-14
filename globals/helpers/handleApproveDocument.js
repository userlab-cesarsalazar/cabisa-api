const types = require('../types')
// res.keepStatus: types.documentsStatus

// req.body: { document_id, operation_id, related_internal_document_id, related_external_document_id }

const handleApproveDocument = async (req, res) => {
  const { operation_id, document_id, related_internal_document_id = null, related_external_document_id = null, updated_by = 1 } = req.body
  const status = res.keepStatus ? res.keepStatus : types.documentsStatus.APPROVED

  await res.connection.query(approveAndRelateExternalDocument(), [status, operation_id, related_external_document_id, updated_by, document_id])

  if (related_internal_document_id) {
    await res.connection.query(approveAndRelateInternalDocument(), [status, operation_id, related_internal_document_id, updated_by, document_id])

    await res.connection.query(approveAndRelateInternalDocument(), [status, operation_id, document_id, updated_by, related_internal_document_id])
  }

  return {
    req: { ...req, body: { ...req.body, operation_id } },
    res: {
      ...res,
      statusCode: 200,
      data: { operation_id: req.body.operation_id, document_id, related_internal_document_id, related_external_document_id },
      message: 'Documento aprobado exitosamente',
    },
  }
}

const approveAndRelateExternalDocument = () => `
  UPDATE documents SET status = ?, operation_id = ?, related_external_document_id = ?, updated_by = ? WHERE id = ?
`

const approveAndRelateInternalDocument = () => `
  UPDATE documents SET status = ?, operation_id = ?, related_internal_document_id = ?, updated_by = ? WHERE id = ?
`

module.exports = handleApproveDocument
