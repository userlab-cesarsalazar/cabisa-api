module.exports.createInvoiceFelLogDocument = () => `
  INSERT INTO log_documents (response_pdf, request, error, response_json, document_id, serie, created_by,uuid)
  VALUES(?, ?, ?, ?, ?, ?, ?, ?)
`

module.exports.findByDocumentId = (id) => {    
  return`
  select response_pdf from log_documents
  where document_id = '${id}';
  `
}


module.exports.parseToJson = async (xml, xml2js) =>
  await new Promise(((resolve, reject) => {
    xml2js.parseString(xml, { mergeAttrs: true }, (err, result) => {
      if (err) {
        reject(err);
      }
      const json = JSON.parse(JSON.stringify(result, null, 2));
      resolve(json)
    });
  }))