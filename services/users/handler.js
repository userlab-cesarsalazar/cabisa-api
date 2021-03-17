const mysql = require('mysql2/promise')
const crypto = require('crypto-js')
const { dbConfig } = require(`${process.env['FILE_ENVIRONMENT']}/globals/dbConfig`)
const { response, getBody, getLastId } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)
const { findAll, findBy, createUser, updateUser, deleteUser } = require('./storage')

module.exports.read = async () => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const [users] = await connection.execute(findAll())

    return await response(200, { message: users }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.readOne = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const userId = event.pathParameters.id
    const [[user]] = await connection.execute(findBy('id'), [userId])

    if (user) return await response(200, { message: user }, connection)
    else return await response(400, { message: `The user with the id ${userId} is not registered` }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.create = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const { fullName, password, email, rolId } = getBody(event)
    const [[user]] = await connection.execute(findBy('email'), [email])

    if (user) return await response(400, { message: 'The provided email is already registered' }, connection)

    const cipherPassword = crypto.AES.encrypt(password, process.env['ENCRYPTION_KEY']).toString()
    await connection.execute(createUser(), [fullName, cipherPassword, email, rolId])
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
    const { id, fullName, isActive, password, rolId } = getBody(event)
    const [[userExists]] = await connection.execute(findBy('id'), [id])

    if (!userExists) return await response(400, { message: `The user with the id ${id} is not registered` }, connection)

    const cipherPassword = crypto.AES.encrypt(password, process.env['ENCRYPTION_KEY']).toString()
    await connection.execute(updateUser(), [fullName, isActive, cipherPassword, rolId, id])

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
