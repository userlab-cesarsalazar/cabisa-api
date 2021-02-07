const remotePgConfig = {
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT ? process.env.DATABASE_PORT : 5432,
}

module.exports = {
  dbConfig: remoteDbConfig,
  pgConfig: remotePgConfig,
}
