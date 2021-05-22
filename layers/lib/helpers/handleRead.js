const { groupJoinResult, decorate } = require('../common')

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
