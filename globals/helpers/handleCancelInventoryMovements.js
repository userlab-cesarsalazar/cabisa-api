const types = require('../types')
const { calculateInventoryCost } = require('../common')
const { updateProductsInventoryCosts } = require('../commonStorage')

// req.body: {
//   operation_type,
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
  const { old_inventory_movements, products, operation_type } = req.body

  const { inventoryMovementIds, oldInventoryProducts, productsInventoryValues } = old_inventory_movements.reduce((r, oim) => {
    const inventoryMovementId = oim.inventory_movement_id

    const sameUpdatedProduct = (r.updatedInventoryProducts || []).find(uip => Number(uip.product_id) === Number(oim.product_id))
    const updatedProductFields = sameUpdatedProduct
      ? {
          stock: sameUpdatedProduct.inventory_quantity,
          inventory_unit_value: sameUpdatedProduct.inventory_unit_cost,
          inventory_total_value: sameUpdatedProduct.inventory_total_cost,
        }
      : {}
    const product = { ...oim, ...updatedProductFields }
    const isInventoryReceipt = oim.movement_type !== types.inventoryMovementsTypes.IN
    const isPurchase = operation_type === types.operationsTypes.PURCHASE
    const productWithInventoryCost = calculateInventoryCost(null, { product, isInventoryReceipt, isPurchase })

    const productsInventoryValue = `(
      ${productWithInventoryCost.product_id},
      ${productWithInventoryCost.inventory_unit_cost},
      ${productWithInventoryCost.inventory_total_cost},
      '${productWithInventoryCost.description}',
      '${productWithInventoryCost.code}',
      ${productWithInventoryCost.created_by},
      ${req.currentUser.user_id}
    )`

    const sameInventoryCostProduct = (r.updatedInventoryProducts || []).find(
      uip => Number(uip.product_id) === Number(productWithInventoryCost.product_id)
    )
    const updatedInventoryProducts = sameInventoryCostProduct
      ? r.updatedInventoryProducts.map(uip =>
          Number(uip.product_id) === Number(productWithInventoryCost.product_id) ? productWithInventoryCost : uip
        )
      : [...(r.updatedInventoryProducts || []), productWithInventoryCost]

    return {
      ...r,
      inventoryMovementIds: [...(r.inventoryMovementIds || []), inventoryMovementId],
      oldInventoryProducts: [...(r.oldInventoryProducts || []), productWithInventoryCost],
      productsInventoryValues: [...(r.productsInventoryValues || []), productsInventoryValue],
      updatedInventoryProducts,
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

  await res.connection.query(updateProductsInventoryCosts(productsInventoryValues))

  return { req: { ...req, body: { ...req.body, products: updatedProducts || oldInventoryProducts } }, res }
}

const cancelInventoryMovements = whereIn => `
  UPDATE inventory_movements SET status = '${types.inventoryMovementsStatus.CANCELLED}' WHERE id IN (${whereIn.join(', ')})
`

module.exports = handleCancelInventoryMovements
