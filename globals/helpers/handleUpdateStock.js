const { ValidatorException } = require(`../common`)
const types = require('../types')

// res.updateStockOn: types.actions.CANCELLED | types.actions.APPROVED

// req.body: {
//   document_id,
//   inventory_movements: [
//     { movement_type, stock, quantity, product_id }
//   ],
//   old_inventory_movements: [
//     { movement_type, stock, quantity, product_id, status }
//   ],
// }

const handleUpdateStock = async (req, res) => {
  const { document_id, inventory_movements = [], old_inventory_movements = [] } = req.body

  const movements = [...old_inventory_movements, ...inventory_movements]

  if (!movements || !movements[0]) return { req, res }

  const stocks = movements.reduce((result, im) => {
    // TODO: documentar lo que se hace en las siguientes 5 lineas
    const actionType = !im.status ? types.actions.CANCELLED : types.actions.APPROVED
    const movementType = res.updateStockOn === actionType ? types.inventoryMovementsTypes.OUT : types.inventoryMovementsTypes.IN
    const addedQty = im.movement_type === movementType ? im.quantity : im.quantity * -1
    const newStock = { stock: im.stock + addedQty, product_id: im.product_id }
    const sameProducts = result && result.flatMap(s => (Number(s.product_id) === Number(im.product_id) ? s : []))

    if (sameProducts && sameProducts[0]) {
      const productStock = sameProducts[sameProducts.length - 1].stock

      return [...result, { ...newStock, stock: productStock + addedQty }]
    }

    return [...(result || []), newStock]
  }, [])

  if (stocks && stocks[0]) {
    const invalidProductsIds = stocks.flatMap(s => (s.stock < 0 ? s.product_id : []))

    if (invalidProductsIds.length > 0) {
      const [invalidProductsFromDB] = await res.connection.query(findInvalidProductsNames(invalidProductsIds))
      const invalidProductsNames = invalidProductsFromDB.map(p => p.description)
      const errors = [`Stock insuficiente para los productos: ${invalidProductsNames.join(', ')}`]

      errors.push('Por favor, incluya una cantidad menor o registre una compra para aumentar el stock actual')

      throw new ValidatorException(errors)
    }

    // TODO: eliminar duplicados en stocks (ocurre en los endpoints que hacen update)
    const updateStockPromises = stocks.map(s => res.connection.query(updateStock(), [s.stock, s.product_id]))
    await Promise.all(updateStockPromises)
  }

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id, stocks }, message: 'Stock actualizado exitosamente' },
  }
}

const updateStock = () => `UPDATE products SET stock = ? WHERE id = ?`

const findInvalidProductsNames = invalidProductsIds => `SELECT description FROM products WHERE id IN (${invalidProductsIds.join(', ')})`

module.exports = handleUpdateStock
