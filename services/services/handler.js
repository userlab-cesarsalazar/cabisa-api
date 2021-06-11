const mysql = require('mysql2/promise')
const { mysqlConfig, helpers, types, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const storage = require('./storage')
const { handleRead, handleRequest, handleResponse } = helpers
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

module.exports.readServicesStatus = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findServicesStatus })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  try {
    const inputType = {
      status: { type: { enum: types.productsStatus }, required: true },
      code: { type: 'string', length: 50, required: true, unique: true },
      unit_price: { type: 'number', min: 0, required: true, defaultValue: 0 },
      description: { type: 'string', length: 255, required: true },
    }
    const req = await handleRequest({ event, inputType })
    const { status, code, unit_price, description, created_by = 1 } = req.body
    const product_type = types.productsTypes.SERVICE

    const errors = []
    const requiredFields = ['status', 'code', 'unit_price', 'description']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [codeExists] = await db.query(storage.checkExists({ code, product_type }))
    const [tax] = await db.query(storage.findTaxIdExento())

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (codeExists) errors.push(`El codigo ya se encuentra registrado`)
    if (Object.keys(types.productsStatus).every(k => types.productsStatus[k] !== status))
      errors.push(
        `The field status must contain one of these values: ${Object.keys(types.productsStatus)
          .map(k => types.productsStatus[k])
          .join(', ')}`
      )
    if (!tax || !tax.id) errors.push(`The tax 'EXENTO' doesn't exists in the DB`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.createService(), [status, code, unit_price, description, tax.id, created_by])

      return { statusCode: 201, data: { id: await connection.geLastInsertId() }, message: 'Servicio creado exitosamente' }
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
      status: { type: { enum: types.productsStatus }, required: true },
      code: { type: 'string', length: 50, required: true, unique: true },
      unit_price: { type: 'number', min: 0, required: true, defaultValue: 0 },
      description: { type: 'string', length: 255, required: true },
    }
    const req = await handleRequest({ event, inputType, dbQuery: db.query, storage: storage.findAllBy })

    const { id, status, code, unit_price, description, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'status', 'code', 'unit_price', 'description']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [service] = await db.query(storage.checkExists({ code }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (service && Number(id) !== Number(service.id)) errors.push(`El codigo ya se encuentra registrado`)
    if (Object.keys(types.productsStatus).every(k => types.productsStatus[k] !== status))
      errors.push(
        `The field status must contain one of these values: ${Object.keys(types.productsStatus)
          .map(k => types.productsStatus[k])
          .join(', ')}`
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.updateService(), [status, code, unit_price, description, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Servicio actualizado exitosamente' }
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
    const [serviceExists] = await db.query(storage.checkExists({ id }, '1'))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (!serviceExists) errors.push(`El servicio con id ${id} no se encuentra regisrado`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.deleteService(), [id])

      return { statusCode: 200, data: { id }, message: 'Servicio eliminado exitosamente' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
