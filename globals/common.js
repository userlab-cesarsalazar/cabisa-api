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

const escapeFields = (data = {}, fieldsToExclude = []) => {
  const escapeStr = str => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\\/g, '\\\\')
      .replace(/\$/g, '\\$')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
  }

  let escapedBody = {}

  Object.keys(data).forEach(
    k => (escapedBody[k] = fieldsToExclude.length > 0 && fieldsToExclude.some(fte => fte === k) ? data[k] : escapeStr(data[k]))
  )

  return escapedBody
}

// todos los operadores tienen esta sintaxis $like:, $ como prefijo y : como marcador del fin del/los operador(es)
// para usar los operadores se deben pasar como prefijo en el valor del query param
// ademas existe el operador $or que es el unico que se puede usar en conjunto con otro operador -> $like$or:
const getWhereConditions = ({ fields, tableName, hasPreviousConditions }) => {
  const operators = {
    $eq: '=',
    $ne: '!=',
    $gt: '>',
    $gte: '>=',
    $lt: '<',
    $lte: '<=',
    $like: 'LIKE',
    $notlike: 'NOT LIKE',
  }

  const whereConditions = Object.keys(fields).flatMap(k => {
    if (!fields[k]) return []

    const prefixOperator = fields[k].indexOf('\\$or') > -1 ? 'OR' : 'AND'
    let paramOperator = '$eq'
    let value = fields[k]

    if (fields[k][0] === '\\' && fields[k][1] === '$' && fields[k].indexOf(':') > -1) {
      paramOperator = fields[k].substring(1, fields[k].indexOf(':'))
      paramOperator = paramOperator.replace('$or\\', '')
      paramOperator = paramOperator.replace('\\$or', '')
    }

    if (fields[k][0] === '\\' && fields[k][1] === '$' && fields[k].indexOf(':') > -1) {
      value = fields[k].substring(fields[k].indexOf(':') + 1)
    }

    return ` ${hasPreviousConditions ? prefixOperator : ''} ${tableName ? `${tableName}.${k}` : k} ${operators[paramOperator]} '${value}'`
  })

  return whereConditions.join('')
}

const getLastId = () => 'SELECT LAST_INSERT_ID() AS "id"'

const validateEmail = email => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const getError = e => e.error || e.errors || e.data || e.message || e

module.exports = {
  escapeFields,
  getBody,
  getError,
  getLastId,
  getWhereConditions,
  response,
  validate,
  validateEmail,
  removeEmpty,
}
