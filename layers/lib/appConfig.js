const documents = {
  PURCHASE_ORDER: {
    requires: { authorization: false },
    defaults: { status: 'PENDING' },
    onAuthorize: {
      operations: true,
    },
  },
  SELL_PRE_INVOICE: {
    requires: { authorization: false },
    defaults: { status: 'PENDING' },
    onAuthorize: {
      documents: 'SELL_INVOICE',
    },
  },
  SELL_INVOICE: {
    requires: { authorization: false },
    defaults: { status: 'APPROVED' },
    onAuthorize: {
      operations: true,
    },
  },
  RENT_PRE_INVOICE: {
    requires: { authorization: false },
    defaults: { status: 'PENDING' },
    onAuthorize: {
      documents: 'SELL_INVOICE',
    },
  },
  RENT_INVOICE: {
    requires: { authorization: false },
    defaults: { status: 'APPROVED' },
    onAuthorize: {
      operations: true,
    },
  },
}

const operations = {
  SELL: {
    initDocument: 'SELL_PRE_INVOICE',
    finishDocument: 'SELL_INVOICE',
    onCreate: {
      inventory_movements: 'OUT',
    },
  },
  PURCHASE: {
    initDocument: 'PURCHASE_ORDER',
    finishDocument: 'PURCHASE_ORDER',
    onCreate: {
      inventory_movements: 'IN',
    },
  },
  RENT: {
    initDocument: 'RENT_PRE_INVOICE',
    finishDocument: 'RENT_INVOICE',
    onCreate: {
      inventory_movements: 'OUT',
    },
  },
}

const inventory_movements = {
  requires: { authorization: false },
  defaults: { status: 'COMPLETED' },
  onCreate: {
    inventory_movements_details: true,
  },
}

module.exports = {
  documents,
  inventory_movements,
  operations,
}
