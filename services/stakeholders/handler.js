const { getBaseInputType, db, request, response, isEmail, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const { findAllBy, createStakeholder, updateStakeholder, setStatusStakeholder } = require('./storage')

const getInputType = getBaseInputType({
  id: { type: ['string', 'number'], required: true },
  stakeholder_type: { type: { enum: ['CLIENT_INDIVIDUAL', 'CLIENT_COMPANY', 'PROVIDER'] }, required: true },
  status: { type: { enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'] }, required: true, defaultValue: 'ACTIVE' },
  name: { type: 'string', length: 100, required: true },
  address: { type: 'string', length: 100, required: true },
  nit: { type: 'string', length: 11, required: true },
  email: { type: 'email' },
  phone: { type: 'string', length: 20 },
  alternative_phone: { type: 'string', length: 20 },
  business_man: { type: 'string', length: 100 },
  payments_man: { type: 'string', length: 100 },
  block_reason: { type: 'string' },
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
    const inputType = getInputType('exclude', 'id', 'status', 'block_reason')
    const req = await request({ event, inputType })

    const { stakeholder_type, name, address, nit, email, phone, alternative_phone, business_man, payments_man, created_by = 1 } = req.body

    const errors = []
    const requiredFields = ['stakeholder_type', 'name', 'address']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [stakeholderExists] = await db.query(findAllBy({ nit, stakeholder_type }))

    if (inputType.stakeholder_type.type.enum.every(v => v !== stakeholder_type))
      errors.push(`The field stakeholder_type must contain one of these values: ${inputType.stakeholder_type.type.enum.join(', ')}`)
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (stakeholderExists) errors.push(`The provided nit is already registered`)
    if (!isEmail(email)) errors.push(`The provided email is invalid`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(createStakeholder(), [
        stakeholder_type,
        name,
        address,
        nit,
        email,
        phone,
        alternative_phone,
        business_man,
        payments_man,
        created_by,
      ])

      return { statusCode: 201, data: { id: await connection.geLastInsertId() }, message: 'Stakeholder created successfully' }
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.update = async event => {
  try {
    const inputType = getInputType('exclude', 'stakeholder_type', 'status', 'block_reason')
    const req = await request({ event, inputType, dbQuery: db.query, findAllBy })

    const { id, name, address, nit, email, phone, alternative_phone, business_man, payments_man, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = ['id', 'name', 'address']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const [stakeholder] = await db.query(findAllBy({ nit, stakeholder_type: req?.currentModel?.stakeholder_type }))

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (!req.currentModel)
      errors.push(`The stakeholder with nit ${nit} and stakeholder_type ${req?.currentModel?.stakeholder_type} is not registered`)
    if (stakeholder && Number(id) !== Number(stakeholder.id)) errors.push(`The provided nit is already registered`)
    if (!isEmail(email)) errors.push(`The provided email is invalid`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(updateStakeholder(), [name, address, nit, email, phone, alternative_phone, business_man, payments_man, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Stakeholder updated successfully' }
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.setStatus = async event => {
  try {
    const inputType = getInputType('include', 'id', 'status', 'block_reason')
    const req = await request({ event, inputType, dbQuery: db.query, findAllBy, initWhereCondition: '1', debug: true })

    const { id, status, block_reason, updated_by = 1 } = req.body

    const errors = []
    const requiredFields = status === 'BLOCKED' ? ['id', 'status', 'block_reason'] : ['id', 'status']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (inputType.status.type.enum.every(v => v !== status))
      errors.push(`The field status must contain one of these values: ${inputType.status.type.enum.join(', ')}`)
    if (!req.currentModel) errors.push(`The stakeholder with id ${id} is not registered`)

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      await connection.query(setStatusStakeholder(), [status, block_reason, updated_by, id])

      return { statusCode: 200, data: { id }, message: 'Stakeholder status updated successfully' }
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}
