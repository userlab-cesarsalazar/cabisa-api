// res.excludeProductOnCreateDetail: product_id
// res.saveInventoryUnitValueAsProductPrice: boolean,
// res.calculateSalesCommission: boolean

// req.body: {
//   document_id,
//   related_external_document_id,
//   related_internal_document_id,
//   product_id,
//   project_id,
//   comments,
//   received_by,
//   dispatched_by,
//   start_date,
//   end_date,
//   cancel_reason,
//   subtotal_amount,
//   sales_commission_amount,
//   total_discount_amount
//   total_tax_amount
//   total_amount,
//   payment_method,
//   credit_days,
//   products,
//   old_products,
// }

const handleUpdateDocument = async (req, res) => {
  const {
    document_id,
    related_external_document_id = null,
    related_internal_document_id = null,
    product_id = null,
    project_id = null,
    comments = null,
    received_by = null,
    dispatched_by = null,
    start_date = null,
    end_date = null,
    cancel_reason = null,
    subtotal_amount = null,
    sales_commission_amount = null,
    total_discount_amount = null,
    total_tax_amount = null,
    total_amount = null,
    description = null,
    payment_method = null,
    credit_days = null,
    products = [],
    old_products = [],
    created_at = null
  } = req.body

  await res.connection.query(updateDocument(), [
    related_external_document_id,
    related_internal_document_id,
    product_id,
    project_id,
    comments,
    received_by,
    dispatched_by,
    start_date,
    end_date,
    cancel_reason,
    subtotal_amount,
    sales_commission_amount,
    total_discount_amount,
    total_tax_amount,
    total_amount,
    description,
    payment_method,
    credit_days,
    req.currentUser.user_id,
    created_at,
    document_id,    
  ])

  const deleteProductIds = old_products.map(op => Number(op.product_id))
  const updateDocumentsProductsValues = products.flatMap(p => {
    if (Number(p.product_id) === Number(res.excludeProductOnCreateDetail)) return []

    return `(  
      ${document_id},
      ${p.product_id},
      ${p.service_type ? `'${p.service_type}'` : null},
      ${res.saveInventoryUnitValueAsProductPrice ? p.inventory_unit_value : p.product_price},
      ${p.product_quantity},
      ${p.tax_fee || 0},
      ${p.unit_tax_amount || 0},
      ${p.product_discount_percentage || null},
      ${p.product_discount || null},
      ${p.parent_product_id || null}
    )`
  })

  if (deleteProductIds && deleteProductIds[0]) await res.connection.query(deleteDocumentProducts(deleteProductIds), [document_id])
  if (updateDocumentsProductsValues && updateDocumentsProductsValues[0])
    await res.connection.query(updateDocumentsProducts(updateDocumentsProductsValues))

  return {
    req: { ...req, body: { ...req.body, document_id, related_internal_document_id } },
    res: { ...res, statusCode: 201, data: { document_id }, message: 'Documento creado exitosamente' },
  }
}

const updateDocument = () => `
  UPDATE documents
    SET
      related_external_document_id = ?,
      related_internal_document_id = ?,
      product_id = ?,
      project_id = ?,
      comments = ?,
      received_by = ?,
      dispatched_by = ?,
      start_date = ?,
      end_date = ?,
      cancel_reason = ?,
      subtotal_amount = ?,
      sales_commission_amount = ?,
      total_discount_amount = ?,
      total_tax_amount = ?,
      total_amount = ?,
      description = ?,
      payment_method = ?,
      credit_days = ?,
      updated_by = ?, 
      created_at = ?
  WHERE id = ?
`

const deleteDocumentProducts = productIds => `
  DELETE FROM documents_products WHERE document_id = ? AND product_id IN (${productIds.join(', ')})
`

const updateDocumentsProducts = valuesArray => `
  INSERT INTO documents_products (
    document_id,
    product_id,
    service_type,
    product_price,
    product_quantity,
    tax_fee,
    unit_tax_amount,
    discount_percentage,
    unit_discount_amount,
    parent_product_id
  )
  VALUES ${valuesArray.join(', ')}
  ON DUPLICATE KEY UPDATE
    service_type = VALUES(service_type),
    product_price = VALUES(product_price),
    product_quantity = VALUES(product_quantity),
    tax_fee = VALUES(tax_fee),
    unit_tax_amount = VALUES(unit_tax_amount),
    discount_percentage = VALUES(discount_percentage),
    unit_discount_amount = VALUES(unit_discount_amount),
    parent_product_id = VALUES(parent_product_id)
`

module.exports = handleUpdateDocument
