const mysql = require('mysql2/promise')
const { mysqlConfig, helpers, ValidatorException, getFormattedDates } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const storage = require('./storage')
const { handleRequest, handleResponse, handleRead } = helpers
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

module.exports.readProjectsOptions = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findOptionsBy })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  try {
    const inputType = {
      stakeholder_id: { type: ['number', 'string'], required: true },
      name: { type: 'string', length: 255, required: true, unique: true },
      start_date: { type: 'string', required: true },
      end_date: { type: 'string' },
    }
    const req = await handleRequest({ event, inputType })
    const { stakeholder_id, name, created_by = 1 } = req.body

    const errors = []
    const requiredFields = ['stakeholder_id', 'name', 'start_date']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [nameExists] = await db.query(storage.checkExists({ stakeholder_id, name }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (nameExists) errors.push(`Un mismo cliente no puede registrar varios proyectos con el mismo nombre`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const { start_date, end_date } = getFormattedDates({ start_date: req.body.start_date, end_date: req.body.end_date })

    const res = await db.transaction(async connection => {
      await connection.query(storage.createProject(), [stakeholder_id, name, start_date, end_date, created_by])

      return { statusCode: 201, data: { id: await connection.geLastInsertId() }, message: 'Proyecto creado exitosamente' }
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
      id: { type: ['number', 'string'], required: true },
      name: { type: 'string', length: 255, required: true, unique: true },
      start_date: { type: 'string', required: true },
      end_date: { type: 'string' },
    }
    const req = await handleRequest({ event, inputType })
    const { id, name, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'name', 'start_date']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [exists] = await db.query(storage.checkExistsOnUpdate(), [name, id])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (exists && exists.id && id !== exists.id) errors.push(`Un mismo cliente no puede registrar varios proyectos con el mismo nombre`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const { start_date, end_date } = getFormattedDates({ start_date: req.body.start_date, end_date: req.body.end_date })

    const res = await db.transaction(async connection => {
      await connection.query(storage.updateProject(), [name, start_date, end_date, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Proyecto actualizado exitosamente' }
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
      id: { type: ['number', 'string'], required: true },
    }
    const req = await handleRequest({ event, inputType })
    const { id } = req.body

    const errors = !id ? [`El campo id es requerido`] : []

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.deleteProject(), [id])

      return { statusCode: 200, data: { id }, message: 'Proyecto eliminado exitosamente' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
