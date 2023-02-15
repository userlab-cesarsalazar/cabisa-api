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
      paid_credit : Number(d.paid_credit),
      credit_limit: Number(d.credit_limit),
      total_credit : d.total_charge,
      current_credit: d.total_charge, // unpaid_credit
      credit_balance: ((Number(d.total_charge)) - Number(d.paid_credit)), // available_credit
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
      ? res.data.map(d => {        
        let composeData = {
          ...d,
          due: d.payments && d.payments[0] ? d.payments.reduce((r, p) => {
            const isDuplicate = r[0] && r.some(rp => Number(rp.payment_id) === Number(p.payment_id))

            if (isDuplicate || !p.payment_id || p.is_deleted) return r
            else return [...r, p]
          }, []).filter(item => item.is_deleted === 0).reduce((sum ,{payment_amount}) => sum + payment_amount , 0) : 0,
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
        return composeData
      })
      : []

    return await handleResponse({ req, res: { ...res, data } })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

module.exports.getServiceOrders = async event => {
  try {
    const req = await handleRequest({ event })

    req.hasPermissions([types.permissions.REPORTS])

    const res = await handleRead(req, { dbQuery: db.query, storage: storage.getServiceOrders, nestedFieldsKeys: ['products'] })

    return await handleResponse({ req, res })
  } catch (error) {
    console.log(error)
    return await handleResponse({ error })
  }
}

//export excel

module.exports.exportReport = async event => {
  
  try {
    let manifestoHeaders
    let manifestoHeadersProducts
    let result,report,file

    const req = await handleRequest({ event })
    const reportType  = req.queryStringParameters.reportType      
    delete req.query.reportType    

    let systemInvoice =  req.queryStringParameters.document_number ? (req.queryStringParameters.document_number.toLowerCase() === '$like:%factura del sistema%') : false
    
    if(systemInvoice && reportType === "cashReceipts"){      
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
          { name: 'Metodo de pago', column: 'payment_method_spanish', width: 17 },
          { name: 'Estado', column: 'status_spanish', width: 17 }      
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
        console.log("composeData >>", composeData)
        return composeData
      })
      : []  
      
        manifestoHeaders = [
          { name: 'Nro. Nota de servicio', column: 'related_internal_document_id', width: 18 },
          { name: 'Nro. Documento', column: 'document_number', width: 17 },                    
          { name: 'Fecha de facturacion', column: 'created_at', width: 18, numFmt: 'dd-mm-yyyy hh:mm:ss'},
          { name: 'Cliente', column: 'stakeholder_name', width: 48 },
          { name: 'Monto Pagado', column: 'due', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Monto Pendiente', column: 'differenceAmount', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Monto Total', column: 'total_amount', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Metodo de pago', column: 'payment_method_spanish', width: 17 },
          { name: 'Estado', column: 'credit_status_spanish', width: 17 }
        ]
        break;
      case "manualCashReceipts":
        result = await handleRead(req, { dbQuery: db.query, storage: storage.getManualReceipts, nestedFieldsKeys: ['payments'] })
        result.data = result.data[0]
        ? result.data.map(d => 
          {
            let composeData = { 
            ...d,            
            due: d.payments && d.payments[0] ? d.payments.reduce((r, p) => {
              const isDuplicate = r[0] && r.some(rp => Number(rp.payment_id) === Number(p.payment_id))
  
              if (isDuplicate || !p.payment_id || p.is_deleted) return r
              else return [...r, p]
            }, []).filter(item => item.is_deleted === 0).reduce((sum ,{payment_amount}) => sum + payment_amount , 0) : 0,
           
            payments:
            d.payments && d.payments[0]
              ? d.payments.reduce((r, p) => {
                  const isDuplicate = r[0] && r.some(rp => Number(rp.payment_id) === Number(p.payment_id))

                  if (isDuplicate || !p.payment_id || p.is_deleted) return r
                  else return [...r, p]
                }, [])
              : []
          }
  
          composeData.differenceAmount = composeData.total_amount - composeData.due          
          return composeData
        })
        : []  

        
        manifestoHeaders = [          
          { name: 'Nro. Recibo', column: 'id', width: 12 },                    
          { name: 'Fecha de facturacion', column: 'created_at', width: 18, numFmt: 'dd-mm-yyyy hh:mm:ss'},
          { name: 'Cliente', column: 'stakeholder_name', width: 48 },
          { name: 'Monto Pagado', column: 'due', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Monto Pendiente', column: 'differenceAmount', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Monto Total', column: 'total_amount', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Estado', column: 'status_spanish', width: 17 }
        ]
        break;    
      case "clientReport":
          req.hasPermissions([types.permissions.REPORTS])
          result = await handleRead(req, { dbQuery: db.query, storage: storage.getClientAccountState })
          result.data = result.data[0] ? result.data.map(d => ({
          ...d,
          paid_credit : Number(d.paid_credit),
          credit_limit: Number(d.credit_limit),
          total_credit : d.total_charge,
          current_credit: d.total_charge,
          credit_balance: ((Number(d.total_charge)) - Number(d.paid_credit)),
          total_charge: d.total_charge === null ? 0 : d.total_charge
        })) : []

        manifestoHeaders = [          
          { name: 'Codigo Cliente', column: 'id', width: 12 },                    
          { name: 'Nombre o razon social', column: 'name', width: 28},
          { name: 'Nit', column: 'nit', width: 15},
          { name: 'Fecha de Creacion', column: 'created_at', width: 18,numFmt: 'dd-mm-yyyy hh:mm:ss' },
          { name: 'Tipo', column: 'stakeholder_type_spanish', width: 18 },          
          { name: 'Cargos', column: 'total_charge', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Pagado', column: 'paid_credit', width: 14 ,numFmt: '"Q"#,##0.00'},
          { name: 'Balance', column: 'credit_balance', width: 14 ,numFmt: '"Q"#,##0.00'},          
        ]
        break;
      case "inventoryReport": case "inventoryReportDetail":
        req.hasPermissions([types.permissions.REPORTS])

        result = await handleRead(req, {
          dbQuery: db.query,
          storage: storage.getInventory,
          nestedFieldsKeys: ['inventory_movements', 'inventory_movements_details'],
          uniqueKey: ['product_id'],
        })
                
        result.data = result.data.map(product => {
          const inventoryMovements = product.inventory_movements.reduce((r, im) => {
            const isDuplicateMovement = r.some(rim => Number(rim.inventory_movement_id) === Number(im.inventory_movement_id))
    
            if (isDuplicateMovement) return r
            else return [...r, im]
          }, [])
    
          const inventoryMovementsWithDetais = inventoryMovements.map(im => {
            const inventory_movements_details = product.inventory_movements_details.flatMap(imd =>
              Number(imd.inventory_movement_id) === Number(im.inventory_movement_id) ? imd : []
            ) 
    
            return { ...im, inventory_movements_details, name:product.description }
          })
    
          delete product.inventory_movements_details

          if(reportType === "inventoryReport"){
            return { ...product, inventory_movements: inventoryMovementsWithDetais }
          } else{                 
            return inventoryMovementsWithDetais
          }                   
        })
                              
        if(reportType === "inventoryReport"){

          manifestoHeaders = [          
            { name: 'Codigo', column: 'code', width: 12 },                    
            { name: 'Nombre Producto', column: 'description', width: 28},
            { name: 'Costo Unitario promedio', column: 'inventory_unit_value', width: 28,numFmt: '"Q"#,##0.00'},
            { name: 'Existencias', column: 'stock', width: 18 },
            { name: 'valor total', column: 'inventory_total_value', width: 18 ,numFmt: '"Q"#,##0.00'},
            { name: 'Categoria', column: 'product_category_spanish', width: 18 },
            { name: 'Estado', column: 'status', width: 14}          
          ]
        }else{
          
          result.data = result.data[0]      

          manifestoHeaders = [          
            { name: 'Fecha', column: 'created_at', width: 19,numFmt: 'dd-mm-yyyy hh:mm:ss'},                    
            { name: 'Nombre Producto', column: 'name', width: 30},
            { name: 'Autorizado por', column: 'creator_name', width: 16},
            { name: 'Existencias del movimiento', column: 'quantity', width: 16 },
            { name: 'Valor Unitiario del movimiento', column: 'unit_cost', width: 16 ,numFmt: '"Q"#,##0.00'},
            { name: 'Valor Total del movimiento', column: 'total_cost', width: 16 ,numFmt: '"Q"#,##0.00'},
            { name: 'Existencias actuales', column: 'inventory_quantity', width: 16 },
            { name: 'Valor unitario promedio', column: 'inventory_unit_cost', width: 16,numFmt: '"Q"#,##0.00'},
            { name: 'Valor total actual', column: 'inventory_total_cost', width: 16,numFmt: '"Q"#,##0.00'}          
          ]
        }        
          break; 
      case "salesReport":
        req.hasPermissions([types.permissions.REPORTS])
        result = await handleRead(req, { dbQuery: db.query, storage: storage.getSales })
        manifestoHeaders = [          
          { name: 'Tipo', column: 'document_type_spanish', width: 15 },                    
          { name: '# Nota de servicio', column: 'related_internal_document_id', width: 28},
          { name: '# Documento', column: 'document_number_report', width: 15},
          { name: 'Fecha', column: 'created_at', width: 18,numFmt: 'dd-mm-yyyy hh:mm:ss' },
          { name: 'Metodo de pago', column: 'payment_method_spanish', width: 18 },
          { name: 'Monto', column: 'total_amount', width: 14 ,numFmt: '"Q"#,##0.00'},          
          { name: 'Estado', column: 'credit_status_spanish', width: 18},
          { name: 'Cliente', column: 'stakeholder_name', width: 20},
          { name: 'Email', column: 'email', width: 30},
          { name: 'Telefono', column: 'phone', width: 18},
          { name: 'Direccion', column: 'address', width: 30},
          { name: 'Encargado(Cliente)', column: 'business_man', width: 18},
          { name: 'Quien Entrega', column: 'dispatched_by', width: 18},
          { name: 'Quien Recibe', column: 'received_by', width: 18},
          { name: 'Vendedor', column: 'seller_name', width: 18}
        ]
        break
      case "serviceOrders":
          req.hasPermissions([types.permissions.REPORTS])
          result = await handleRead(req, { dbQuery: db.query, storage: storage.getServiceOrders, nestedFieldsKeys: ['products'] })
          console.log("RESULT >>> ",result)
          manifestoHeaders = [                      
            { name: '# Nota de servicio', column: 'id', width: 28},            
            { name: 'Cliente', column: 'stakeholder_name', width: 20},                                    
            { name: 'Proyecto', column: 'project_name', width: 20},                        
            { name: 'Fecha Inicio (Proyecto)', column: 'project_start_date', width: 18,numFmt: 'dd-mm-yyyy hh:mm:ss' },
            { name: 'Fecha Final (Proyecto)', column: 'project_end_date', width: 18,numFmt: 'dd-mm-yyyy hh:mm:ss' },
            { name: 'Estado', column: 'status_spanish', width: 18},
            { name: 'Observaciones', column: 'comments', width: 35}                                    
          ]
          manifestoHeadersProducts = [
            { name: 'Referencia Nota de servicio', column: 'nota_id', width: 18},
            { name: 'Codigo Producto', column: 'code', width: 18},
            { name: 'Producto', column: 'description', width: 45},
            { name: 'Tipo', column: 'service_type_spanish', width: 20},
            { name: 'Precio', column: 'total_product_amount', width: 20,numFmt: '"Q"#,##0.00'},
            { name: 'Cantidad', column: 'quantity', width: 20}            
          ]
      default:
        break;
    }
                
    const manifestData = result.data ? result.data : []
    
    if(reportType === "serviceOrders"){
      
      const manifestDataProducts = manifestData.flatMap((it) => {
        let modifiedProducts = it.products.map(v => ({...v, nota_id: it.id}))        
        return modifiedProducts
      })

      report = await standardReport({
        sheets: [
          {
            name: `NOTA DE SERVICIO`,
            headers: manifestoHeaders,
            data: systemInvoice ? manifestData.filter(item => item.document_number === 'Factura del sistema') : manifestData,
          },
          {
            name: `DETALLE NOTA DE SERVICIO`,
            headers: manifestoHeadersProducts,
            data: manifestDataProducts
          }
        ],
      }) 
    }else{
      report = await standardReport({
        sheets: [
          {
            name: `INFORMACION`,
            headers: manifestoHeaders,
            data: systemInvoice ? manifestData.filter(item => item.document_number === 'Factura del sistema') : manifestData,
          }        
        ],
      })
    }
              
    file = await report.xlsx.writeBuffer()

    let data = {"reportExcel":file.toString('base64')}
    
    return await handleResponse({ req, res: { ...result, data } })
  } catch (error) {
    return await handleResponse({ error })    
  }
}

const standardReport = data =>
  new Promise((resolve, reject) => {
    
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

        newSheet.autoFilter = {
          from: {
            row: 1,
            column: 1
          },
          to: {
            row: 1,
            column: newSheet.columns.length
          }
        };

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