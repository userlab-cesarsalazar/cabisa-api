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

const documentsPaymentMethods = {
  CARD: 'CARD',
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
}

const documentsTypes = {
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  SELL_PRE_INVOICE: 'SELL_PRE_INVOICE',
  SELL_INVOICE: 'SELL_INVOICE',
  RENT_PRE_INVOICE: 'RENT_PRE_INVOICE',
  RENT_INVOICE: 'RENT_INVOICE',
}

const documentsStatus = {
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  APPROVED: 'APPROVED',
}

const inventoryMovementsStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  CANCELLED: 'CANCELLED',
  APPROVED: 'APPROVED',
}

const inventoryMovementsTypes = {
  IN: 'IN',
  OUT: 'OUT',
}

const operationsTypes = {
  SELL: 'SELL',
  PURCHASE: 'PURCHASE',
  RENT: 'RENT',
}

const productsCategories = {
  EQUIPMENT: 'EQUIPMENT',
  PART: 'PART',
}

const productsStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
}

const productsTypes = {
  SERVICE: 'SERVICE',
  PRODUCT: 'PRODUCT',
}

const rolesStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
}

const stakeholdersStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
}

const stakeholdersTypes = {
  CLIENT_INDIVIDUAL: 'CLIENT_INDIVIDUAL',
  CLIENT_COMPANY: 'CLIENT_COMPANY',
  PROVIDER: 'PROVIDER',
}

const usersStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
}

module.exports = {
  actions,
  documentsPaymentMethods,
  documentsStatus,
  documentsTypes,
  inventoryMovementsStatus,
  inventoryMovementsTypes,
  operationsTypes,
  productsCategories,
  productsStatus,
  productsTypes,
  rolesStatus,
  stakeholdersStatus,
  stakeholdersTypes,
  usersStatus,
}
