// req.body: {
//   document_id,
//   related_external_document_id,
//   related_internal_document_id,
//   project_id,
//   comments,
//   received_by,
//   start_date,
//   end_date,
//   cancel_reason,
//   total_invoice,
//   service_type,
//   payment_method,
//   credit_days,
//   products,
//   old_products,
//   updated_by,
// }

const handleUpdateDocument = async (req, res) => {
  const {
    document_id,
    related_external_document_id = null,
    related_internal_document_id = null,
    project_id = null,
    comments = null,
    received_by = null,
    start_date = null,
    end_date = null,
    cancel_reason = null,
    total_invoice = null,
    service_type = null,
    payment_method = null,
    credit_days = null,
    products = [],
    old_products = [],
    updated_by = 1,
  } = req.body

  await res.connection.query(updateDocument(), [
    related_external_document_id,
    related_internal_document_id,
    project_id,
    comments,
    received_by,
    start_date,
    end_date,
    cancel_reason,
    total_invoice,
    service_type,
    payment_method,
    credit_days,
    updated_by,
    document_id,
  ])

  const deleteProductIds = old_products.flatMap(op => (products.some(p => Number(p.product_id) === Number(op.product_id)) ? [] : op.product_id))
  const updateDocumentsProductsValues = products.map(
    p =>
      `(  
          ${document_id},
          ${p.product_id},
          ${p.product_price},
          ${p.product_quantity},
          ${p.tax_fee},
          ${p.unit_tax_amount},
          ${p.product_discount_percentage || null},
          ${p.product_discount || null}
        )`
  )

  if (deleteProductIds.length > 0) await res.connection.query(deleteDocumentProducts(deleteProductIds), [document_id])
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
      project_id = ?,
      comments = ?,
      received_by = ?,
      start_date = ?,
      end_date = ?,
      cancel_reason = ?,
      total_invoice = ?,
      service_type = ?,
      payment_method = ?,
      credit_days = ?,
      updated_by = ?
  WHERE id = ?
`

const deleteDocumentProducts = productIds => `
  DELETE FROM documents_products WHERE document_id = ? AND product_id IN (${productIds.join(', ')})
`

const updateDocumentsProducts = valuesArray => `
  INSERT INTO documents_products
  (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount, discount_percentage, unit_discount_amount)
  VALUES ${valuesArray.join(', ')}
  ON DUPLICATE KEY UPDATE
    product_price = VALUES(product_price),
    product_quantity = VALUES(product_quantity),
    tax_fee = VALUES(tax_fee),
    unit_tax_amount = VALUES(unit_tax_amount),
    discount_percentage = VALUES(discount_percentage),
    unit_discount_amount = VALUES(unit_discount_amount)
`

module.exports = handleUpdateDocument
