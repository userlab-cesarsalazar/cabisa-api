const mysql = require('mysql2/promise')
const crypto = require('crypto-js')
const AWS = require('aws-sdk')
const { dbConfig } = require(`${process.env['FILE_ENVIRONMENT']}/globals/dbConfig`)
const { response, getBody, getLastId, escapeFields } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)
const { findAllBy, createUser, updateUser } = require('./storage')

AWS.config.update({
  accessKeyId: process.env['ACCESS_KEY_ID'],
  secretAccessKey: process.env['SECRET_ACCESS_KEY'],
  region: process.env['REGION'],
})
const cognito = new AWS.CognitoIdentityServiceProvider()

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
    const requiredFields = ['fullName', 'password', 'email', 'rolId']
    const body = escapeFields(getBody(event))
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { fullName, password, email, rolId } = body
    const [[user]] = await connection.execute(findAllBy({ email }))

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
    const requiredFields = ['id', 'fullName', 'password', 'email', 'rolId']
    const body = escapeFields(getBody(event))
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { id, fullName, password, email, rolId } = body
    const [[userExists]] = await connection.execute(findAllBy({ id }))

    if (!userExists) return await response(400, { message: `The user with the id ${id} is not registered` }, connection)

    const cipherPassword = crypto.AES.encrypt(password, process.env['ENCRYPTION_KEY']).toString()
    await connection.execute(updateUser(), [fullName, email, cipherPassword, rolId, id])

    return await response(200, { message: { id } }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.delete = async event => {
  try {
    const { userName } = getBody(event)

    let params = {
      UserPoolId: process.env['USER_POOL_ID'],
      Username: userName,
    }

    const result = await new Promise((resolve, reject) => {
      cognito.adminDeleteUser(params, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })

    return await response(200, { message: result })
  } catch (error) {
    console.log(error)
    return await response(400, error)
  }
}

module.exports.changePassword = async event => {
  try {
    const { accessToken, previousPassword, proposedPassword } = getBody(event)

    let params = {
      AccessToken: accessToken,
      PreviousPassword: previousPassword,
      ProposedPassword: proposedPassword,
    }

    const result = await new Promise((resolve, reject) => {
      cognito.changePassword(params, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })

    return await response(200, { message: result })
  } catch (error) {
    console.log(error)
    return await response(400, error)
  }
}
