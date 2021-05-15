const { handleRead, db, request, response, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const storage = require('./storage')

module.exports.read = async event => {
  try {
    const req = await request({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage, nestedFieldsKeys: ['product_history'] })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.create = async event => {
  try {
    const inputType = {
      product_type: { type: { enum: ['SERVICE', 'EQUIPMENT', 'PART'] }, required: true },
      name: { type: 'string', length: 100, required: true },
      code: { type: 'string', length: 50, required: true, unique: true },
      serial_number: { type: 'string', length: 50 },
      unit_price: { type: 'number', min: 0, defaultValue: 0 },
      description: { type: 'string', length: 255 },
      image_url: { type: 'string' },
    }
    const req = await request({ event, inputType })
    const { product_type, name, code, serial_number, unit_price, description, image_url, created_by = 1 } = req.body

    const errors = []
    const requiredFields = ['product_type', 'name']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [codeExists] = await db.query(storage.checkExists({ code, product_type }))

    if (inputType.product_type.type.enum.every(v => v !== product_type))
      errors.push(`The field product_type must contain one of these values: ${inputType.product_type.type.enum.join(', ')}`)
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (codeExists) errors.push(`The provided code is already registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.createProduct(), [product_type, name, code, serial_number, unit_price, description, image_url, created_by])

      return { statusCode: 201, data: { id: await connection.geLastInsertId() }, message: 'Product created successfully' }
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.update = async event => {
  try {
    const inputType = {
      id: { type: ['string', 'number'], required: true },
      name: { type: 'string', length: 100, required: true },
      code: { type: 'string', length: 50, required: true, unique: true },
      serial_number: { type: 'string', length: 50 },
      unit_price: { type: 'number', min: 0, defaultValue: 0 },
      description: { type: 'string', length: 255 },
      image_url: { type: 'string' },
    }
    const req = await request({ event, inputType, dbQuery: db.query, storage })

    const { id, name, code, serial_number, unit_price, description, image_url, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'name', 'code']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [product] = await db.query(storage.checkExists({ code, product_type: req.currentModel?.product_type }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (product && Number(id) !== Number(product.id)) errors.push(`The provided code is already registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.updateProduct(), [name, code, serial_number, unit_price, description, image_url, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Product updated successfully' }
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.setStatus = async event => {
  try {
    const inputType = {
      id: { type: ['string', 'number'], required: true },
      status: { type: { enum: ['ACTIVE', 'INACTIVE'] }, required: true, defaultValue: 'ACTIVE' },
    }
    const req = await request({ event, inputType })

    const { id, status, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'status']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [productExists] = await db.query(storage.checkExists({ id }, '1'))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (inputType.status.type.enum.every(v => v !== status))
      errors.push(`The field status must contain one of these values: ${inputType.status.type.enum.join(', ')}`)
    if (!productExists) errors.push(`The product with id ${id} is not registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(storage.setStatusProduct(), [status, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Product status updated successfully' }
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}
