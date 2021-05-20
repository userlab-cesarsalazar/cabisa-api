const { documentsTypes, operationsTypes, inventoryMovementsTypes } = require('./types')

const documents = {
  [documentsTypes.PURCHASE_ORDER]: {
    requires: { authorization: false },
    onApprove: {
      operations: operationsTypes.PURCHASE,
    },
    onCancel: {
      inventory_movements: true,
    },
  },
  [documentsTypes.SELL_PRE_INVOICE]: {
    requires: { authorization: false },
    onApprove: {
      documents: documentsTypes.SELL_INVOICE,
    },
    onCancel: {
      inventory_movements: false,
    },
  },
  [documentsTypes.SELL_INVOICE]: {
    requires: { authorization: false },
    onApprove: {
      operations: operationsTypes.SELL,
    },
    onCancel: {
      inventory_movements: true,
    },
  },
  // ESTE GENERA LOS MOVIMIENTOS DE SALIDA
  [documentsTypes.RENT_PRE_INVOICE]: {
    requires: { authorization: false },
    onApprove: {
      documents: documentsTypes.RENT_INVOICE,
    },
    onCancel: {
      inventory_movements: true,
    },
  },
  // ESTE GENERA LOS MOVIMIENTOS DE ENTRADA
  [documentsTypes.RENT_INVOICE]: {
    requires: { authorization: false },
    onApprove: {
      operations: operationsTypes.RENT,
    },
    onCancel: {
      inventory_movements: true,
    },
  },
}

const operations = {
  [operationsTypes.SELL]: {
    initDocument: documentsTypes.SELL_PRE_INVOICE,
    finishDocument: documentsTypes.SELL_INVOICE,
    inventoryMovementsType: [inventoryMovementsTypes.OUT],
  },
  [operationsTypes.PURCHASE]: {
    initDocument: documentsTypes.PURCHASE_ORDER,
    hasExternalDocument: true,
    inventoryMovementsType: [inventoryMovementsTypes.IN],
  },
  [operationsTypes.RENT]: {
    initDocument: documentsTypes.RENT_PRE_INVOICE,
    finishDocument: documentsTypes.RENT_INVOICE,
    hasProductReturnCost: true,
    inventoryMovementsType: [inventoryMovementsTypes.OUT, inventoryMovementsTypes.IN], // if both are needed, keep the order in the array, first 'OUT' then 'IN'
  },
}

const inventory_movements = {
  [operationsTypes.SELL]: {
    [inventoryMovementsTypes.OUT]: { requires: { authorization: false } },
  },
  [operationsTypes.PURCHASE]: {
    [inventoryMovementsTypes.IN]: { requires: { authorization: false } },
  },
  [operationsTypes.RENT]: {
    [inventoryMovementsTypes.OUT]: { requires: { authorization: false } },
    [inventoryMovementsTypes.IN]: { requires: { authorization: true } },
  },
}

module.exports = {
  documents,
  inventory_movements,
  operations,
}
