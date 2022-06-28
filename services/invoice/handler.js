
const mysql = require('mysql2/promise')
const storage = require('./storage')
const { handleRequest, handleResponse, handleRead } = helpers
const db = mysqlConfig(mysql)

module.exports.create = async (event, context) => {
    try {
        
        const req = await handleRequest({ event })        
        return await handleResponse({ message:'hola mundo' })

    } catch (error) {
        console.log("invoice Errors",error)
        return await handleResponse({ error })
    }
}