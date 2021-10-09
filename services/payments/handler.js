const mysql = require('mysql2/promise')
const { types, mysqlConfig, helpers, ValidatorException, groupJoinResult, getFormattedDates } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const storage = require('./storage')
const {
  handleRequest,
  handleResponse,
  handleRead,
  handleUpdateStakeholderCredit,
  handleUpdateCreditStatus,
  handleUpdateCreditPaidDate,
  handleUpdateDocumentPaidAmount,
} = helpers
const db = mysqlConfig(mysql)

module.exports.readServiceVersion = async () => {
  try {
    const servicePackage = require('./package.json')

    const res = { statusCode: 200, data: { version: servicePackage.version }, message: 'Successful response' }

    return await handleResponse({ req: {}, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.read = async event => {
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.findAllBy, nestedFieldsKeys: ['products', 'payments'] })

    const data = res.data[0]
      ? res.data.map(d => ({
          ...d,
          discount_percentage: d.products[0].discount_percentage,
          products:
            d.products && d.products[0]
              ? d.products.reduce((r, p) => {
                  const isDuplicate = r[0] && r.some(rp => Number(rp.id) === Number(p.id))

                  if (isDuplicate) return r
                  else return [...r, p]
                }, [])
              : [],
          payments:
            d.payments && d.payments[0]
              ? d.payments.reduce((r, p) => {
                  const isDuplicate = r[0] && r.some(rp => Number(rp.payment_id) === Number(p.payment_id))

                  if (isDuplicate || !p.payment_id || p.is_deleted) return r
                  else return [...r, p]
                }, [])
              : [],
        }))
      : []

    return await handleResponse({ req, res: { ...res, data } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.crupdate = async event => {
  try {
    const inputType = {
      document_id: { type: ['number', 'string'], required: true },
      payments: {
        type: 'array',
        fields: {
          type: 'object',
          fields: {
            payment_id: { type: ['string', 'number'] },
            payment_amount: { type: 'number', min: 1, required: true },
            payment_method: { type: { enum: types.paymentMethods }, required: true },
            payment_date: { type: 'string', required: true },
          },
        },
      },
    }
    const req = await handleRequest({ event, inputType })
    req.hasPermissions([types.permissions.PAGOS])

    const { document_id, payments } = req.body
    const errors = []
    const requiredFields = ['document_id']
    const requiredPaymentFields = ['payment_amount', 'payment_method', 'payment_date']
    const requiredErrorFields = requiredFields.filter(k => !req.body[k])
    const requiredPaymentErrorFields = requiredPaymentFields.some(k => payments.some(p => !p[k] || p[k] <= 0))
    const rawDocument = await db.query(storage.findDocumentPayments(), [document_id])
    const [document] = rawDocument ? groupJoinResult({ data: rawDocument, nestedFieldsKeys: ['old_payments'], uniqueKey: ['document_id'] }) : []
    const documentOldPayments =
      document && document.old_payments && document.old_payments[0] ? document.old_payments.flatMap(op => (op.is_deleted ? [] : op)) : []
    const invalidPaymentMethod =
      payments && payments[0] && payments.find(p => Object.keys(types.paymentMethods).every(k => types.paymentMethods[k] !== p.payment_method))

    const oldPaidCreditAmount =
      documentOldPayments && documentOldPayments[0] && documentOldPayments.reduce((r, op) => r + (op.is_deleted ? 0 : Number(op.payment_amount)), 0)
    const paidCreditAmount = payments && payments[0] && payments.reduce((r, p) => r + Number(p.payment_amount), 0)
    const stakeholderPaidCredit = Number(document.stakeholder_paid_credit) - oldPaidCreditAmount + paidCreditAmount
    const documentCreditAmount = document && document.total_amount ? Number(document.total_amount) : 0

    if (requiredErrorFields.length > 0) requiredErrorFields.forEach(ef => errors.push(`El campo ${ef} es requerido`))
    if (requiredPaymentErrorFields) errors.push(`Los campos ${requiredPaymentFields.join(', ')} son obligatorios`)
    if (!document || !document.document_id)
      errors.push(`El documento debe ser del tipo ${types.documentsTypes.SELL_INVOICE} o ${types.documentsTypes.RENT_INVOICE}`)
    if (!document || !document.credit_days) errors.push(`El documento debe estar asociado a un credito`)
    if (paidCreditAmount > documentCreditAmount) errors.push(`El total de los pagos no puede ser superior al total del credito para este documento`)
    if (invalidPaymentMethod)
      errors.push(
        `The field credit_days must contain one of these values: ${Object.keys(types.creditsPolicy.creditDaysEnum)
          .map(k => types.creditsPolicy.creditDaysEnum[k])
          .join(', ')}`
      )

    if (errors.length > 0) throw new ValidatorException(errors)

    const getCreditStatus = (paidCreditAmount, documentCreditAmount, documentCreditStatus) => {
      if (paidCreditAmount === documentCreditAmount) return types.creditsPolicy.creditStatusEnum.PAID
      if (documentCreditStatus === types.creditsPolicy.creditStatusEnum.DEFAULT) return documentCreditStatus
      return types.creditsPolicy.creditStatusEnum.UNPAID
    }
    const stakeholderTotalCredit = Number(document.stakeholder_total_credit)
    const credit_status = getCreditStatus(paidCreditAmount, documentCreditAmount, document.credit_status)

    const { res } = await db.transaction(async connection => {
      await handleUpdateCreditStatus(
        { ...req, body: { credit_status, document_id, related_internal_document_id: document.related_internal_document_id } },
        { connection }
      )

      await handleUpdateStakeholderCredit(
        { ...req, body: { stakeholder_id: document.stakeholder_id, total_credit: stakeholderTotalCredit, paid_credit: stakeholderPaidCredit } },
        { connection }
      )

      await handleUpdateCreditPaidDate(
        {
          ...req,
          body: { document_id, creditPaidDate: credit_status === types.creditsPolicy.creditStatusEnum.PAID ? new Date().toISOString() : null },
        },
        { connection }
      )

      await handleUpdateDocumentPaidAmount(
        {
          ...req,
          body: { document_id, paid_credit: paidCreditAmount },
        },
        { connection }
      )

      const deletePaymentIds =
        documentOldPayments &&
        documentOldPayments[0] &&
        documentOldPayments.flatMap(op =>
          payments && payments[0] && payments.some(p => Number(p.payment_id) === Number(op.payment_id)) ? [] : op.payment_id
        )
      const crupdatePaymentsValues = payments.map(p => {
        const oldPayment =
          documentOldPayments && documentOldPayments[0] && documentOldPayments.find(op => Number(op.payment_id) === Number(p.payment_id))
        const createdAt = oldPayment && oldPayment.created_at ? oldPayment.created_at : new Date()
        const { payment_date, created_at } = getFormattedDates({ payment_date: p.payment_date, created_at: createdAt })

        return `(
              ${p.payment_id ? p.payment_id : null},
              ${document_id},
              '${p.payment_method}',
              ${p.payment_amount},
              '${payment_date}',
              '${created_at}',
              ${oldPayment && oldPayment.created_by ? oldPayment.created_by : req.currentUser.user_id}
            )`
      })

      if (deletePaymentIds && deletePaymentIds[0]) await connection.query(storage.deletePayments(deletePaymentIds))
      if (crupdatePaymentsValues && crupdatePaymentsValues[0]) await connection.query(storage.crupdatePayments(crupdatePaymentsValues))
      const [updatedPayments] = await connection.query(storage.getPaymentsByDocumentId(), [document_id])

      return {
        req,
        res: { statusCode: 200, data: { payments: updatedPayments }, message: 'Pagos actualizados exitosamente' },
      }
    })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.cronUpdateCreditStatus = async () => {
  try {
    const creditStatus = types.creditsPolicy.creditStatusEnum.DEFAULT
    const documents = await db.query(storage.findDocumentsWithDefaultCredits())

    if (documents.length > 0) {
      const creditStatusValues = documents.map(d => `(${d.id}, ${d.stakeholder_id}, '${creditStatus}', ${d.created_by}, ${d.updated_by})`)

      await db.query(storage.bulkUpdateCreditStatus(creditStatusValues))
    }

    return await handleResponse({
      req: {},
      res: { statusCode: 200, data: { documents: documents.map(d => d.id) }, message: 'Documento actualizado exitosamente' },
    })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}
