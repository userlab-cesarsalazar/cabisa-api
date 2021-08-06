const cryptoHelpers = crypto => {
  const encrypt = (text, encryptionKey) => crypto.AES.encrypt(text, encryptionKey).toString()

  const decrypt = (ciphertext, encryptionKey) => crypto.AES.decrypt(ciphertext, encryptionKey).toString(crypto.enc.Utf8)

  return { encrypt, decrypt }
}

function ValidatorException(errors = null) {
  this.statusCode = 400
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
      .trim()
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

const getPaginationSQL = fields => {
  const operators = {
    $limit: 'LIMIT',
    $offset: 'OFFSET',
  }

  const sortedFields = Object.keys(fields)
    .sort()
    .reduce((r, k) => ({ ...r, [k]: fields[k] }), {})

  return Object.keys(sortedFields).reduce(
    (r, k) => {
      if (operators[k]) return { ...r, paginationSQL: `${r.paginationSQL}${operators[k]} ${fields[k]} ` }

      return { ...r, whereConditionsFields: { ...r.whereConditionsFields, [k]: fields[k] } }
    },
    { whereConditionsFields: {}, paginationSQL: '' }
  )
}

// todos los operadores tienen esta sintaxis $like:, $ como prefijo y : como marcador del fin del/los operador(es)
// para usar los operadores se deben pasar como prefijo en el valor del query param
// ademas existe el operador $or que es el unico que se puede usar en conjunto con otro operador -> $like$or:
const getWhereConditions = ({ fields = {}, tableAlias = '', hasPreviousConditions = true }) => {
  const operators = {
    $eq: '=',
    $ne: '<>',
    $gt: '>',
    $gte: '>=',
    $lt: '<',
    $lte: '<=',
    $like: 'LIKE',
    $notlike: 'NOT LIKE',
  }

  const { whereConditionsFields, paginationSQL } = getPaginationSQL(fields)

  const whereConditions = Object.keys(whereConditionsFields).flatMap((k, i) => {
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

    if (!operators[paramOperator]) throw new Error(`The provided operator doesn't exists`)

    const previousCondition = !hasPreviousConditions && i === 0 ? 'WHERE ' : prefixOperator
    const field = tableAlias ? `${tableAlias}.${k}` : k

    return ` ${previousCondition} ${field} ${operators[paramOperator]} '${value}'`
  })

  return `${whereConditions.join('')} ${paginationSQL}`
}

const groupJoinResult = ({ data, nestedFieldsKeys, uniqueKey = ['id'] }) => {
  if (!nestedFieldsKeys) throw new Error('The argument nestedFieldsKeys is required in groupJoinResult')

  if (!data || !data[0]) return []

  const nestedFieldFlag = '__'

  const groupByValues = data.reduce((result, row) => {
    const isDuplicate = result && result.some(r => uniqueKey.every(uk => r[uk] === row[uk]))

    const groupByValue = uniqueKey.reduce((r, k) => ({ ...r, [k]: row[k] }), {})

    if (isDuplicate) return result
    else return [...result, groupByValue]
  }, [])

  const nestedFieldsValues = data.map(row => {
    return Object.keys(row).reduce((rr, rk) => {
      const isUniqueKey = uniqueKey.some(uk => uk === rk)
      if (isUniqueKey) return { ...rr, [rk]: row[rk] }

      const [keys] = nestedFieldsKeys.flatMap(nfk =>
        rk.indexOf(`${nfk}${nestedFieldFlag}`) === 0 ? { fieldKey: nfk, nestedKey: `${rk.replace(`${nfk}${nestedFieldFlag}`, '')}` } : []
      )
      if (keys) return { ...rr, [keys.fieldKey]: { ...rr[keys.fieldKey], [keys.nestedKey]: row[rk] } }

      return rr
    }, {})
  })

  const dataWithoutNestedFields = data.map(row => {
    return Object.keys(row).reduce((rr, rk) => {
      const isNestedFieldKey = nestedFieldsKeys.some(nfk => rk.indexOf(`${nfk}${nestedFieldFlag}`) === 0)

      if (isNestedFieldKey) return rr
      else return { ...rr, [rk]: row[rk] }
    }, {})
  })

  const dataWithoutDuplicates = dataWithoutNestedFields.reduce((result, row) => {
    const isDuplicate = result && result.some(r => uniqueKey.every(uk => r[uk] === row[uk]))

    if (isDuplicate) return result
    else return [...result, row]
  }, [])

  return groupByValues.map(groupBy => {
    const data = dataWithoutDuplicates.find(data => Object.keys(groupBy).every(gbk => groupBy[gbk] === data[gbk]))

    return nestedFieldsValues.reduce((result, value) => {
      const isSameGroup = Object.keys(groupBy).every(gbk => groupBy[gbk] === value[gbk])

      if (isSameGroup) {
        return nestedFieldsKeys.reduce((nestedResult, fieldKey) => {
          const fieldValue = nestedResult[fieldKey] || []

          return { ...nestedResult, [fieldKey]: [...fieldValue, value[fieldKey]] }
        }, result)
      }

      return result
    }, data)
  })
}

const calculateProductTaxes = (products, productsStocks) => {
  return products.map(p => {
    const sameProduct = productsStocks.find(ps => Number(ps.product_id) === Number(p.product_id)) || {}
    const product_price = p && p.product_price > 0 ? p.product_price : sameProduct.product_price

    return {
      ...sameProduct,
      ...p,
      product_price,
      tax_fee: sameProduct.tax_fee,
      unit_tax_amount: product_price * (sameProduct.tax_fee / 100),
    }
  })
}

const getFormattedDates = dates =>
  Object.keys(dates).reduce(
    (r, k) => ({
      ...r,
      [k]: dates[k] ? dates[k].replace(/T/i, ' ').replace(/Z/i, '') : null,
    }),
    {}
  )

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
  calculateProductTaxes,
  cryptoHelpers,
  decorate,
  escapeFields,
  getError,
  getFormattedDates,
  getWhereConditions,
  groupJoinResult,
  isEmail,
  isEmptyObject,
  validate,
  removeEmpty,
  ValidatorException,
}
