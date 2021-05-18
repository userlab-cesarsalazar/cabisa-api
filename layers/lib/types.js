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

const documentsTypes = {
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  SELL_PRE_INVOICE: 'SELL_PRE_INVOICE',
  SELL_INVOICE: 'SELL_INVOICE',
  RENT_PRE_INVOICE: 'RENT_PRE_INVOICE',
  RENT_INVOICE: 'RENT_INVOICE',
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

const productsStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
}

const productsTypes = {
  SERVICE: 'SERVICE',
  EQUIPMENT: 'EQUIPMENT',
  PART: 'PART',
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
  documentsTypes,
  inventoryMovementsStatus,
  inventoryMovementsTypes,
  operationsTypes,
  productsStatus,
  productsTypes,
  rolesStatus,
  stakeholdersStatus,
  stakeholdersTypes,
  usersStatus,
}
