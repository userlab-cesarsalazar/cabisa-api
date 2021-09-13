-- INVETORY_MOVEMENTS
INSERT INTO cabisa.inventory_movements (operation_id,product_id,quantity,unit_cost,movement_type,status) VALUES
	 (2,9,2,50.0,'IN','CANCELLED'),
	 (2,6,1,19.0,'IN','CANCELLED'),
	 (1,5,2,20.0,'IN','APPROVED'),
	 (1,8,2,90.0,'IN','APPROVED'),
	 (3,5,5,39.0,'IN','APPROVED'),
	 (3,9,5,61.0,'IN','APPROVED'),
	 (4,5,2,NULL,'OUT','APPROVED'),
	 (4,8,3,NULL,'OUT','APPROVED'),
	 (4,9,2,NULL,'OUT','APPROVED'),
	 (4,5,2,37.05,'IN','APPROVED');
INSERT INTO cabisa.inventory_movements (operation_id,product_id,quantity,unit_cost,movement_type,status) VALUES
	 (4,8,3,85.5,'IN','APPROVED'),
	 (4,9,2,57.95,'IN','APPROVED'),
	 (5,5,2,NULL,'OUT','APPROVED'),
	 (5,9,1,NULL,'OUT','APPROVED');

-- INVETORY_MOVEMENTS_DETAILS
INSERT INTO cabisa.inventory_movements_details (inventory_movement_id,quantity,storage_location,comments,created_at,created_by) VALUES
	 (1,2,NULL,NULL,'2021-08-26 00:46:07',1),
	 (2,1,NULL,NULL,'2021-08-26 00:46:07',1),
	 (3,2,NULL,NULL,'2021-08-26 11:51:01',1),
	 (4,2,NULL,NULL,'2021-08-26 11:51:01',1),
	 (5,5,NULL,NULL,'2021-08-26 11:54:35',1),
	 (6,5,NULL,NULL,'2021-08-26 11:54:35',1),
	 (7,2,NULL,NULL,'2021-08-26 12:05:38',1),
	 (8,3,NULL,NULL,'2021-08-26 12:05:38',1),
	 (9,2,NULL,NULL,'2021-08-26 12:05:38',1),
	 (10,2,NULL,NULL,'2021-08-26 12:21:44',1);
INSERT INTO cabisa.inventory_movements_details (inventory_movement_id,quantity,storage_location,comments,created_at,created_by) VALUES
	 (11,3,NULL,NULL,'2021-08-26 12:21:44',1),
	 (12,2,NULL,NULL,'2021-08-26 12:21:44',1),
	 (13,2,NULL,NULL,'2021-08-26 12:24:26',1),
	 (14,1,NULL,NULL,'2021-08-26 12:24:26',1);