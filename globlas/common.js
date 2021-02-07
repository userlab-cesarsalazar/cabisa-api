const getBody = event => {
  return event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : JSON.parse(event.Records[0].Sns.Message)
}

const response = async (status, body, connection) => {
  if (connection) await connection.end()

  return new Promise(resolve => {
    resolve({
      statusCode: status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(body),
    })
  })
}

/**
 *
 * @param data
 * @param toValidate
 * @returns {boolean}
 * this function receive an array with the params you wanna validate
 */
const validate = (data, toValidate) => {
  let tmp = toValidate
  let keys = Object.keys(data)

  if (tmp.length !== keys.length) return false

  let p = tmp.filter(x => keys.map(k => x === k))

  if (p.length === tmp.length) return true
  else return false
}
/**
 *
 * @param obj
 * @returns {Array|undefined}
 */
const removeEmpty = obj => {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') {
      const childObject = removeEmpty(obj[key])
      if (childObject === undefined) {
        delete obj[key]
      }
    } else if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
      delete obj[key]
    }
  })
  return Object.keys(obj).length > 0 || obj instanceof Array ? obj : undefined
}

module.exports = {
  getBody,
  response,
  validate,
  removeEmpty,
}
