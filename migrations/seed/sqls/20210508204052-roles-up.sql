INSERT INTO roles (is_active, name, permissions) VALUES
	(1, 'ADMIN', '[{"id": 1, "edit": true, "name": "Configuracion general", "view": true, "create": true, "delete": true}, {"id": 2, "edit": true, "name": "Usuarios", "view": true, "create": true, "delete": true}, {"id": 3, "edit": true, "name": "Reportes", "view": true, "create": true, "delete": true}, {"id": 4, "edit": true, "name": "Facturacion", "view": true, "create": true, "delete": true}, {"id": 5, "edit": true, "name": "Inventario", "view": true, "create": true, "delete": true}, {"id": 6, "edit": true, "name": "Ventas", "view": true, "create": true, "delete": true}, {"id": 7, "edit": true, "name": "Clientes", "view": true, "create": true, "delete": true}]'),
	(1, 'SELLS', '[{"id": 4, "edit": true, "name": "Facturacion", "view": true, "create": true, "delete": true}, {"id": 5, "edit": true, "name": "Inventario", "view": true, "create": true, "delete": true}, {"id": 6, "edit": true, "name": "Ventas", "view": true, "create": true, "delete": true}, {"id": 7, "edit": true, "name": "Clientes", "view": true, "create": true, "delete": true}]'),
	(1, 'WAREHOUSE', '[{"id": 3, "edit": true, "name": "Reportes", "view": true}]'),
	(1, 'OPERATOR', '[{"id": 4, "edit": true, "name": "Facturacion", "view": true, "create": true, "delete": true}, {"id": 5, "edit": true, "name": "Inventario", "view": true, "create": true, "delete": true}, {"id": 6, "edit": true, "name": "Ventas", "view": true, "create": true, "delete": true}]');