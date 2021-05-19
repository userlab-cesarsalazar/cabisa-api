const handleAuthorizeDocument = require('./handleAuthorizeDocument')
const handleAuthorizeInventoryMovements = require('./handleAuthorizeInventoryMovements')
const handleCreateDocument = require('./handleCreateDocument')
const handleCreateInventoryMovements = require('./handleCreateInventoryMovements')
const handleRead = require('./handleRead')
const handleRequest = require('./handleRequest')
const handleResponse = require('./handleResponse')

module.exports = {
  handleAuthorizeDocument,
  handleAuthorizeInventoryMovements,
  handleCreateDocument,
  handleCreateInventoryMovements,
  handleRead,
  handleRequest,
  handleResponse,
}
