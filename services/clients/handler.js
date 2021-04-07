const mysql = require('mysql2/promise')
const { dbConfig } = require(`${process.env['FILE_ENVIRONMENT']}/globals/dbConfig`)
const { response, getBody, getLastId, escapeFields } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)
const { findAllBy, createClient, updateClient, deleteClient } = require('./storage')

module.exports.read = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const queryParams = event.queryStringParameters ? event.queryStringParameters : {}
    const params = escapeFields(queryParams)

    const [clients] = await connection.execute(findAllBy(params))

    return await response(200, { message: clients }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.create = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const requiredFields = ['name', 'nit', 'address', 'email', 'client_type']
    const body = escapeFields(getBody(event))
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { name, nit, address, phone = null, alternative_phone = null, business_man = null, payments_man = null, email, client_type } = body
    const [[client]] = await connection.execute(findAllBy({ nit }))

    if (client) return await response(400, { message: 'The provided nit is already registered' }, connection)

    await connection.execute(createClient(), [name, nit, address, phone, alternative_phone, business_man, payments_man, email, client_type])
    const [[id]] = await connection.execute(getLastId())

    return await response(201, { message: id }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.update = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const requiredFields = ['id', 'name', 'address']
    const body = escapeFields(getBody(event))
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { id, name, address, phone = null, alternative_phone = null, business_man = null, payments_man = null } = body
    const [[clientExists]] = await connection.execute(findAllBy({ id }))

    if (!clientExists) return await response(400, { message: `The client with the id ${id} is not registered` }, connection)

    await connection.execute(updateClient(), [name, address, phone, alternative_phone, business_man, payments_man, id])

    return await response(200, { message: { id } }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.delete = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const { id } = getBody(event)
    await connection.execute(deleteClient(), [id])

    return await response(200, { message: { id } }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}
