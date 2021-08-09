const { creditsPolicy } = require('../types')
// importante especificar el document_type del documento a crear

// req.body: { stakeholder_id, project_id, document_type, comments, received_by, dispatched_by, start_date, end_date, service_type, payment_method, credit_days, description, products }

const handleCreateDocument = async (req, res) => {
  const {
    document_id,
    document_type,
    stakeholder_id,
    project_id = null,
    comments = null,
    received_by = null,
    dispatched_by = null,
    start_date = null,
    end_date = null,
    cancel_reason = null,
    subtotal_amount = null,
    total_discount_amount = null,
    total_tax_amount = null,
    total_amount = null,
    service_type = null,
    payment_method = null,
    credit_days = null,
    description = null,
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
    dispatched_by,
    start_date,
    end_date,
    cancel_reason,
    subtotal_amount,
    total_discount_amount,
    total_tax_amount,
    total_amount,
    service_type,
    payment_method,
    credit_days,
    Number(credit_days) > 0 ? creditsPolicy.creditStatusEnum.UNPAID : null,
    description,
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
        ${p.tax_fee},
        ${p.unit_tax_amount},
        ${p.product_discount_percentage || null},
        ${p.product_discount || null},
        ${p.parent_product_id || null}
      )`
  )

  await res.connection.query(createDocumentsProducts(documentsProductsValues))

  return {
    req: { ...req, body: { ...req.body, document_id: newDocumentId, related_internal_document_id } },
    res: { ...res, statusCode: 201, data: { document_id }, message: 'Documento creado exitosamente' },
  }
}

const createDocument = () => `
  INSERT INTO documents
    (
      document_type,
      stakeholder_id,
      project_id,
      comments,
      received_by,
      dispatched_by,
      start_date,
      end_date,
      cancel_reason,
      subtotal_amount,
      total_discount_amount,
      total_tax_amount,
      total_amount,
      service_type,
      payment_method,
      credit_days,
      credit_status,
      description,
      created_by
    )
  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`
const createDocumentsProducts = valuesArray => `
  INSERT INTO documents_products
    (
      document_id,
      product_id,
      product_price,
      product_quantity,
      tax_fee,
      unit_tax_amount,
      discount_percentage,
      unit_discount_amount,
      parent_product_id
    )
  VALUES ${valuesArray.join(', ')}
`

module.exports = handleCreateDocument
