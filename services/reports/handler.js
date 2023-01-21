const mysql = require('mysql2/promise')
const { mysqlConfig, helpers, types } = require(`${process.env['FILE_ENVIRONMENT']}/globals`)
const storage = require('./storage')
const { handleRead, handleRequest, handleResponse } = helpers
const db = mysqlConfig(mysql)
const Excel = require('exceljs')

module.exports.clientsAccountState = async event => {
  try {
    const req = await handleRequest({ event })

    req.hasPermissions([types.permissions.REPORTS])

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getClientAccountState })

    const data = res.data.map(d => ({
      ...d,
      current_credit: Number(d.total_credit) - Number(d.paid_credit), // unpaid_credit
      credit_balance: Number(d.credit_limit) - (Number(d.total_credit) - Number(d.paid_credit)), // available_credit
    }))

    return await handleResponse({ req, res: { ...res, data } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.accountsReceivable = async event => {
  try {
    const req = await handleRequest({ event })

    req.hasPermissions([types.permissions.REPORTS])

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getAccountsReceivable })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.sales = async event => {
  try {
    const req = await handleRequest({ event })

    req.hasPermissions([types.permissions.REPORTS])

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getSales })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.inventory = async event => {
  try {
    const req = await handleRequest({ event })

    req.hasPermissions([types.permissions.REPORTS])

    const res = await handleRead(req, {
      dbQuery: db.query,
      storage: storage.getInventory,
      nestedFieldsKeys: ['inventory_movements', 'inventory_movements_details'],
      uniqueKey: ['product_id'],
    })

    const resData = res.data.map(product => {
      const inventoryMovements = product.inventory_movements.reduce((r, im) => {
        const isDuplicateMovement = r.some(rim => Number(rim.inventory_movement_id) === Number(im.inventory_movement_id))

        if (isDuplicateMovement) return r
        else return [...r, im]
      }, [])

      const inventoryMovementsWithDetais = inventoryMovements.map(im => {
        const inventory_movements_details = product.inventory_movements_details.flatMap(imd =>
          Number(imd.inventory_movement_id) === Number(im.inventory_movement_id) ? imd : []
        )

        return { ...im, inventory_movements_details }
      })

      delete product.inventory_movements_details

      return { ...product, inventory_movements: inventoryMovementsWithDetais }
    })

    return await handleResponse({ req, res: { ...res, data: resData } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.getDocumentReport = async (event, context) => {    
  try {
    console.log("---REPORTE FACTURAS---")
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getInvoice, nestedFieldsKeys: ['products'] })
    
    const data = res.data.map(invoice => ({
      ...invoice,
      discount_percentage: invoice.products[0].discount_percentage,
    }))

    return await handleResponse({ req, res: { ...res, data } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.getCashReceipts = async (event, context) => {    
  try {
    const req = await handleRequest({ event })
    console.log(req)
    console.log(req.query.document_number)
    
    let systemInvoice =  req.queryStringParameters.document_number ? (req.queryStringParameters.document_number.toLowerCase() === '$like:%factura del sistema%') : false

    if(systemInvoice){
      delete req.query.document_number
    }

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getReceipts, nestedFieldsKeys: ['products', 'payments'] })
    console.log(res.data[0])
    let data = res.data[0]
      ? res.data.map(d => ({
          ...d,
          discount_percentage: d.products[0].discount_percentage,          
          due: d.payments && d.payments[0] ? d.payments.reduce((r, p) => {
            const isDuplicate = r[0] && r.some(rp => Number(rp.payment_id) === Number(p.payment_id))

            if (isDuplicate || !p.payment_id || p.is_deleted) return r
            else return [...r, p]
          }, []).filter(item => item.is_deleted === 0).reduce((sum ,{payment_amount}) => sum + payment_amount , 0) : 0,
          products:
            d.products && d.products[0]
              ? d.products.reduce((r, p) => {
                  const isDuplicate =
                    r[0] && r.some(rp => Number(rp.id) === Number(p.id) && Number(rp.parent_product_id) === Number(p.parent_product_id))

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
      
      if(systemInvoice){
        data = data.filter(item => item.document_number === null)
      }

    return await handleResponse({ req, res: { ...res, data } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.getCashManualReceipts = async (event, context) => {    
  try {
    const req = await handleRequest({ event })

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getManualReceipts, nestedFieldsKeys: ['payments'] })
      
    const data = res.data[0]
      ? res.data.map(d => ({
          ...d,                    
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

//export excel

module.exports.exportReport = async event => {
  
  try {
    let manifestoHeaders
    let result,report,file

    const req = await handleRequest({ event })
    const reportType  = req.queryStringParameters.reportType    
    delete req.query.reportType

    let systemInvoice =  req.queryStringParameters.document_number ? (req.queryStringParameters.document_number.toLowerCase() === '$like:%factura del sistema%') : false
    
    if(systemInvoice){
      console.log("entro aqui perro")
      delete req.query.document_number
    }

    switch (reportType) {
      case "documentReport":
        result = await handleRead(req, { dbQuery: db.query, storage: storage.getInvoice, nestedFieldsKeys: ['products'] })    
        manifestoHeaders = [
          { name: 'Nro. Nota de servicio', column: 'related_internal_document_id', width: 18 },
          { name: 'Nro. Documento', column: 'document_number', width: 12 },
          { name: 'UUID', column: 'uuid', width: 36 },
          { name: 'Cliente', column: 'stakeholder_name', width: 48 },
          { name: 'Fecha de facturacion', column: 'created_at', width: 18, numFmt: 'dd-mm-yyyy hh:mm:ss'},          
          { name: 'Total', column: 'total', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Metodo de pago', column: 'payment_method_spanish', width: 15 },
          { name: 'Estado', column: 'status_spanish', width: 15 }      
        ]
        break;
      case "cashReceipts":
        result = await handleRead(req, { dbQuery: db.query, storage: storage.getReceipts, nestedFieldsKeys: ['products', 'payments'] })        
        result.data = result.data[0]
      ? result.data.map(d => 
        {
          let composeData = { 
          ...d,
          discount_percentage: d.products[0].discount_percentage,          
          due: d.payments && d.payments[0] ? d.payments.reduce((r, p) => {
            const isDuplicate = r[0] && r.some(rp => Number(rp.payment_id) === Number(p.payment_id))

            if (isDuplicate || !p.payment_id || p.is_deleted) return r
            else return [...r, p]
          }, []).filter(item => item.is_deleted === 0).reduce((sum ,{payment_amount}) => sum + payment_amount , 0) : 0,
          products:
            d.products && d.products[0]
              ? d.products.reduce((r, p) => {
                  const isDuplicate =
                    r[0] && r.some(rp => Number(rp.id) === Number(p.id) && Number(rp.parent_product_id) === Number(p.parent_product_id))

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
        }

        composeData.differenceAmount = composeData.total_amount - composeData.due
        composeData.document_number = composeData.document_number === null ? 'Factura del sistema' : composeData.document_number                
        return composeData
      })
      : []  
      
        manifestoHeaders = [
          { name: 'Nro. Nota de servicio', column: 'related_internal_document_id', width: 18 },
          { name: 'Nro. Documento', column: 'document_number', width: 12 },                    
          { name: 'Fecha de facturacion', column: 'created_at', width: 18, numFmt: 'dd-mm-yyyy hh:mm:ss'},
          { name: 'Cliente', column: 'stakeholder_name', width: 48 },
          { name: 'Monto Pagado', column: 'due', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Monto Pendiente', column: 'differenceAmount', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Monto Total', column: 'total_amount', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Metodo de pago', column: 'payment_method_spanish', width: 15 },
          { name: 'Estado', column: 'credit_status_spanish', width: 15 }
        ]
        break;
      case "manualCashReceipts":
        result = await handleRead(req, { dbQuery: db.query, storage: storage.getManualReceipts, nestedFieldsKeys: ['payments'] })
        manifestoHeaders = [          
          { name: 'Nro. Recibo', column: 'id', width: 12 },                    
          { name: 'Fecha de facturacion', column: 'created_at', width: 18, numFmt: 'dd-mm-yyyy hh:mm:ss'},
          { name: 'Cliente', column: 'stakeholder_name', width: 48 },
          { name: 'Monto', column: 'total_amount', width: 14 ,numFmt: '"Q"#,##0.00'},          
          { name: 'Estado', column: 'status', width: 15 }
        ]
        break;    
      default:
        break;
    }
                
    const manifestData = result.data ? result.data : []
          console.log(manifestData)
    report = await standardReport({
      sheets: [
        {
          name: `FACTURAS`,
          headers: manifestoHeaders,
          data: systemInvoice ? manifestData.filter(item => item.document_number === 'Factura del sistema') : manifestData,
        }        
      ],
    })

    file = await report.xlsx.writeBuffer()

    let data = {"reportExcel":file.toString('base64')}
    
    return await handleResponse({ req, res: { ...result, data } })
  } catch (error) {
    return await handleResponse({ error })    
  }
}

const standardReport = data =>
  new Promise((resolve, reject) => {

    console.log("data >> del fuclo ",data)
    
    let workbook = new Excel.Workbook()
    workbook.creator = 'Cabisa'
    workbook.created = new Date()

    let auxCol = null

    if (data && data.sheets && data.sheets.length > 0) {
      
      data.sheets.forEach((sheet, i) => {
        let newSheet = workbook.addWorksheet(sheet.name, {
          headerFooter: {
            firstHeader: 'Hello Exceljs',
            firstFooter: 'Hello World',
          },
        })

        newSheet.columns = sheet.headers.map(header => ({
          header: header.name,
          key: header.column,
          width: header.width || 15,
        }))

        newSheet.getRow(1).font = { bold: true, color: { argb: 'ffffff' } }

        newSheet.getRow(1).alignment = { wrapText: true }

        newSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '053E81' },
        }

        newSheet.addRows(sheet.data.map(d => d))

        sheet.headers.forEach((h, c) => {
          if (h.formula) {
            auxCol = newSheet.getColumn(h.column)
            auxCol.eachCell((cell, i) => {
              if (i > 1) {
                cell.value = { formula: h.formula.replace(/#/g, i) }
              }
            })
          }

          if (h.numFmt) {
            newSheet.getColumn(h.column).numFmt = h.numFmt
          }
        })

        if (sheet.totals && sheet.totals.length > 0) {
          sheet.totals.forEach(t => {
            newSheet.getCell(`${t}${sheet.data.length + 2}`).value = {
              formula: `SUM(${t}2:${t}${sheet.data.length + 1})`,
            }
            newSheet.getCell(`${t}${sheet.data.length + 2}`).font = {
              bold: true,
            }
          })
        }
        if (sheet.individualCells && sheet.individualCells.length > 0) {
          sheet.individualCells.forEach(cell => {
            newSheet.getCell(`${cell.name}`).value = cell.value ? cell.value : { formula: `${cell.formula}` }
            newSheet.getCell(`${cell.name}`).font = { bold: cell.bold }
          })
        }
      })
    }

    resolve(workbook)
  })