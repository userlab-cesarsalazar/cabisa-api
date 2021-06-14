const mysql = require('mysql2/promise')
const { types, mysqlConfig, helpers, isEmail, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const { handleRead, handleRequest, handleResponse, handleCreateStakeholder } = helpers
const storage = require('./storage')
const db = mysqlConfig(mysql)

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

module.exports.readStakeholdersOptions = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findOptionsBy })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.readStakeholdersTypes = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findStakeholderTypes })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  try {
    const inputType = {
      stakeholder_type: { type: { enum: types.stakeholdersTypes }, required: true },
      name: { type: 'string', length: 100, required: true },
      address: { type: 'string', length: 100, required: true },
      nit: { type: 'string', length: 11, required: true },
      email: { type: 'email' },
      phone: { type: 'string', length: 20, required: true },
      alternative_phone: { type: 'string', length: 20 },
      business_man: { type: 'string', length: 100 },
      payments_man: { type: 'string', length: 100 },
    }
    const req = await handleRequest({ event, inputType })

    const { stakeholder_type, nit, email } = req.body

    const errors = []
    const requiredFields = ['stakeholder_type', 'name', 'address', 'nit', 'phone']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [stakeholderExists] = await db.query(storage.checkExists({ nit, stakeholder_type }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (stakeholderExists) errors.push(`El nit ya se ecuentra registrado`)
    if (email && !isEmail(email)) errors.push(`El email es invalido`)
    if (Object.keys(types.stakeholdersTypes).every(k => types.stakeholdersTypes[k] !== stakeholder_type))
      errors.push(
        `The field stakeholder_type must contain one of these values: ${Object.keys(types.stakeholdersTypes)
          .map(k => types.stakeholdersTypes[k])
          .join(', ')}`
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    const { res } = await db.transaction(async connection => await handleCreateStakeholder(req, { connection, storage }))

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
      stakeholder_type: { type: { enum: types.stakeholdersTypes }, required: true },
      name: { type: 'string', length: 100, required: true },
      address: { type: 'string', length: 100, required: true },
      nit: { type: 'string', length: 11, required: true },
      email: { type: 'email' },
      phone: { type: 'string', length: 20, required: true },
      alternative_phone: { type: 'string', length: 20 },
      business_man: { type: 'string', length: 100 },
      payments_man: { type: 'string', length: 100 },
    }
    const req = await handleRequest({ event, inputType, dbQuery: db.query, storage: storage.findAllBy })

    const { id, stakeholder_type, name, address, nit, email, phone, alternative_phone, business_man, payments_man, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'stakeholder_type', 'name', 'address', 'nit', 'phone']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [stakeholder] = await db.query(storage.checkExists({ nit, stakeholder_type }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!req.currentModel) errors.push(`El stakeholder con id ${id} no se encuentra registrado`)
    if (stakeholder && Number(id) !== Number(stakeholder.id)) errors.push(`El nit ya se encuentra registrado`)
    if (!isEmail(email)) errors.push(`El email es invalido`)
    if (Object.keys(types.stakeholdersTypes).every(k => types.stakeholdersTypes[k] !== stakeholder_type))
      errors.push(
        `The field stakeholder_type must contain one of these values: ${Object.keys(types.stakeholdersTypes)
          .map(k => types.stakeholdersTypes[k])
          .join(', ')}`
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.updateStakeholder(), [
        stakeholder_type,
        name,
        address,
        nit,
        email,
        phone,
        alternative_phone,
        business_man,
        payments_man,
        updated_by,
        id,
      ])

      return { statusCode: 200, data: { id }, message: 'Stakeholder actualizado exitosamente' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.setStatus = async event => {
  try {
    const inputType = {
      id: { type: ['string', 'number'], required: true },
      status: { type: { enum: types.stakeholdersStatus }, required: true, defaultValue: types.stakeholdersStatus.ACTIVE },
      // block_reason: { type: 'string' },
    }
    const req = await handleRequest({ event, inputType })

    const { id, status, block_reason, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = status !== types.stakeholdersStatus.BLOCKED ? ['id', 'status'] : ['id', 'status'] //, 'block_reason'
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [stakeholderExists] = await db.query(storage.checkExists({ id }, '1'))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!stakeholderExists) errors.push(`El stakeholder con id ${id} no se encuentra registrado`)
    if (Object.keys(types.stakeholdersStatus).every(k => types.stakeholdersStatus[k] !== status))
      errors.push(
        `The field status must contain one of these values: ${Object.keys(types.stakeholdersStatus)
          .map(k => types.stakeholdersStatus[k])
          .join(', ')}`
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.setStatusStakeholder(), [status, block_reason, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Status actualizado exitosamente' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
