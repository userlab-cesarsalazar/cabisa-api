function ValidatorException(errors = null) {
  this.statusCode = 402
  this.message = {
    errors,
    message: 'Invalid request data',
  }
  this.toString = function () {
    return this.statusCode + this.message
  }
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

const isEmail = email => {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const isEmptyObject = obj => {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      return false
    }
  }

  return JSON.stringify(obj) === JSON.stringify({})
}

const getError = e => e.error || e.errors || e.data || e.message || e

const response = async data => {
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

// todos los operadores tienen esta sintaxis $like:, $ como prefijo y : como marcador del fin del/los operador(es)
// para usar los operadores se deben pasar como prefijo en el valor del query param
// ademas existe el operador $or que es el unico que se puede usar en conjunto con otro operador -> $like$or:
const getWhereConditions = ({ fields, tableAlias, hasPreviousConditions = true }) => {
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

  const whereConditions = Object.keys(fields).flatMap((k, i) => {
    const fieldValue = fields[k] && String(fields[k])

    if (!fieldValue) return []

    const prefixOperator = fieldValue.indexOf('\\$or') > -1 ? 'OR' : 'AND'
    let paramOperator = '$eq'
    let value = fieldValue

    if (fieldValue[0] === '\\' && fieldValue[1] === '$' && fieldValue.indexOf(':') > -1) {
      paramOperator = fieldValue.substring(1, fieldValue.indexOf(':'))
      paramOperator = paramOperator.replace('$or\\', '')
      paramOperator = paramOperator.replace('\\$or', '')
    }

    if (fieldValue[0] === '\\' && fieldValue[1] === '$' && fieldValue.indexOf(':') > -1) {
      value = fieldValue.substring(fieldValue.indexOf(':') + 1)
    }

    return ` ${!hasPreviousConditions && i === 0 ? 'WHERE ' : prefixOperator} ${tableAlias ? `${tableAlias}.${k}` : k} ${
      operators[paramOperator]
    } '${value}'`
  })

  return whereConditions.join('')
}

const decorate =
  (...functionsToDecorate) =>
  (...decoratorFunctions) => {
    const result = functionsToDecorate.map(baseFn => {
      return decoratorFunctions.reduce((fn, decorator) => decorator(fn), baseFn)
    })

    if (result.length === 1) return result[0]

    return result
  }

module.exports = {
  decorate,
  escapeFields,
  getError,
  getWhereConditions,
  response,
  validate,
  isEmail,
  isEmptyObject,
  ValidatorException,
  removeEmpty,
}
