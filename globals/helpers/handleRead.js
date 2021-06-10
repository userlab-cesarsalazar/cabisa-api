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

    if (row?.Type?.substring(0, 5).toLowerCase() === 'enum(') {
      const enumValues = row.Type.substring(5, row.Type.length - 1).split(',')
      const result = enumValues.map(d => d.replaceAll(/'/gi, '').trim())

      return await fn(req, { ...res, data: result })
    }

    return await fn(req, { ...res, data })
  }

const addGroupJoinResult =
  fn =>
  async (req, { nestedFieldsKeys, uniqueKey, data, ...res }) => {
    const groupedData = groupJoinResult({ data: data, nestedFieldsKeys, uniqueKey })

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
