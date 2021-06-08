const mysql = require('mysql2/promise')

const config = {
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: 3306,
  multipleStatements: true,
}

const query = async (sql, values, log = true) => {
  let connection

  try {
    connection = await mysql.createConnection(config)

    if (log) console.log(connection.format(sql, values))

    const result = await connection.execute(sql, values)

    await connection.end()

    return result[0]
  } catch (error) {
    if (connection && typeof connection.end === 'function') await connection.end()

    throw error
  }
}

const transaction = async func => {
  let connection

  try {
    connection = await mysql.createConnection(config)

    await connection.beginTransaction()

    connection.geLastInsertId = async () => {
      const [result] = await connection.execute('SELECT LAST_INSERT_ID() AS "id"')
      return result[0].id
    }

    const result = await func(connection)

    await connection.commit()

    return result
  } catch (error) {
    if (connection) {
      await connection.rollback()
      await connection.end()
    }

    throw error
  }
}

module.exports = { query, transaction }
