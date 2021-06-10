// importante especificar el document_type del documento a crear

// req.body: { document_type, start_date, end_date, products }

const handleUpdateDocument = async (req, res) => {
  const {
    document_id,
    related_external_document_id,
    start_date,
    end_date,
    products,
    old_products,
    project_id,
    related_internal_document_id,
    comments,
    received_by,
    updated_by = 1,
  } = req.body

  await res.connection.query(updateDocument(), [
    related_external_document_id,
    start_date,
    end_date,
    project_id,
    related_internal_document_id,
    comments,
    received_by,
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
          ${p.product_return_cost ? p.product_return_cost : null},
          ${p.tax_fee},
          ${p.unit_tax_amount}
        )`
  )

  if (deleteProductIds.length > 0) await res.connection.query(deleteDocumentProducts(deleteProductIds), [document_id])
  await res.connection.query(updateDocumentsProducts(updateDocumentsProductsValues))

  return {
    req: { ...req, body: { ...req.body, document_id, related_internal_document_id } },
    res: { ...res, statusCode: 201, data: { document_id }, message: 'Document created successfully' },
  }
}

const updateDocument = () => `
  UPDATE documents
    SET
      related_external_document_id = ?,
      start_date = ?,
      end_date = ?,
      project_id = ?,
      related_internal_document_id = ?,
      comments = ?,
      received_by = ?,
      updated_by = ?
  WHERE id = ?
`

const deleteDocumentProducts = productIds => `
  DELETE FROM documents_products WHERE document_id = ? AND product_id IN (${productIds.join(', ')})
`

const updateDocumentsProducts = valuesArray => `
  INSERT INTO documents_products
  (document_id, product_id, product_price, product_quantity, product_return_cost, tax_fee, unit_tax_amount)
  VALUES ${valuesArray.join(', ')}
  ON DUPLICATE KEY UPDATE
    product_price = VALUES(product_price),
    product_quantity = VALUES(product_quantity),
    product_return_cost = VALUES(product_return_cost),
    tax_fee = VALUES(tax_fee),
    unit_tax_amount = VALUES(unit_tax_amount)
`

module.exports = handleUpdateDocument
