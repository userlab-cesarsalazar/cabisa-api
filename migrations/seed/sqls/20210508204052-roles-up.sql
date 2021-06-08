INSERT INTO roles (name, permissions) VALUES
	 ('ADMIN', '[{"id": 1, "edit": true, "name": "Configuracion general", "view": true, "create": true, "delete": true}, {"id": 2, "edit": true, "name": "Usuarios", "view": true, "create": true, "delete": true}, {"id": 3, "edit": true, "name": "Reportes", "view": true, "create": true, "delete": true}, {"id": 4, "edit": true, "name": "Facturacion", "view": true, "create": true, "delete": true}, {"id": 5, "edit": true, "name": "Inventario", "view": true, "create": true, "delete": true}, {"id": 6, "edit": true, "name": "Ventas", "view": true, "create": true, "delete": true}, {"id": 7, "edit": true, "name": "Clientes", "view": true, "create": true, "delete": true}]'),
	 ('SELLS', '[{"id": 4, "edit": true, "name": "Facturacion", "view": true, "create": true, "delete": true}, {"id": 5, "edit": true, "name": "Inventario", "view": true, "create": true, "delete": true}, {"id": 6, "edit": true, "name": "Ventas", "view": true, "create": true, "delete": true}, {"id": 7, "edit": true, "name": "Clientes", "view": true, "create": true, "delete": true}]'),
	 ('WAREHOUSE', '[{"id": 3, "edit": true, "name": "Reportes", "view": true}]'),
	 ('OPERATOR', '[{"id": 4, "edit": true, "name": "Facturacion", "view": true, "create": true, "delete": true}, {"id": 5, "edit": true, "name": "Inventario", "view": true, "create": true, "delete": true}, {"id": 6, "edit": true, "name": "Ventas", "view": true, "create": true, "delete": true}]');

-- INSERT INTO roles
-- VALUES ('ADMIN', 'ACTIVE', '[
--   "STAKEHOLDER_CREATE",
--   "STAKEHOLDER_DELETE",
--   "STAKEHOLDER_READ",
--   "STAKEHOLDER_UPDATE",
--   "INVENTORY_CREATE",
--   "INVENTORY_DELETE",
--   "INVENTORY_READ",
--   "INVENTORY_UPDATE",
--   "INVOICE_CREATE",
--   "INVOICE_DELETE",
--   "INVOICE_READ",
--   "INVOICE_UPDATE",
--   "REPORT_CREATE",
--   "REPORT_DELETE",
--   "REPORT_READ",
--   "REPORT_UPDATE",
--   "SELL_CREATE",
--   "SELL_DELETE",
--   "SELL_READ",
--   "SELL_UPDATE",
--   "USER_CREATE",
--   "USER_DELETE",
--   "USER_READ",
--   "USER_UPDATE"
-- ]');

-- INSERT INTO roles
-- VALUES ('SALES', 'ACTIVE', '[
--   "CLIENT_CREATE",
--   "CLIENT_DELETE",
--   "CLIENT_READ",
--   "CLIENT_UPDATE",
--   "INVENTORY_CREATE",
--   "INVENTORY_DELETE",
--   "INVENTORY_READ",
--   "INVENTORY_UPDATE",
--   "INVOICE_CREATE",
--   "INVOICE_DELETE",
--   "INVOICE_READ",
--   "INVOICE_UPDATE",
--   "SELL_CREATE",
--   "SELL_DELETE",
--   "SELL_READ",
--   "SELL_UPDATE"
-- ]');

-- INSERT INTO roles
-- VALUES ('WAREHOUSE', 'ACTIVE', '[
--   "INVENTORY_CREATE",
--   "INVENTORY_DELETE",
--   "INVENTORY_READ",
--   "INVENTORY_UPDATE",
--   "INVOICE_CREATE",
--   "INVOICE_DELETE",
--   "INVOICE_READ",
--   "INVOICE_UPDATE",
--   "SELL_CREATE",
--   "SELL_DELETE",
--   "SELL_READ",
--   "SELL_UPDATE"
-- ]');

-- INSERT INTO roles
-- VALUES ('OPERATOR', 'ACTIVE', '[
--   "INVENTORY_CREATE",
--   "INVENTORY_DELETE",
--   "INVENTORY_READ",
--   "INVENTORY_UPDATE",
--   "INVOICE_CREATE",
--   "INVOICE_DELETE",
--   "INVOICE_READ",
--   "INVOICE_UPDATE",
--   "SELL_CREATE",
--   "SELL_DELETE",
--   "SELL_READ",
--   "SELL_UPDATE"
-- ]');