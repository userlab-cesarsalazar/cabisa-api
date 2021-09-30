const mysql = require('mysql2/promise')
const { mysqlConfig, helpers } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const storage = require('./storage')
const { handleRead, handleRequest, handleResponse } = helpers
const db = mysqlConfig(mysql)

module.exports.accountsReceivable = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getAccountsReceivable })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.sales = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getSales })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.inventory = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, {
      dbQuery: db.query,
      storage: storage.getInventory,
      nestedFieldsKeys: ['inventory_movements', 'inventory_movements_details'],
      uniqueKey: ['product_id'],
    })

    const resData = res.data.map(product => {
      const inventoryMovements = product.inventory_movements.reduce((r, im) => {
        const isDuplicateMovement = r.some(rim => Number(rim.inventory_movement_id) === Number(im.inventory_movement_id))

        if (isDuplicateMovement) return r
        else return [...r, im]
      }, [])

      const inventoryMovementsWithDetais = inventoryMovements.map(im => {
        const inventory_movements_details = product.inventory_movements_details.flatMap(imd =>
          Number(imd.inventory_movement_id) === Number(im.inventory_movement_id) ? imd : []
        )

        return { ...im, inventory_movements_details }
      })

      delete product.inventory_movements_details

      return { ...product, inventory_movements: inventoryMovementsWithDetais }
    })

    return await handleResponse({ req, res: { ...res, data: resData } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
