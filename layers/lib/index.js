const db = require('./db')
const common = require('./common')

module.exports = {
  db,
  ...common,
}
