const { decorate, escapeFields, groupJoinResult } = require('../common')

const addLog =
  fn =>
  async ({ debug = false, ...input }, req) => {
    const result = await fn(input, req)

    if (debug) console.log(result)

    return result
  }

const addUserHasPermissions = fn => async (input, req) => {
  // buscar en base de datos los permisos del usuario y agregar al req la funcion userHasPermissions
  // que debe recibir como argumento un array de numeros (id de permisos) y verificar si el user
  // que se pidio a base de datos (el user de la request) tiene esos permisos asignados
  const userHasPermissions = permissions => console.log(req.currentUserId)

  return await fn(input, { ...req, userHasPermissions })
}

const addCurrentUser = fn => async (input, req) => await fn(input, { ...req, currentUserId: input.event.headers.Authorization })

const addCurrentModel =
  fn =>
  async ({ dbQuery, storage, initWhereCondition, uniqueKey = ['id'], nestedFieldsKeys = null, ...input }, req) => {
    const isInvalid = uniqueKey.some(k => !req.body || !req.body[k])

    if (isInvalid || !dbQuery || !storage) return await fn({ ...input, dbQuery, storage, initWhereCondition, uniqueKey, nestedFieldsKeys }, req)

    const fields = uniqueKey.reduce((r, k) => ({ ...r, [k]: req.body[k] }), {})
    const currentModelCollection = await dbQuery(storage(fields, initWhereCondition))

    const currentModelArray = nestedFieldsKeys
      ? groupJoinResult({ data: currentModelCollection, nestedFieldsKeys, uniqueKey })
      : currentModelCollection
    const currentModel = currentModelArray[0]

    return await fn({ ...input, dbQuery, storage, initWhereCondition, uniqueKey, nestedFieldsKeys }, { ...req, currentModel })
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

module.exports = decorate(baseFunction)(addLog, addUserHasPermissions, addCurrentUser, addCurrentModel, addQuery, addBody, addEvent)
