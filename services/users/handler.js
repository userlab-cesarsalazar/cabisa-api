const { db, helpers, isEmail, ValidatorException, encrypt } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const { handleRequest, handleResponse, handleRead } = helpers
const AWS = require('aws-sdk')
const storage = require('./storage')

AWS.config.update({
  accessKeyId: process.env['ACCESS_KEY_ID'],
  secretAccessKey: process.env['SECRET_ACCESS_KEY'],
  region: process.env['REGION'],
})
const cognito = new AWS.CognitoIdentityServiceProvider()

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findAllBy })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  try {
    const inputType = {
      fullName: { type: 'string', required: true },
      password: { type: 'string', length: 100, required: true },
      email: { type: 'email', required: true },
      rolId: { type: 'string', length: 20, required: true },
    }
    const req = await handleRequest({ event, inputType })

    const { fullName, password, email, rolId } = req.body

    const errors = []
    const requiredFields = ['fullName', 'password', 'email', 'rolId']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [userExists] = await db.query(storage.checkExists({ email }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (userExists) errors.push(`The provided email is already registered`)
    if (email && !isEmail(email)) errors.push(`The provided email is invalid`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const cipherPassword = encrypt(password, process.env['ENCRYPTION_KEY'])

    const res = await db.transaction(async connection => {
      await connection.query(storage.createUser(), [fullName, cipherPassword, email, rolId])
      const id = await connection.geLastInsertId()

      return { statusCode: 201, data: { id }, message: 'User created successfully' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.update = async event => {
  try {
    const inputType = {
      id: { type: ['string', 'number'], required: true },
      fullName: { type: 'string', required: true },
      email: { type: 'email', required: true },
      rolId: { type: 'string', length: 20, required: true },
    }
    const req = await handleRequest({ event, inputType })

    const { id, fullName, email, rolId } = req.body

    const errors = []
    const requiredFields = ['id', 'fullName', 'email', 'rolId']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [userExists] = await db.query(storage.checkExists({ id }))
    const [emailExists] = await db.query(storage.checkExists({ email }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (!userExists) errors.push(`The user with id ${id} is not registered`)
    if (emailExists && Number(emailExists.id) !== Number(id)) errors.push(`The provided email is already registered`)
    if (email && !isEmail(email)) errors.push(`The provided email is invalid`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.updateUser(), [fullName, email, rolId, id])

      return { statusCode: 200, data: { id }, message: 'User updated successfully' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.delete = async event => {
  try {
    const inputType = {
      id: { type: ['string', 'number'], required: true },
    }
    const req = await handleRequest({ event, inputType })

    const { id } = req.body

    const errors = []
    const requiredFields = ['id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.deleteUser(), [id])

      return { statusCode: 200, data: { id }, message: 'User deleted successfully' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.changePassword = async event => {
  try {
    const inputType = {
      accessToken: { type: ['string', 'number'], required: true },
      previousPassword: { type: 'string', required: true },
      proposedPassword: { type: 'string', required: true },
    }
    const req = await handleRequest({ event, inputType })

    const { accessToken, previousPassword, proposedPassword } = req.body

    const params = {
      AccessToken: accessToken,
      PreviousPassword: previousPassword,
      ProposedPassword: proposedPassword,
    }

    const res = await new Promise((resolve, reject) => {
      cognito.changePassword(params, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve({ statusCode: 200, data, message: 'Password updated successfully' })
        }
      })
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
