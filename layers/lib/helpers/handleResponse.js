const { getError } = require('../common')

const handleResponse = async data => {
  let body
  let statusCode

  if (data.error) {
    body = { error: getError(data.error) }
    statusCode = data.error.statusCode || 400
  } else {
    if (!data.res?.data || !data.res?.statusCode) throw new Error('The response must include data and statusCode')

    if (data.req?.httpMethod !== 'GET' && !data.res?.message) throw new Error('The response for non GET requests must include a "message" key')

    statusCode = data.res.statusCode

    if (data.req.httpMethod === 'GET') body = data.res.data
    else body = { data: data.res.data, message: data.res.message }
  }

  return new Promise(resolve => {
    resolve({
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(body),
    })
  })
}

module.exports = handleResponse
