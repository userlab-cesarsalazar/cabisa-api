const { ValidatorException } = require(`../common`)
const types = require('../types')

// updateStockOn: types.actions.CANCELLED | types.actions.APPROVED

// req.body: {
//   inventory_movements: [
//     { movement_type, stock, quantity, product_id }
//   ]
// }

const handleUpdateStock = async (req, res) => {
  const { inventory_movements, old_inventory_movements } = req.body

  const stocks = [...inventory_movements, ...old_inventory_movements].reduce((result, im) => {
    const actionType = im.status ? types.actions.APPROVED : types.actions.CANCELLED
    const movementType = res.updateStockOn === actionType ? types.inventoryMovementsTypes.OUT : types.inventoryMovementsTypes.IN
    const addedQty = im.movement_type === movementType ? im.quantity : im.quantity * -1
    const newStock = { stock: im.stock + addedQty, product_id: im.product_id }
    const sameProducts = result?.flatMap(s => (Number(s.product_id) === Number(im.product_id) ? s : []))

    if (sameProducts?.length > 0) {
      const productStock = sameProducts[sameProducts.length - 1].stock

      return [...result, { ...newStock, stock: productStock + addedQty }]
    }

    return [...(result || []), newStock]
  }, [])

  const errors = stocks.flatMap(s => (s.stock < 0 ? `The stock for product with id ${s.product_id} cannot be less than zero` : []))

  if (errors.length > 0) throw new ValidatorException(errors)

  const updateStockPromises = stocks.map(s => res.connection.query(updateStock(), [s.stock, s.product_id]))
  await Promise.all(updateStockPromises)

  return {
    req,
    res: { ...res, statusCode: 200, data: { stocks }, message: 'Product stock updated successfully' },
  }
}

const updateStock = () => `UPDATE products SET stock = ? WHERE id = ?`

module.exports = handleUpdateStock
