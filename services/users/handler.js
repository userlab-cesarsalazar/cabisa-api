const mysql = require('mysql2/promise')
const { dbConfig } = require(`${process.env['FILE_ENVIRONMENT']}/globals/dbConfig`)
const { response, getBody } = require(`${process.env['FILE_ENVIRONMENT']}/globals/common`)
const { getUsers } = require('./storage')

module.exports.read = async event => {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const [users] = await connection.execute(getUsers(true))
    return await response(200, { message: users }, connection)
  } catch (error) {
    console.log(error)
    return await response(400, error, connection)
  }
}
