const { getWhereConditions } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)

const findAllBy = (fields = {}, debug) => {
  const query = `
    SELECT id, name, nit, address, phone, alternative_phone, business_man, payments_man, email, client_type
    FROM clients
    WHERE is_active = 1 ${getWhereConditions(fields)}
  `
  if (debug) console.log(query)
  return query
}

const createClient = debug => {
  const query = `
    INSERT INTO clients
    (name, nit, address, phone, alternative_phone, business_man, payments_man, is_active)
    VALUES(?, ?, ?, ?, ?, ?, ?, 1)
  `
  if (debug) console.log(query)
  return query
}

const updateClient = debug => {
  const query = `
    UPDATE clients
    SET name = ?, address = ?, phone = ?, alternative_phone = ?, business_man = ?, payments_man = ?, email = ?, client_type = ?
    WHERE id = ?
  `
  if (debug) console.log(query)
  return query
}

const deleteClient = debug => {
  const query = 'UPDATE clients SET is_active = 0 WHERE id = ?'
  if (debug) console.log(query)
  return query
}

module.exports = {
  createClient,
  deleteClient,
  findAllBy,
  updateClient,
}
