const { db, helpers, types, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const { handleRead, handleRequest, handleResponse } = helpers
const { Types } = require('aws-sdk/clients/acm')
const storage = require('./storage')

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage, nestedFieldsKeys: ['product_history'] })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.create = async event => {
  try {
    const inputType = {
      product_type: { type: { enum: types.productsTypes }, required: true },
      name: { type: 'string', length: 100, required: true },
      code: { type: 'string', length: 50, required: true, unique: true },
      tax_id: { type: 'name || string', required: true },
      serial_number: { type: 'string', length: 50 },
      unit_price: { type: 'number', min: 0, required: true, defaultValue: 0 },
      description: { type: 'string', length: 255 },
      image_url: { type: 'string' },
    }
    const req = await handleRequest({ event, inputType })
    const { product_type, name, code, serial_number, unit_price, tax_id, description, image_url, created_by = 1 } = req.body

    const errors = []
    const requiredFields = ['product_type', 'name', 'code', 'unit_price']
    if (product_type !== types.productsTypes.SERVICE) requiredFields.push('tax_id')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [codeExists] = await db.query(storage.checkExists({ code, product_type }))

    if (Object.keys(types.productsTypes).every(k => types.productsTypes[k] !== product_type))
      errors.push(
        `The field product_type must contain one of these values: ${Object.keys(types.operationsTypes)
          .map(k => types.operationsTypes[k])
          .join(', ')}`
      )
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (codeExists) errors.push(`The provided code is already registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.createProduct(), [
        product_type,
        name,
        code,
        serial_number,
        unit_price,
        tax_id,
        description,
        image_url,
        created_by,
      ])

      return { statusCode: 201, data: { id: await connection.geLastInsertId() }, message: 'Product created successfully' }
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
      name: { type: 'string', length: 100, required: true },
      code: { type: 'string', length: 50, required: true, unique: true },
      serial_number: { type: 'string', length: 50 },
      unit_price: { type: 'number', min: 0, required: true, defaultValue: 0 },
      tax_id: { type: 'name || string', required: true },
      description: { type: 'string', length: 255 },
      image_url: { type: 'string' },
    }
    const req = await handleRequest({ event, inputType, dbQuery: db.query, storage })

    const { id, status, name, code, serial_number, unit_price, tax_id, description, image_url, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'status', 'name', 'code', 'unit_price']
    if (req.currentModel.product_type !== types.productsTypes.SERVICE) requiredFields.push('tax_id')
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [product] = await db.query(storage.checkExists({ code, product_type: req.currentModel?.product_type }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (product && Number(id) !== Number(product.id)) errors.push(`The provided code is already registered`)
    if (Object.keys(types.productsStatus).every(k => types.productsStatus[k] !== status))
      errors.push(
        `The field status must contain one of these values: ${Object.keys(types.productsStatus)
          .map(k => types.productsStatus[k])
          .join(', ')}`
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.updateProduct(), [name, status, code, serial_number, unit_price, tax_id, description, image_url, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Product updated successfully' }
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

    const { id, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [productExists] = await db.query(storage.checkExists({ id }, '1'))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (!productExists) errors.push(`The product with id ${id} is not registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.deleteProduct(), [updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Product deleted successfully' }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
