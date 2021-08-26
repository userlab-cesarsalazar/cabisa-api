// products: { product_id, product_quantity, parent_product_id }
// productsFromDB: { product_id, product_type }
const parentChildProductsValidator = (currentProduct, products, productsFromDB) => {
  const types = require('../types')
  const errors = []

  const sameProduct = productsFromDB.find(ps => Number(ps.product_id) === Number(currentProduct.product_id)) || {}
  const newProduct = { ...currentProduct, ...sameProduct }

  if (newProduct.parent_product_id && newProduct.product_type !== types.productsTypes.PRODUCT)
    errors.push(
      `The child product of the product with id ${newProduct.parent_product_id} must have a product_type equal to: ${types.productsTypes.PRODUCT}`
    )

  if (!newProduct.parent_product_id) {
    const hasChildProduct = products.some(p => Number(p.parent_product_id) === Number(newProduct.product_id))

    if (newProduct.product_type !== types.productsTypes.SERVICE)
      errors.push(`The parent product with id ${newProduct.product_id} must have a product_type equal to: ${types.productsTypes.SERVICE}`)

    if (Number(newProduct.product_quantity) !== 1)
      errors.push(`The parent product with id ${newProduct.product_id} must have a product_quantity equal to one`)

    if (!hasChildProduct) errors.push(`The parent product with id ${newProduct.product_id} must have a linked child product`)
  }

  return errors
}

module.exports = parentChildProductsValidator
