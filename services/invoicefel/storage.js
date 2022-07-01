module.exports.createInvoiceFelLogDocument = () => `
  INSERT INTO log_documents (response_pdf, request, error, response_json, document_id, serie, created_by)
  VALUES(?, ?, ?, ?, ?, ?, ?)
`
