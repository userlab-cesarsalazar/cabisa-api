
const cancelXml = (data, moment) => {
    let cancelInvocieXml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <dte:GTAnulacionDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.1.0" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:n1="http://www.altova.com/samplexml/other-namespace" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="0.1" xsi:schemaLocation="http://www.sat.gob.gt/dte/fel/0.1.0 C:\Users\User\Desktop\FEL\Esquemas\GT_AnulacionDocumento-0.1.0.xsd">
        <dte:SAT>
            <dte:AnulacionDTE ID="DatosCertificados">
                <dte:DatosGenerales FechaEmisionDocumentoAnular="${data.certificateDate}" FechaHoraAnulacion="${moment().tz('America/Guatemala').format()}" ID="DatosAnulacion" IDReceptor="${data.nit}" MotivoAnulacion="${data.description}" NITEmisor="53982746" NumeroDocumentoAAnular="${data.uuid}" />          
            </dte:AnulacionDTE>
        </dte:SAT>
    </dte:GTAnulacionDocumento>
    `
    cancelInvocieXml = cancelInvocieXml.replace(/\n/g, '')
    return cancelInvocieXml
  }

module.exports = cancelXml