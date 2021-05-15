const { decorate } = require('../common')

const groupJoinResult = ({ data, nestedFieldsKeys, uniqueKey = ['id'] }) => {
  if (!data || data.length === 0 || !nestedFieldsKeys) return data

  const nestedFieldFlag = '__'

  const groupByValues = data.reduce((result, row) => {
    const isDuplicate = result?.some(r => uniqueKey.every(uk => r[uk] === row[uk]))

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
    const isDuplicate = result?.some(r => uniqueKey.every(uk => r[uk] === row[uk]))

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

const addLog =
  fn =>
  async (req, { debug = false, debugKey = 'data', ...res }) => {
    const result = await fn(req, { ...res, debug })

    if (debug) console.log(result)

    return result
  }

const addGroupJoinResult =
  fn =>
  async (req, { nestedFieldsKeys, uniqueKey, data, ...res }) => {
    const groupedData = groupJoinResult({ data: data, nestedFieldsKeys, uniqueKey })

    return await fn(req, { ...res, nestedFieldsKeys, uniqueKey, statusCode: 200, data: groupedData })
  }

const addFindBy =
  fn =>
  async (req, { storage, dbQuery, ...res }) => {
    const data = await dbQuery(storage.findAllBy(req.query))

    return await fn(req, { ...res, storage, dbQuery, statusCode: 200, data })
  }

const baseFunction = async (req, res) => res

module.exports = decorate(baseFunction)(addLog, addGroupJoinResult, addFindBy)
