const { getBaseInputType, db, request, response, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const { findAllBy, createProduct, updateProduct, setStatusProduct } = require('./storage')

const getInputType = getBaseInputType({
  id: { type: ['string', 'number'], required: true },
  product_type: { type: { enum: ['SERVICE', 'EQUIPMENT', 'PART'] }, required: true },
  status: { type: { enum: ['ACTIVE', 'INACTIVE'] }, required: true, defaultValue: 'ACTIVE' },
  name: { type: 'string', length: 100, required: true },
  code: { type: 'string', length: 50, required: true, unique: true },
  serial_number: { type: 'string', length: 50 },
  unit_price: { type: 'number', min: 0, defaultValue: 0 },
  description: { type: 'string', length: 255 },
  image_url: { type: 'string' },
})

module.exports.read = async event => {
  try {
    const req = await request({ event })

    const res = { statusCode: 200, data: await db.query(findAllBy(req.query)) }

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.create = async event => {
  try {
    const inputType = getInputType('exclude', 'id', 'status')
    const req = await request({ event, inputType })
    const { product_type, name, code, serial_number, unit_price, description, image_url, created_by = 1 } = req.body

    const errors = []
    const requiredFields = ['product_type', 'name']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [codeExists] = await db.query(findAllBy({ code }))

    if (inputType.product_type.type.enum.every(v => v !== product_type))
      errors.push(`The field product_type must contain one of these values: ${inputType.product_type.type.enum.join(', ')}`)
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (codeExists) errors.push(`The provided code is already registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(createProduct(), [product_type, name, code, serial_number, unit_price, description, image_url, created_by])

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
    const inputType = getInputType('exclude', 'product_type', 'status')
    const req = await request({ event, inputType, dbQuery: db.query, findAllBy })

    const { id, name, code, serial_number, unit_price, description, image_url, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'name', 'code']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [product] = await db.query(findAllBy({ code }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (product && Number(id) !== Number(product.id)) errors.push(`The provided code is already registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(updateProduct(), [name, code, serial_number, unit_price, description, image_url, updated_by, id])

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
    const inputType = getInputType('include', 'id', 'status')
    const req = await request({ event, inputType, dbQuery: db.query, findAllBy, initWhereCondition: '1' })

    const { id, status, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'status']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (inputType.status.type.enum.every(v => v !== status))
      errors.push(`The field status must contain one of these values: ${inputType.status.type.enum.join(', ')}`)
    if (!req.currentModel) errors.push(`The stakeholder with id ${id} is not registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(setStatusProduct(), [status, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Product status updated successfully' }
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}
