const handleCreateDocument = async (req, res) => {
  const { stakeholder_id, document_type, start_date, end_date, products, created_by = 1 } = req.body

  await res.connection.query(res.storage.createDocument(), [document_type, stakeholder_id, start_date, end_date, created_by])
  const document_id = await res.connection.geLastInsertId()

  const documentsProductsValues = products.map(
    p => `(${document_id}, ${p.product_id}, ${p.product_price}, ${p.product_quantity}, ${p.product_return_cost ?? null})`
  )
  await res.connection.query(res.storage.createDocumentsProducts(documentsProductsValues))

  return {
    req: { ...req, body: { ...req.body, document_id } },
    res: { ...res, statusCode: 201, data: { document_id }, message: 'Document created successfully' },
  }
}

module.exports = handleCreateDocument
