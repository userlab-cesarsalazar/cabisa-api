const { decorate, escapeFields } = require('../common')

const addLog =
  fn =>
  async ({ debug = false, ...input }, req) => {
    const result = await fn(input, req)

    if (debug) console.log(result)

    return result
  }

const addCurrentModel =
  fn =>
  async ({ dbQuery, storage, initWhereCondition, uniqueKey = ['id'], ...input }, req) => {
    const isInvalid = uniqueKey.some(k => !req.body || !req.body[k])

    if (isInvalid || !dbQuery || !storage) return await fn({ ...input, dbQuery, storage, initWhereCondition, uniqueKey }, req)

    const fields = uniqueKey.reduce((r, k) => ({ ...r, [k]: req.body[k] }), {})
    const [currentModel] = await dbQuery(storage(fields, initWhereCondition))

    return await fn({ ...input, dbQuery, storage, initWhereCondition, uniqueKey }, { ...req, currentModel })
  }

const addQuery = fn => async (input, req) => {
  const rawQuery = (input.event && input.event.queryStringParameters) || {}
  const query = escapeFields(rawQuery)

  return await fn(input, { ...req, query: query })
}

const addBody = fn => async (input, req) => {
  let body = input.event.body
    ? typeof input.event.body === 'string'
      ? JSON.parse(input.event.body)
      : input.event.body
    : input.event.Records && JSON.parse(input.event.Records[0].Sns.Message)

  if (input.inputType) {
    body = Object.keys(input.inputType).reduce((r, k) => {
      const value = body[k] ? body[k] : input.inputType[k].defaultValue

      return { ...r, [k]: value === undefined ? null : value }
    }, {})
  }

  return await fn(input, { ...req, body })
}

const addEvent =
  fn =>
  async (input, req = {}) => {
    return await fn(input, { ...req, ...input.event })
  }

const baseFunction = async (input, req) => req

module.exports = decorate(baseFunction)(addLog, addCurrentModel, addQuery, addBody, addEvent)
