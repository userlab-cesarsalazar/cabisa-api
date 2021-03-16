const getUsers = debug => {
  const query = `SELECT * FROM users`
  if (debug) console.log(query)
  return query
}

module.exports = {
  getUsers,
}
