const { types, getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)

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

  module.exports.createDebitCreditLogDocument = () => `
  INSERT INTO documents_debit_credit_notes (document_type,
    stakeholder_id,
    related_bill_document_number,
    related_bill_uuid,
    related_bill_serie,
    adjustment_reason,
    response_pdf,
    request,
    error,
    response_json,
    serie,
    uuid,
    document_number,
    created_by,request_detail)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`

module.exports.getDebitCreditNotes = (fields = {}) => {
  const rawWhereConditions = getWhereConditions({ fields, tableAlias: 'd' })  
  const whereConditions = rawWhereConditions.replace(/d.nit/i, 's.nit').replace(/d.name/i, 's.name').replace(/d.start_date/i, 'DATE(dcn.created_at)').replace(/d.end_date/i, 'DATE(dcn.created_at)').replace(/d.related_bill_document_number/i,'dcn.related_bill_document_number')
  return `
  select
      s.id,
      s.name AS stakeholder_name,
      s.nit AS stakeholder_nit,
      s.email AS stakeholder_email,
      s.phone AS stakeholder_phone,
      s.address AS stakeholder_address,
      dcn.id,
      dcn.document_type,
      dcn.related_bill_document_number,
      dcn.related_bill_serie,
      dcn.related_bill_uuid,
      dcn.adjustment_reason,
      dcn.document_number,
      dcn.serie,
      dcn.uuid,
      dcn.created_by,
      dcn.created_at
from documents_debit_credit_notes dcn
JOIN stakeholders s ON s.id = dcn.stakeholder_id
    WHERE (1 = 1) 
    ${whereConditions}
    and error = 'NO ERRORS'
    ORDER BY s.id DESC
  `
}
