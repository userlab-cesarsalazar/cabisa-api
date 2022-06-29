//const mysql = require('mysql2/promise')
//const storage = require('./storage')
//const db = mysqlConfig(mysql)
const axios = require('../../layers/nodejs/node_modules/axios')
const moment = require('../../layers/nodejs/node_modules/moment-timezone')
const helpers = require('../../globals/helpers')
const { buildXml, handleRequest, handleResponse, handleRead } = helpers

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
        identificador: process.env.IDENTIFIER_SAT,
      },
    })

    if (!response && !response.data) throw new Error('The request to the SAT certification service has failed.')

    const res = { statusCode: 200, data: response.data, message: 'Successful response' }

    return await handleResponse({ req: {}, res })
  } catch (error) {
    console.log('invoicefel Errors', error)
    return await handleResponse({ error })
  }
}
