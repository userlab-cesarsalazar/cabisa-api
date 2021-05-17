const { appConfig, db, request, response, handleRead, ValidatorException } = require(`${process.env['FILE_ENVIRONMENT']}/layers/lib`)
const storage = require('./storage')

module.exports.read = async event => {
  try {
    const req = await request({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage, nestedFieldsKeys: ['products'] })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.create = async event => {
  const inputType = {
    stakeholder_id: { type: ['string', 'number'], required: true },
    related_external_document_id: { type: ['string', 'number'] },
    operation_type: {
      type: { enum: ['SELL', 'PURCHASE', 'RENT'] },
      required: true,
    },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    products: {
      type: 'array',
      required: true,
      fields: {
        type: 'object',
        fields: {
          product_id: { type: ['string', 'number'], required: true },
          product_quantity: { type: 'number', min: 0, required: true },
          product_price: { type: 'number', min: 0, required: true },
        },
      },
    },
  }

  try {
    const req = await request({ event, inputType, currentAction: appConfig.actions.CREATE })
    const { stakeholder_id, operation_type, products } = req.body
    // can(req.currentAction, operation_type)
    const document_type = appConfig.operations[operation_type]?.initDocument

    const errors = []
    const movementType = appConfig.operations[operation_type].inventoryMovementsType
    const productsMap = products.reduce((r, p) => ({ ...r, [p.product_id]: [...(r[p.product_id] ?? []), p.product_id] }), {})
    const duplicateProducts = Object.keys(productsMap).flatMap(k => (productsMap[k].length > 1 ? k : []))
    const productsIds = products.map(p => p.product_id)
    const productsStocks = await db.query(storage.findProducts(productsIds))
    const missingProducts = products.flatMap(p => (!productsStocks.some(ps => Number(ps.product_id) === Number(p.product_id)) ? p.product_id : []))
    const requiredFields = ['stakeholder_id', 'operation_type', 'products']
    const requiredProductFields = ['product_id', 'product_quantity', 'product_price']
    if (appConfig.operations[operation_type]?.hasExternalDocument && !appConfig.documents[document_type].requires.authorization)
      requiredFields.push('related_external_document_id')
    if (operation_type === 'RENT') {
      requiredFields.push('start_date', 'end_date')
      requiredProductFields.push('product_return_cost')
    }
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredProductErrorFields = requiredProductFields.some(k => products.some(p => !p[k]))
    const [stakeholderExists] = await db.query(storage.findStakeholder({ id: stakeholder_id }))

    if (inputType.operation_type.type.enum.every(v => v !== operation_type))
      errors.push(`The field operation_type must contain one of these values: ${inputType.operation_type.type.enum.join(', ')}`)
    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`The field ${ef} is required`))
    if (requiredProductErrorFields) errors.push(`The fields ${requiredProductFields.join(', ')} in products are required`)
    if (!stakeholderExists) errors.push('The provided stakeholder_id is not registered')
    if (duplicateProducts.length > 0) duplicateProducts.forEach(id => errors.push(`The products with id ${id} is duplicated`))
    if (missingProducts.length > 0) missingProducts.forEach(id => errors.push(`The products with id ${id} is not registered`))
    if (movementType.some(mt => mt === 'OUT')) {
      const productsStocksMap = products.reduce((r, p) => {
        const product = productsStocks.find(ps => Number(ps.product_id) === Number(p.product_id))

        if (product.stock) return { ...r, [p.product_id]: product.stock - p.product_quantity }
        else return r
      }, {})

      const negativeStocks = Object.keys(productsStocksMap).flatMap(k => (productsStocksMap[k] < 0 ? k : []))
      negativeStocks.forEach(id => errors.push(`The product with id ${id} cannot have negative stock`))
    }

    if (errors.length > 0) throw new ValidatorException(errors)

    const res = await db.transaction(async connection => {
      const addCreateDocument = async (req, res) => {
        const { stakeholder_id, document_type, start_date, end_date, products, created_by = 1 } = req.body

        await connection.query(res.storage.createDocument(), [document_type, stakeholder_id, start_date, end_date, created_by])
        const document_id = await connection.geLastInsertId()

        const documentsProductsValues = products.map(
          p => `(${document_id}, ${p.product_id}, ${p.product_price}, ${p.product_quantity}, ${p.product_return_cost})`
        )
        await connection.query(res.storage.createDocumentsProducts(documentsProductsValues))

        return {
          req: { ...req, body: { ...req.body, document_id } },
          res: { ...res, statusCode: 201, data: { document_id }, message: 'Document created successfully' },
        }
      }

      const addAuthorizeDocument = async (req, res) => {
        const { document_id, related_internal_document_id, related_external_document_id, document_type, authorized_by = 1 } = req.body

        const requireAuthorization = appConfig.documents[document_type].requires.authorization

        if (req.currentAction === appConfig.actions.CREATE && requireAuthorization) return { req, res }

        const onAuthorize = appConfig.documents[document_type].onAuthorize
        if (onAuthorize.documents) {
          const documentCreated = await addCreateDocument(
            { ...req, body: { ...req.body, document_type: onAuthorize.documents, related_internal_document_id: document_id } },
            res
          )

          return addAuthorizeDocument(documentCreated.req, documentCreated.res)
        }

        const operation = onAuthorize.operations
          ? await addCreateOperation({ ...req, body: { ...req.body, operation_type: onAuthorize.operations } }, res)
          : {}

        if (appConfig.operations[operation_type].hasExternalDocument) {
          await connection.query(res.storage.authorizeExternalDocument(), [
            operation.req.body.operation_id,
            related_external_document_id,
            authorized_by,
            document_id,
          ])
        }

        if (appConfig.operations[operation_type].finishDocument) {
          await connection.query(res.storage.authorizeInternalDocument(), [
            operation.req.body.operation_id,
            related_internal_document_id,
            authorized_by,
            document_id,
          ])
          await connection.query(res.storage.authorizeInternalDocument(), [
            operation.req.body.operation_id,
            document_id,
            authorized_by,
            related_internal_document_id,
          ])
        }

        return {
          req: { ...req, body: { ...req.body, operation_id: operation.req.body.operation_id } },
          res: {
            ...res,
            statusCode: 200,
            data: { operation_id: operation.req.body.operation_id, document_id, related_internal_document_id, related_external_document_id },
            message: 'Document authorized successfully',
          },
        }
      }

      const addCreateOperation = async (req, res) => {
        const { operation_type, created_by = 1 } = req.body

        await connection.query(res.storage.createOperation(), [operation_type, created_by])
        const operation_id = await connection.geLastInsertId()

        return {
          req: { ...req, body: { ...req.body, operation_id } },
          res: { ...res, statusCode: 201, data: { operation_id }, message: 'Operation created successfully' },
        }
      }

      const addCreateInventoryMovements = async (req, res) => {
        const movementTypes = appConfig.operations[operation_type].inventoryMovementsType

        const { products, operation_id } = req.body

        if (!operation_id) return { req, res }

        const inventoryMovements = movementTypes.reduce((movementsResult, movement_type) => {
          const movements = products.map(p => {
            const unit_cost = movement_type === 'IN' ? (operation_type === 'RENT' ? p.product_return_cost : p.product_price) : null

            return { operation_id, product_id: p.product_id, quantity: p.product_quantity, unit_cost, movement_type }
          })

          return [...movementsResult, ...movements]
        }, [])

        const inventoryMovmentsQueryValues = inventoryMovements.reduce((result, im) => {
          const insertValues = `(${im.operation_id}, ${im.product_id}, ${im.quantity}, ${im.unit_cost}, '${im.movement_type}')`
          const whereConditions = {
            operationsIds: [...(result?.whereConditions?.operationsIds || []), im.operation_id],
          }

          return {
            ...result,
            insertValues: [...(result.insertValues || []), insertValues],
            where: { ...(result.whereConditions || []), ...whereConditions },
          }
        }, {})

        const { insertValues, where } = inventoryMovmentsQueryValues

        await connection.query(res.storage.createInventoryMovements(insertValues))
        const [inventory_movements] = await connection.query(res.storage.findCreatedInventoryMovements(where.operationsIds))

        return {
          req: { ...req, body: { ...req.body, inventory_movements } },
          res: { ...res, statusCode: 201, data: { inventory_movements }, message: 'Inventory movements created successfully' },
        }
      }

      const addAuthorizeInventoryMovements = async (req, res) => {
        const { inventory_movements, created_by = 1 } = req.body

        const requireAuthorization = appConfig.inventory_movements.requires.authorization

        if (req.currentAction === appConfig.actions.CREATE && requireAuthorization) return { req, res }

        const { inventoryMovementsIds } = inventory_movements.reduce((result, im) => {
          const isDuplicateId = result?.inventoryMovementsIds?.some(id => id === im.inventory_movement_id)

          return {
            ...result,
            inventoryMovementsIds: isDuplicateId ? result.inventoryMovementsIds : [...(result.inventoryMovementsIds || []), im.inventory_movement_id],
          }
        }, {})

        const [currentDetails] = await connection.query(res.storage.findInventoryMovementsDetails(inventoryMovementsIds))

        const currentInventoryMovements = inventory_movements.reduce((r, im) => {
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

          const { movement_type, stock, total_qty, detail_qty, quantity, inventory_movement_id } = movementDetail
          const errors = []
          const inventoryMovements = {
            ...movementDetail,
            remainningQty: total_qty - quantity,
          }

          if (quantity + detail_qty > total_qty)
            errors.push(`The quantity for the movement with id ${inventory_movement_id} cannot be more than ${total_qty}`)
          if (movement_type == 'OUT' && stock < total_qty)
            errors.push(`The stock cannot be negative for the movement with id ${inventory_movement_id}`)

          return {
            ...result,
            inventoryMovements: [...(result.inventoryMovements || []), inventoryMovements],
            errors: [...(result.errors || []), ...errors],
          }
        }, {})

        if (errors.length > 0) throw new ValidatorException(errors)

        const stocks = currentInventoryMovements.reduce((result, im) => {
          const detailQty = im.movement_type === 'IN' ? im.quantity : im.quantity * -1
          const newStock = { stock: im.stock + detailQty, product_id: im.product_id }
          const stocks = result?.stocks?.reduce((r, s) => {
            if (s.product_id === im.product_id) return [...r, { ...r.s, stock: (s.stock || 0) + detailQty }]
            else return [...r, newStock]
          }, []) || [newStock]

          return [...(result || []), ...stocks]
        }, [])

        const authorizeMovements = async im => {
          await connection.query(res.storage.createInventoryMovementsDetails(), [
            im.inventory_movement_id,
            im.quantity,
            im.storage_location ? im.storage_location : null,
            im.comments ? im.comments : null,
            created_by,
          ])

          const status = im.remainningQty === 0 ? 'COMPLETED' : im.remainningQty === Number(im.total_qty) ? 'PENDING' : 'PARTIAL'

          await connection.query(res.storage.authorizeInventoryMovements(), [status, im.inventory_movement_id])
        }

        const inventoryMovementsDetailsPromises = inventoryMovements.map(im => authorizeMovements(im))
        const updateStockPromises = stocks.map(s => connection.query(res.storage.updateStock(), [s.stock, s.product_id]))
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

      const getProductsReturnCost = async () => {
        if (operation_type === 'RENT') {
          const productsReturnCost = await db.query(storage.findProductReturnCost(productsIds))

          if (!productsReturnCost?.length > 0) return products

          return products.map(p => {
            const product = productsReturnCost.find(prc => Number(prc.product_id) === Number(p.product_id))

            return { ...p, product_return_cost: product.product_return_cost ?? null }
          })
        }

        return products
      }

      const productsWithReturnCost = await getProductsReturnCost()

      const documentCreated = await addCreateDocument(
        { ...req, body: { ...req.body, document_type, products: productsWithReturnCost } },
        { connection, storage }
      )
      const documentAuthorized = await addAuthorizeDocument(documentCreated.req, documentCreated.res)
      const inventoryMovementsCreated = await addCreateInventoryMovements(documentAuthorized.req, documentAuthorized.res)
      const inventoryMovementsAuthorized = await addAuthorizeInventoryMovements(inventoryMovementsCreated.req, inventoryMovementsCreated.res)

      return inventoryMovementsAuthorized.res
    })

    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}

module.exports.authorize = async event => {
  try {
    return await response({ req, res })
  } catch (error) {
    console.log(error)
    return await response({ error })
  }
}
