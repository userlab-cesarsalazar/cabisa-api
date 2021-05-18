const documents = {
  PURCHASE_ORDER: {
    requires: { authorization: false },
    onAuthorize: {
      operations: 'PURCHASE',
    },
  },
  SELL_PRE_INVOICE: {
    requires: { authorization: false },
    onAuthorize: {
      documents: 'SELL_INVOICE',
    },
  },
  SELL_INVOICE: {
    requires: { authorization: false },
    onAuthorize: {
      operations: 'SELL',
    },
  },
  RENT_PRE_INVOICE: {
    requires: { authorization: false },
    onAuthorize: {
      documents: 'RENT_INVOICE',
    },
  },
  RENT_INVOICE: {
    requires: { authorization: false },
    onAuthorize: {
      operations: 'RENT',
    },
  },
}

const operations = {
  SELL: {
    initDocument: 'SELL_PRE_INVOICE',
    finishDocument: 'SELL_INVOICE',
    inventoryMovementsType: ['OUT'],
  },
  PURCHASE: {
    initDocument: 'PURCHASE_ORDER',
    hasExternalDocument: true,
    inventoryMovementsType: ['IN'],
  },
  RENT: {
    initDocument: 'RENT_PRE_INVOICE',
    finishDocument: 'RENT_INVOICE',
    hasProductReturnCost: true,
    inventoryMovementsType: ['OUT', 'IN'], // if both are needed, keep the order in the array, first 'OUT' then 'IN'
  },
}

const inventory_movements = {
  SELL: {
    OUT: { requires: { authorization: true } },
  },
  PURCHASE: {
    IN: { requires: { authorization: false } },
  },
  RENT: {
    OUT: { requires: { authorization: false } },
    IN: { requires: { authorization: true } },
  },
}

module.exports = {
  documents,
  inventory_movements,
  operations,
}
