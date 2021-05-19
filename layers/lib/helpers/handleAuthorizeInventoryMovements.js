const types = require('../types')
const appConfig = require('../appConfig')
const { ValidatorException } = require('../common')

const handleAuthorizeInventoryMovements = async (req, res) => {
  const { inventory_movements, operation_type, created_by = 1 } = req.body

  const inventoryMovementTypes = appConfig.inventory_movements[operation_type]
  const requiresAuth =
    inventoryMovementTypes && Object.keys(inventoryMovementTypes).flatMap(k => (inventoryMovementTypes[k]?.requires?.authorization ? k : []))

  const { inventoryMovementsIds } = inventory_movements.reduce((result, im) => {
    if (req.currentAction === types.actions.CREATE && requiresAuth?.some(ra => ra === im?.movement_type)) return result

    const isDuplicateId = result?.inventoryMovementsIds?.some(id => id === im.inventory_movement_id)

    return {
      ...result,
      inventoryMovementsIds: isDuplicateId ? result.inventoryMovementsIds : [...(result.inventoryMovementsIds || []), im.inventory_movement_id],
    }
  }, {})

  if (!inventoryMovementsIds) return { req, res }

  const [currentDetails] = await res.connection.query(res.storage.findInventoryMovementsDetails(inventoryMovementsIds))

  const currentInventoryMovements = inventory_movements.reduce((r, im) => {
    if (req.currentAction === types.actions.CREATE && requiresAuth?.some(ra => ra === im?.movement_type)) return r

    const sameMovement = currentDetails.find(cd => Number(cd.inventory_movement_id) === Number(im.inventory_movement_id))

    if (sameMovement) return [...r, { ...im, ...sameMovement }]
    else return [...r, im]
  }, [])

  const { inventoryMovements, errors } = inventoryMovementsIds.reduce((result, movementId) => {
    const movementDetail = currentInventoryMovements.reduce((detailsResult, detail) => {
      if (Number(movementId) === Number(detail.inventory_movement_id)) {
        const detailQty = detailsResult.quantity || 0
        const quantity = detailQty + detail.quantity

        return { ...detailsResult, ...detail, quantity }
      }

      return detailsResult
    }, {})

    const { movement_type, stock, total_qty, detail_qty, quantity, inventory_movement_id, product_id } = movementDetail
    const errors = []
    const inventoryMovements = {
      ...movementDetail,
      remainningQty: total_qty - quantity,
    }

    if (quantity + detail_qty > total_qty)
      errors.push(`The quantity for the movement with id ${inventory_movement_id} cannot be more than ${total_qty}`)
    if (movement_type == types.inventoryMovementsTypes.OUT && stock < total_qty)
      errors.push(`The stock cannot be negative for the product with id ${product_id}`)

    return {
      ...result,
      inventoryMovements: [...(result.inventoryMovements || []), inventoryMovements],
      errors: [...(result.errors || []), ...errors],
    }
  }, {})

  if (errors.length > 0) throw new ValidatorException(errors)

  const stocks = currentInventoryMovements.reduce((result, im) => {
    const detailQty = im.movement_type === types.inventoryMovementsTypes.IN ? im.quantity : im.quantity * -1
    const newStock = { stock: im.stock + detailQty, product_id: im.product_id }
    const sameProducts = result?.flatMap(s => (Number(s.product_id) === Number(im.product_id) ? s : []))

    if (sameProducts?.length > 0) {
      const productStock = sameProducts.reverse()[0].stock

      return [...result, { ...newStock, stock: productStock + detailQty }]
    }

    return [...(result || []), newStock]
  }, [])

  const authorizeMovements = async im => {
    await res.connection.query(res.storage.createInventoryMovementsDetails(), [
      im.inventory_movement_id,
      im.quantity,
      im.storage_location ? im.storage_location : null,
      im.comments ? im.comments : null,
      created_by,
    ])

    const status =
      im.remainningQty === 0
        ? types.inventoryMovementsStatus.APPROVED
        : Number(im.remainningQty) === Number(im.total_qty)
        ? types.inventoryMovementsStatus.PENDING
        : types.inventoryMovementsStatus.PARTIAL

    await res.connection.query(res.storage.authorizeInventoryMovements(), [status, im.inventory_movement_id])
  }

  const inventoryMovementsDetailsPromises = inventoryMovements.map(im => authorizeMovements(im))
  const updateStockPromises = stocks.map(s => res.connection.query(res.storage.updateStock(), [s.stock, s.product_id]))
  await Promise.all(inventoryMovementsDetailsPromises, updateStockPromises)

  return {
    req,
    res: {
      ...res,
      statusCode: 200,
      data: { stocks },
      message: 'Inventory movements authorized successfully',
    },
  }
}

module.exports = handleAuthorizeInventoryMovements
