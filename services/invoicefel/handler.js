const { mysqlConfig, helpers } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const axios = require(`axios`)
const moment = require(`moment-timezone`)
const mysql = require(`mysql2/promise`)
const { v4: uuidv4 } = require(`uuid`)
const { buildXml, handleRequest, handleResponse } = helpers
const { createInvoiceFelLogDocument } = require('./storage')
const db = mysqlConfig(mysql)

module.exports.create = async (event, context) => {
  try {
    const { body } = await handleRequest({ event })

    if (!body) throw new Error('Missing body')

    const xml = buildXml(body, moment)

    const response = await axios.post(process.env.CERTIFIER_URL, xml, {
      headers: {
        UsuarioFirma: process.env.SIGNATURE_USER_SAT,
        LlaveFirma: process.env.SIGNATURE_KEY_SAT,
        UsuarioApi: process.env.API_USER_SAT,
        LlaveApi: process.env.API_KEY_SAT,
        identificador: `${process.env.IDENTIFIER_SAT}${uuidv4()}`,
      },
    })

    if (!response && !response.data) throw new Error('The request to the SAT certification service has failed.')

    const { data } = response
    const { cantidad_errores, serie, numero, xml_certificado,descripcion } = data

    const dbValues = [
      cantidad_errores > 0 ? '' : xml_certificado,
      xml,
      cantidad_errores > 0 ? 'ERROR' : 'NO ERRORS',
      JSON.stringify(data),
      cantidad_errores > 0 ? '' : numero,
      cantidad_errores > 0 ? '' : serie,
      body.invoice.created_by,
    ]

    const res = await db.transaction(async connection => {
      await connection.query(createInvoiceFelLogDocument(), dbValues, false)      
      return { statusCode: 201, data, message:  (cantidad_errores > 0 ? descripcion :'SUCCESSFUL') }
    })

    return await handleResponse({ req: {}, res })
  } catch (error) {
    console.log('invoicefel Errors', error)
    return await handleResponse({ error })
  }finally{

  }
}

