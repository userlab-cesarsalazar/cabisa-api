const types = require('../types')
const { calculateInventoryCost } = require('../common')
const { updateProductsInventoryCosts } = require('../commonStorage')

// res.updateInventoryCost: boolean

// req.body: {
//   old_inventory_movements: [
//     {
//        inventory_movement_id,
//        product_id,
//        movement_type,
//        product_quantity,
//        unit_cost,
//        total_cost,
//        product_description,
//        product_code,
//        product_price,
//        stock,
//        inventory_unit_value,
//        inventory_total_value,
//        product_created_by,
//     },
//   ],
// }

const handleCancelInventoryMovements = async (req, res) => {
  const { old_inventory_movements, products } = req.body
  const { updateInventoryCost = false } = res

  const { inventoryMovementIds, oldInventoryProducts, productsInventoryValues } = old_inventory_movements.reduce((r, oim) => {
    const inventoryMovementId = oim.inventory_movement_id

    const isInventoryReceipt = oim.movement_type !== types.inventoryMovementsTypes.IN
    const productWithInventoryCost = calculateInventoryCost('weightedAverage', { product: oim, isInventoryReceipt })

    const productsInventoryValue = `(
      ${productWithInventoryCost.product_id},
      ${productWithInventoryCost.inventory_unit_cost},
      ${productWithInventoryCost.inventory_total_cost},
      '${productWithInventoryCost.description}',
      '${productWithInventoryCost.code}',
      ${productWithInventoryCost.created_by},
      ${req.currentUser || 1}
    )`

    return {
      ...r,
      inventoryMovementIds: [...(r.inventoryMovementIds || []), inventoryMovementId],
      oldInventoryProducts: [...(r.oldInventoryProducts || []), productWithInventoryCost],
      productsInventoryValues: [...(r.productsInventoryValues || []), productsInventoryValue],
    }
  }, {})

  const updatedProducts =
    products &&
    products[0] &&
    products.map(p => {
      const sameProduct = oldInventoryProducts.find(oip => Number(oip.product_id) === Number(p.product_id))

      if (!sameProduct) return p

      return {
        ...p,
        inventory_unit_value: sameProduct.inventory_unit_cost,
        inventory_total_value: sameProduct.inventory_total_cost,
        stock: sameProduct.inventory_quantity,
      }
    })

  if (!inventoryMovementIds || !inventoryMovementIds[0]) return { req, res }

  await res.connection.query(cancelInventoryMovements(inventoryMovementIds))

  if (updateInventoryCost) await res.connection.query(updateProductsInventoryCosts(productsInventoryValues))

  return { req: { ...req, body: { ...req.body, products: updatedProducts || oldInventoryProducts } }, res }
}

const cancelInventoryMovements = whereIn => `
  UPDATE inventory_movements SET status = '${types.inventoryMovementsStatus.CANCELLED}' WHERE id IN (${whereIn.join(', ')})
`

module.exports = handleCancelInventoryMovements
