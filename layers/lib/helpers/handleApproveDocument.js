const types = require('../types')

// req.body: { document_id, related_internal_document_id, related_external_document_id }

const handleApproveDocument = async (req, res) => {
  const { document_id, related_internal_document_id, related_external_document_id, updated_by = 1 } = req.body

  if (related_external_document_id) {
    await res.connection.query(approveAndRelateExternalDocument(), [req.body.operation_id, related_external_document_id, updated_by, document_id])
  }

  if (related_internal_document_id) {
    await res.connection.query(approveAndRelateInternalDocument(), [req.body.operation_id, related_internal_document_id, updated_by, document_id])

    await res.connection.query(approveAndRelateInternalDocument(), [req.body.operation_id, document_id, updated_by, related_internal_document_id])
  }

  return {
    req: { ...req, body: { ...req.body, operation_id: req.body.operation_id } },
    res: {
      ...res,
      statusCode: 200,
      data: { operation_id: req.body.operation_id, document_id, related_internal_document_id, related_external_document_id },
      message: 'Document approved successfully',
    },
  }
}

const approveAndRelateExternalDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.APPROVED}', operation_id = ?, related_external_document_id = ?, updated_by = ? WHERE id = ?
`

const approveAndRelateInternalDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.APPROVED}', operation_id = ?, related_internal_document_id = ?, updated_by = ? WHERE id = ?
`

module.exports = handleApproveDocument
