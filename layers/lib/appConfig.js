const actions = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ACTIVE: 'ACTIVATE',
  INACTIVE: 'DEACTIVATE',
  APPROVED: 'APPROVE',
  CANCELLED: 'CANCEL',
}

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
    inventoryMovementsType: ['OUT', 'IN'],
  },
}

const inventory_movements = {
  requires: { authorization: false },
}

module.exports = {
  actions,
  documents,
  inventory_movements,
  operations,
}
