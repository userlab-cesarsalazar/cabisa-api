const findAllBy = (fields = {}, debug) => {
  const whereFields = Object.keys(fields).flatMap(k => (fields[k] ? `${k} = '${fields[k]}'` : []))
  const query = `
    SELECT *
    FROM clients
    WHERE is_active = 1 ${whereFields.length > 0 ? 'AND' : ''} ${whereFields.join(' AND ')}
  `
  if (debug) console.log(query)
  return query
}

const createClient = debug => {
  const query = `
    INSERT INTO clients
    (name, nit, address, phone, alternative_phone, business_man, payments_man,email, client_type,is_active)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?,?,1)
  `
  if (debug) console.log(query)
  return query
}

const updateClient = debug => {
  const query = `
    UPDATE clients
    SET name = ?, address = ?, phone = ?, alternative_phone = ?, business_man = ?, payments_man = ?, email = ?, client_type = ?, nit = ?
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
