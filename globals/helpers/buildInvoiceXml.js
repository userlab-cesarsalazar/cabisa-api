

const buildXml = (data,moment) => {
    //BUILD XML HEADER 

    let xml_header = headerInvoice(data, moment)
    let xml_details = ``

    data.items.forEach( (x)=> {
        let str = `<dte:Item BienOServicio="B" NumeroLinea="1">
                    <dte:Cantidad>1.00</dte:Cantidad>
                    <dte:UnidadMedida>UND</dte:UnidadMedida>
                    <dte:Descripcion>${x.description}</dte:Descripcion>
                    <dte:PrecioUnitario>${x.price}</dte:PrecioUnitario>
                    <dte:Precio>${x.price}</dte:Precio>
                    <dte:Descuento>${x.discount}</dte:Descuento>
        <dte:Impuestos>
            <dte:Impuesto>
                <dte:NombreCorto>IVA</dte:NombreCorto>
                <dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable>
                <dte:MontoGravable>107.14</dte:MontoGravable>
                <dte:MontoImpuesto>12.86</dte:MontoImpuesto>
            </dte:Impuesto>
        </dte:Impuestos>
        <dte:Total>120.00</dte:Total>
      </dte:Item>`
            
        xml_details = xml_details + str
    })

    let xmlBody = `<dte:Items>${xml_details}</dte:Items>`

    let xmlTotales = `<dte:Totales>
                        <dte:TotalImpuestos>
                        <dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="${data.invoice.totalTaxes}"></dte:TotalImpuesto>
                        </dte:TotalImpuestos>
                        <dte:GranTotal>${data.invoice.total}</dte:GranTotal>
                    </dte:Totales>
                </dte:DatosEmision>
            </dte:DTE>`

    let xmlDescription = `<dte:Adenda>
                            <Codigo_cliente>C01</Codigo_cliente>
                            <Observaciones>ESTA ES UNA ADENDA</Observaciones>
                        </dte:Adenda>
                </dte:SAT>
        </dte:GTDocumento>`            


    let xml = xml_header + xmlBody + xmlTotales + xmlDescription
    xml = xml.replace(/\n/g,'')
    return xml
}


const headerInvoice = (data, moment) => {
    let headerStructure = `
    <dte:GTDocumento xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="0.1" xsi:schemaLocation="http://www.sat.gob.gt/dte/fel/0.2.0">
    <dte:SAT ClaseDocumento="dte">
      <dte:DTE ID="DatosCertificados">
        <dte:DatosEmision ID="DatosEmision">
          <dte:DatosGenerales CodigoMoneda="GTQ" FechaHoraEmision="${moment().tz('America/Guatemala').format('YYYY-MM-DD')}" Tipo="FACT">
          </dte:DatosGenerales>
          <dte:Emisor AfiliacionIVA="GEN" CodigoEstablecimiento="1" CorreoEmisor="cabisarent@hotmail.com " NITEmisor="53982746" NombreComercial="Cabisa" NombreEmisor="Cabisa">
            <dte:DireccionEmisor>
              <dte:Direccion>CIUDAD</dte:Direccion>
              <dte:CodigoPostal>01051</dte:CodigoPostal>
              <dte:Municipio>Villa Canales</dte:Municipio>
              <dte:Departamento>GUATEMALA</dte:Departamento>
              <dte:Pais>GT</dte:Pais>
            </dte:DireccionEmisor>
          </dte:Emisor>
          <dte:Receptor CorreoReceptor="${data.client.email}" IDReceptor="${data.client.nit}" NombreReceptor="${data.client.name}">
            <dte:DireccionReceptor>
              <dte:Direccion>${data.client.address}</dte:Direccion>
              <dte:CodigoPostal>${data.client.zip}</dte:CodigoPostal>
              <dte:Municipio>${data.client.municipio}</dte:Municipio>
              <dte:Departamento>${data.client.departamento}</dte:Departamento>
              <dte:Pais>GT</dte:Pais>
            </dte:DireccionReceptor>
          </dte:Receptor>
          <dte:Frases>
            <dte:Frase CodigoEscenario="1" TipoFrase="1"></dte:Frase>
          </dte:Frases>`
    
    return headerStructure
  }