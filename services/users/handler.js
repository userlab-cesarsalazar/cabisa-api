const mysql = require('mysql2/promise')
const crypto = require('crypto-js')
const { dbConfig } = require(`${process.env['FILE_ENVIRONMENT']}/globals/dbConfig`)
const { response, getBody, getLastId, escapeFields } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)
const { findAllBy, createUser, updateUser, deleteUser } = require('./storage')

module.exports.read = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const queryParams = event.queryStringParameters ? event.queryStringParameters : {}
    const params = escapeFields(queryParams)

    const [users] = await connection.execute(findAllBy(params))

    return await response(200, { message: users }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.create = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const requiredFields = ['fullName', 'email', 'rolId']

    const body = getBody(event)

    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { fullName, email, rolId, permissions } = body
    const [[user]] = await connection.execute(findAllBy({ email }))

    if (user) return await response(400, { message: 'The provided email is already registered' }, connection)
    console.log(JSON.parse(JSON.stringify(permissions)), 'permissions')

    await connection.execute(createUser(), [fullName, email, rolId, JSON.stringify(permissions)])
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
    const requiredFields = ['id', 'fullName', 'email', 'rolId']
    const body = getBody(event)
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { id, fullName, email, rolId, permissions } = body
    const [[userExists]] = await connection.execute(findAllBy({ id }))

    if (!userExists) return await response(400, { message: `The user with the id ${id} is not registered` }, connection)

    await connection.execute(updateUser(), [fullName, email, rolId, JSON.stringify(permissions), id])

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
    await connection.execute(deleteUser(), [id])

    return await response(200, { message: { id } }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}
