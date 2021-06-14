const { groupJoinResult, decorate } = require('../common')

const addLog =
  fn =>
  async (req, { debug = false, debugKey = 'data', ...res }) => {
    const result = await fn(req, { ...res, debug })

    if (debug) console.log(result)

    return result
  }

const addReadEnum =
  fn =>
  async (req, { data, ...res }) => {
    const row = data[0]

    if (row && row.Type && row.Type.substring(0, 5).toLowerCase() === 'enum(') {
      const enumValues = row.Type.substring(5, row.Type.length - 1).split(',')
      const result = enumValues.map(d => d.substring(1, d.length - 1).trim())

      return await fn(req, { ...res, data: result })
    }

    return await fn(req, { ...res, data })
  }

const addGroupJoinResult =
  fn =>
  async (req, { nestedFieldsKeys, uniqueKey, data, ...res }) => {
    const groupedData = nestedFieldsKeys ? groupJoinResult({ data, nestedFieldsKeys, uniqueKey }) : data

    return await fn(req, { ...res, nestedFieldsKeys, uniqueKey, statusCode: 200, data: groupedData })
  }

const addFindBy =
  fn =>
  async (req, { initWhereCondition, storage, dbQuery, ...res }) => {
    const data = await dbQuery(storage(req.query, initWhereCondition))

    return await fn(req, { ...res, storage, dbQuery, statusCode: 200, data })
  }

const baseFunction = async (req, res) => res

module.exports = decorate(baseFunction)(addLog, addReadEnum, addGroupJoinResult, addFindBy)
