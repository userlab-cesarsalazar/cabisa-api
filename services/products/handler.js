const mysql = require('mysql2/promise')
const { dbConfig } = require(`${process.env['FILE_ENVIRONMENT']}/globals/dbConfig`)
const { response, getBody, getLastId, escapeFields } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)
const { findAllBy, createProduct, updateProduct, deleteProduct } = require('./storage')

module.exports.read = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const queryParams = event.queryStringParameters ? event.queryStringParameters : {}
    const params = escapeFields(queryParams)

    const [products] = await connection.execute(findAllBy(params))

    return await response(200, { message: products }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}

module.exports.create = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const requiredFields = ['name', 'category_id', 'service_type_id']
    const body = escapeFields(getBody(event))
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { name, category_id, service_type_id, description = null, code = null, serial_number = null, cost = null, engine_number } = body
    const [[product]] = await connection.execute(findAllBy({ name }))

    if (product) return await response(400, { message: 'The provided name is already registered' }, connection)

    await connection.execute(createProduct(), [name, description, code, serial_number, cost, category_id, service_type_id, engine_number])
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
    const requiredFields = ['id', 'name', 'category_id', 'service_type_id']
    const body = escapeFields(getBody(event))
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) return await response(400, { message: `The fields ${errorFields.join(', ')} are required` }, connection)

    const { id, name, category_id, service_type_id, description = null, code = null, serial_number = null, cost = null, engine_number } = body
    const [[product]] = await connection.execute(findAllBy({ id }))

    if (!product) return await response(400, { message: `The product with the id ${id} is not registered` }, connection)

    await connection.execute(updateProduct(), [name, description, code, serial_number, cost, category_id, service_type_id, engine_number, id])

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
    await connection.execute(deleteProduct(), [id])

    return await response(200, { message: { id } }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}
