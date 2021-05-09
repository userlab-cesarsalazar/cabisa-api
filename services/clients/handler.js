const { db, response, getBody, escapeFields, validateEmail, getError } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const { findAllBy, createClient, updateClient, deleteClient } = require('./storage')

const documentsConfig = {
  SELL_PRE_INVOICE: {
    requireAuthorization: true,
    defaultStatus: 'PENDING',
    onAuthorizeGenerate: {
      document: { type: 'SELL_INVOICE', status: 'APPROVED' },
    },
  },
  SELL_INVOICE: {
    requireAuthorization: false,
    defaultStatus: 'APPROVED',
    onAuthorizeGenerate: {
      operation: { type: 'SELL' },
    },
  },
  PURCHASE_INVOICE: '',
  RENT_INVOICE: '',
  PURCHASE_ORDER: '',
  RENT_PRE_INVOICE: '',
}

const operationsConfig = {
  SELL: {
    onCreateGenerate: {
      // si el status es 'COMPLETED' se graban todos los registros correspondientes en inventory_movements_details con authorized_by
      // si el status es 'PENDING' no se graba ningun registros en inventory_movements_details
      inventory_movements: { type: 'OUT', status: 'COMPLETED' },
    },
  },
}

const inventoryMovementsConfig = {
  defaultStatus: 'COMPLETED',
  onCreateGenerate: {
    inventory_movements_details: true,
  },
}

module.exports.read = async event => {
  try {
    const queryParams = event.queryStringParameters ? event.queryStringParameters : {}
    const params = escapeFields(queryParams)

    const [clients] = await db.query(findAllBy(params))

    return await response(200, { message: clients })
  } catch (error) {
    console.log(error)
    return await response(400, { error: getError(error) })
  }
}

module.exports.create = async event => {
  try {
    const message = await db.transaction(async connection => {
      // REQUEST HANDLER
      const body = escapeFields(getBody(event))
      const { name, nit, address, phone = null, alternative_phone = null, business_man = null, payments_man = null } = body

      // VALIDATOR
      const requiredFields = ['name', 'nit', 'address']
      const errorFields = requiredFields.filter(k => !body[k])
      if (errorFields.length > 0) throw new Error(`The fields ${errorFields.join(', ')} are required`)
      const [[client]] = await connection.execute(findAllBy({ nit }))
      if (client) throw new Error('The provided nit is already registered')

      // SQL QUERIES
      await connection.query(createClient(), [name, nit, address, phone, alternative_phone, business_man, payments_man])

      // RESPONSE MESSAGE
      return { id: await connection.geLastInsertedId() }
    })

    return await response(201, { message })
  } catch (error) {
    console.log(error)
    return await response(400, { error: getError(error) })
  }
}

module.exports.update = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const requiredFields = ['id', 'name', 'address']
    const body = escapeFields(getBody(event))
    const errorFields = requiredFields.filter(k => !body[k])

    if (errorFields.length > 0) throw new Error(`The fields ${errorFields.join(', ')} are required`)

    const {
      id,
      name,
      address,
      phone = null,
      alternative_phone = null,
      business_man = null,
      payments_man = null,
      email = null,
      client_type = null,
    } = body
    const [[clientExists]] = await connection.execute(findAllBy({ id }))

    if (!clientExists) throw new Error(`The client with the id ${id} is not registered`)

    if (!validateEmail(email)) throw new Error(`The email is invalid`)

    await connection.execute(updateClient(), [name, address, phone, alternative_phone, business_man, payments_man, email, client_type, id])

    return await response(200, { message: { id } }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, { error: getError(error) }, connection)
  }
}

module.exports.delete = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const { id } = getBody(event)
    await connection.execute(deleteClient(), [id])

    return await response(200, { message: { id } }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, { error: getError(error) }, connection)
  }
}
