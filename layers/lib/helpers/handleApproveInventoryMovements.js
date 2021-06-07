const types = require('../types')
const { ValidatorException } = require('../common')

// req.body: {
//   inventory_movements: [
//     { movement_type, stock, quantity, product_id }
//   ]
// }

const handleApproveInventoryMovements = async (req, res) => {
  const { inventory_movements, created_by = 1 } = req.body

  const { inventoryMovementsIds } = inventory_movements.reduce((result, im) => {
    const isDuplicateId = result?.inventoryMovementsIds?.some(id => id === im.inventory_movement_id)

    return {
      ...result,
      inventoryMovementsIds: isDuplicateId ? result.inventoryMovementsIds : [...(result.inventoryMovementsIds || []), im.inventory_movement_id],
    }
  }, {})

  if (!inventoryMovementsIds) return { req, res }

  const [currentDetails] = await res.connection.query(findInventoryMovementsDetails(inventoryMovementsIds))

  const currentInventoryMovements = inventory_movements.reduce((r, im) => {
    const sameMovement = currentDetails.find(cd => Number(cd.inventory_movement_id) === Number(im.inventory_movement_id))

    if (sameMovement) return [...r, { ...im, ...sameMovement }]
    else return [...r, im]
  }, [])

  const { inventoryMovements, errors } = inventoryMovementsIds.reduce((result, movementId) => {
    const movementDetail = currentInventoryMovements.reduce((detailsResult, detail) => {
      if (Number(movementId) === Number(detail.inventory_movement_id)) {
        const approvedQty = detailsResult.quantity || 0
        const quantity = approvedQty + detail.quantity

        return { ...detailsResult, ...detail, quantity }
      }

      return detailsResult
    }, {})

    const errors = []
    const inventoryMovements = {
      ...movementDetail,
      remainningQty: movementDetail.total_qty - movementDetail.quantity,
    }

    return {
      ...result,
      inventoryMovements: [...(result.inventoryMovements || []), inventoryMovements],
      errors: [...(result.errors || []), ...errors],
    }
  }, {})

  if (errors.length > 0) throw new ValidatorException(errors)

  const authorizeMovements = async im => {
    await res.connection.query(createInventoryMovementsDetails(), [
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

    await res.connection.query(authorizeInventoryMovements(), [status, im.inventory_movement_id])
  }

  const inventoryMovementsDetailsPromises = inventoryMovements.map(im => authorizeMovements(im))
  await Promise.all(inventoryMovementsDetailsPromises)

  return {
    req: { ...req, body: { ...req.body, inventory_movements: inventoryMovements } },
    res: {
      ...res,
      statusCode: 200,
      data: { inventory_movements: inventoryMovements },
      message: 'Inventory movements approved successfully',
    },
  }
}

const findInventoryMovementsDetails = whereIn => `
  SELECT im.id AS inventory_movement_id, imd.quantity AS approved_qty, im.quantity AS total_qty, im.movement_type, p.id AS product_id, p.stock
  FROM inventory_movements im
  LEFT JOIN inventory_movements_details imd ON imd.inventory_movement_id = im.id
  LEFT JOIN products p ON p.id = im.product_id
  WHERE im.id IN (${whereIn.join(', ')})
`

const createInventoryMovementsDetails = () => `
  INSERT INTO inventory_movements_details
  (inventory_movement_id, quantity, storage_location, comments, created_by)
  VALUES(?, ?, ?, ?, ?)
`

const authorizeInventoryMovements = () => `UPDATE inventory_movements SET status = ? WHERE id = ?`

module.exports = handleApproveInventoryMovements
