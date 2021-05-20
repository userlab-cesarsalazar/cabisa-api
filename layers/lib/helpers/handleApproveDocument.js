const handleCreateDocument = require('./handleCreateDocument')
const handleCreateOperation = require('./handleCreateOperation')
const types = require('../types')
const appConfig = require('../appConfig')

const handleApproveDocument = async (req, res) => {
  const { document_id, related_internal_document_id, related_external_document_id, document_type, operation_type, updated_by = 1 } = req.body

  const requireAuthorization = appConfig.documents[document_type].requires.authorization

  if (req.currentAction === types.actions.CREATE && requireAuthorization) return { req, res }

  const onApprove = appConfig.documents[document_type].onApprove
  if (onApprove.documents) {
    const documentCreated = await handleCreateDocument(
      { ...req, body: { ...req.body, document_type: onApprove.documents, related_internal_document_id: document_id } },
      res
    )

    return handleApproveDocument(documentCreated.req, documentCreated.res)
  }

  const operation = onApprove.operations
    ? await handleCreateOperation({ ...req, body: { ...req.body, operation_type: onApprove.operations } }, res)
    : {}

  if (appConfig.operations[operation_type].hasExternalDocument) {
    await res.connection.query(authorizeExternalDocument(), [operation.req.body.operation_id, related_external_document_id, updated_by, document_id])
  }

  if (appConfig.operations[operation_type].finishDocument) {
    await res.connection.query(authorizeInternalDocument(), [operation.req.body.operation_id, related_internal_document_id, updated_by, document_id])
    await res.connection.query(authorizeInternalDocument(), [operation.req.body.operation_id, document_id, updated_by, related_internal_document_id])
  }

  return {
    req: { ...req, body: { ...req.body, operation_id: operation.req.body.operation_id } },
    res: {
      ...res,
      statusCode: 200,
      data: { operation_id: operation.req.body.operation_id, document_id, related_internal_document_id, related_external_document_id },
      message: 'Document authorized successfully',
    },
  }
}

const authorizeExternalDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.APPROVED}', operation_id = ?, related_external_document_id = ?, updated_by = ? WHERE id = ?
`

const authorizeInternalDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.APPROVED}', operation_id = ?, related_internal_document_id = ?, updated_by = ? WHERE id = ?
`

module.exports = handleApproveDocument
