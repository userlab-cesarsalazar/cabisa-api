'use strict'
const { response, getBody } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)

module.exports.create = async event => {
  try {
    const body = getBody(event)

    return await response(200, { body }, null)
  } catch (e) {
    console.error(e, '<--- error')
    return await response(400, { message: e }, null)
  }
}
