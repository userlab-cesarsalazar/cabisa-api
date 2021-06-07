// importante especificar el document_type del documento a crear

// req.body: { stakeholder_id, project_id, document_type, start_date, end_date, products }

const handleCreateDocument = async (req, res) => {
  const {
    document_id,
    stakeholder_id,
    project_id,
    comments,
    received_by,
    document_type,
    start_date,
    end_date,
    payment_method,
    products,
    created_by = 1,
  } = req.body

  const related_internal_document_id = document_id

  await res.connection.query(createDocument(), [
    document_type,
    stakeholder_id,
    project_id,
    comments,
    received_by,
    start_date,
    end_date,
    payment_method,
    created_by,
  ])
  const newDocumentId = await res.connection.geLastInsertId()

  const documentsProductsValues = products.map(
    p =>
      `(
        ${newDocumentId},
        ${p.product_id},
        ${p.product_price},
        ${p.product_quantity},
        ${p.product_return_cost ?? null},
        ${p.tax_fee},
        ${p.unit_tax_amount},
        ${p.product_discount_percentage},
        ${p.product_discount}
      )`
  )

  await res.connection.query(createDocumentsProducts(documentsProductsValues))

  return {
    req: { ...req, body: { ...req.body, document_id: newDocumentId, related_internal_document_id } },
    res: { ...res, statusCode: 201, data: { document_id }, message: 'Document created successfully' },
  }
}

const createDocument = () => `
  INSERT INTO documents
  (document_type, stakeholder_id, project_id, comments, received_by, start_date, end_date, payment_method, created_by)
  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
`
const createDocumentsProducts = valuesArray => `
  INSERT INTO documents_products
  (document_id, product_id, product_price, product_quantity, product_return_cost, tax_fee, unit_tax_amount, discount_percentage, unit_discount_amount)
  VALUES ${valuesArray.join(', ')}
`

module.exports = handleCreateDocument
