const { ValidatorException } = require(`../common`)
const types = require('../types')
const appConfig = require('../appConfig')

const handleCancelDocument = async (req, res) => {
  const { document_id, cancel_reason, document_type, related_internal_document_id, operation_id, updated_by = 1 } = req.body

  await res.connection.query(cancelDocument(), [cancel_reason, updated_by, document_id])

  if (related_internal_document_id) await res.connection.query(cancelDocument(), [cancel_reason, updated_by, related_internal_document_id])

  const cancelMovements = appConfig.documents[document_type]?.onCancel?.inventory_movements

  if (operation_id && cancelMovements) await res.connection.query(cancelInventoryMovements(), [operation_id])

  const stocks = req.body.inventory_movements.reduce((result, im) => {
    const detailQty = im.movement_type === types.inventoryMovementsTypes.OUT ? im.quantity : im.quantity * -1
    const newStock = { stock: im.stock + detailQty, product_id: im.product_id }
    const sameProducts = result?.flatMap(s => (Number(s.product_id) === Number(im.product_id) ? s : []))

    if (sameProducts?.length > 0) {
      const productStock = sameProducts.reverse()[0].stock

      return [...result, { ...newStock, stock: productStock + detailQty }]
    }

    return [...(result || []), newStock]
  }, [])

  const errors = stocks.flatMap(s => (s.stock < 0 ? `The stock for product with id ${s.product_id} cannot be less than zero` : []))

  if (errors.length > 0) throw new ValidatorException(errors)

  const updateStockPromises = stocks.map(s => res.connection.query(updateStock(), [s.stock, s.product_id]))
  await Promise.all(updateStockPromises)

  return {
    req,
    res: { ...res, statusCode: 200, data: { document_id, products: stocks }, message: 'Document cancelled successfully' },
  }
}

const cancelDocument = () => `
  UPDATE documents SET status = '${types.documentsStatus.CANCELLED}', cancel_reason = ?, updated_by = ? WHERE id = ?
`

const cancelInventoryMovements = () => `
  UPDATE inventory_movements SET status = '${types.documentsStatus.CANCELLED}' WHERE operation_id = ?
`

const updateStock = () => `UPDATE products SET stock = ? WHERE id = ?`

module.exports = handleCancelDocument
