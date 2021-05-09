INSERT INTO inventory_movements (operation_id, product_id, quantity, unit_cost, movement_type) VALUES (1, 5, 5, 35, 'IN');
INSERT INTO inventory_movements (operation_id, product_id, quantity, unit_cost, movement_type) VALUES (1, 6, 5, 15, 'IN');
INSERT INTO inventory_movements (operation_id, product_id, quantity, unit_cost, movement_type) VALUES (1, 7, 3, 70, 'IN');

INSERT INTO inventory_movements (operation_id, product_id, quantity, movement_type) VALUES (2, 5, 3, 'OUT');
INSERT INTO inventory_movements (operation_id, product_id, quantity, movement_type) VALUES (2, 6, 3, 'OUT');

INSERT INTO inventory_movements (operation_id, product_id, quantity, movement_type) VALUES (3, 7, 2, 'OUT');
INSERT INTO inventory_movements (operation_id, product_id, quantity, unit_cost, movement_type) VALUES (3, 7, 2, 68, 'IN');