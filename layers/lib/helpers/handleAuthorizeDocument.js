const handleCreateDocument = require('./handleCreateDocument')
const handleCreateOperation = require('./handleCreateOperation')
const types = require('../types')
const appConfig = require('../appConfig')

const handleAuthorizeDocument = async (req, res) => {
  const { document_id, related_internal_document_id, related_external_document_id, document_type, operation_type, authorized_by = 1 } = req.body

  const requireAuthorization = appConfig.documents[document_type].requires.authorization

  if (req.currentAction === types.actions.CREATE && requireAuthorization) return { req, res }

  const onAuthorize = appConfig.documents[document_type].onAuthorize
  if (onAuthorize.documents) {
    const documentCreated = await handleCreateDocument(
      { ...req, body: { ...req.body, document_type: onAuthorize.documents, related_internal_document_id: document_id } },
      res
    )

    return handleAuthorizeDocument(documentCreated.req, documentCreated.res)
  }

  const operation = onAuthorize.operations
    ? await handleCreateOperation({ ...req, body: { ...req.body, operation_type: onAuthorize.operations } }, res)
    : {}

  if (appConfig.operations[operation_type].hasExternalDocument) {
    await res.connection.query(res.storage.authorizeExternalDocument(), [
      operation.req.body.operation_id,
      related_external_document_id,
      authorized_by,
      document_id,
    ])
  }

  if (appConfig.operations[operation_type].finishDocument) {
    await res.connection.query(res.storage.authorizeInternalDocument(), [
      operation.req.body.operation_id,
      related_internal_document_id,
      authorized_by,
      document_id,
    ])
    await res.connection.query(res.storage.authorizeInternalDocument(), [
      operation.req.body.operation_id,
      document_id,
      authorized_by,
      related_internal_document_id,
    ])
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

module.exports = handleAuthorizeDocument
