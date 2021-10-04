-- INVETORY_MOVEMENTS
INSERT INTO inventory_movements (operation_id,product_id,movement_type,quantity,unit_cost,total_cost,inventory_quantity,inventory_unit_cost,inventory_total_cost,status) VALUES
	 (1,5,'IN',12,30.0,360.0,12,30.0,360.0,'APPROVED'),
	 (1,6,'IN',10,36.0,360.0,10,36.0,360.0,'APPROVED'),
	 (1,8,'IN',15,28.0,420.0,15,28.0,420.0,'APPROVED'),
	 (2,9,'IN',5,64.0,320.0,5,64.0,320.0,'APPROVED'),
	 (2,10,'IN',16,29.0,464.0,16,29.0,464.0,'APPROVED'),
	 (2,12,'IN',10,33.0,330.0,10,33.0,330.0,'APPROVED'),
	 (3,5,'OUT',2,30.0,60.0,10,30.0,300.0,'APPROVED'),
	 (3,6,'OUT',3,36.0,108.0,7,36.0,252.0,'APPROVED'),
	 (4,8,'OUT',2,28.0,56.0,13,28.0,364.0,'APPROVED'),
	 (4,6,'OUT',4,36.0,144.0,3,36.0,108.0,'APPROVED');
INSERT INTO inventory_movements (operation_id,product_id,movement_type,quantity,unit_cost,total_cost,inventory_quantity,inventory_unit_cost,inventory_total_cost,status) VALUES
	 (4,9,'OUT',1,64.0,64.0,4,64.0,256.0,'APPROVED'),
	 (5,12,'OUT',2,33.0,66.0,8,33.0,264.0,'CANCELLED'),
	 (6,12,'OUT',1,33.0,33.0,7,33.0,231.0,'APPROVED'),
	 (6,9,'OUT',2,64.0,128.0,2,64.0,128.0,'APPROVED'),
	 (7,5,'OUT',4,30.0,120.0,6,30.0,180.0,'APPROVED'),
	 (7,8,'OUT',2,28.0,56.0,11,28.0,308.0,'APPROVED'),
	 (8,6,'IN',1,36.0,36.0,4,36.0,144.0,'APPROVED'),
	 (8,5,'OUT',1,30.0,30.0,5,30.0,150.0,'APPROVED'),
	 (3,5,'IN',2,30.0,60.0,7,30.0,210.0,'APPROVED'),
	 (3,6,'IN',3,36.0,108.0,7,36.0,252.0,'APPROVED');

-- INVETORY_MOVEMENTS_DETAILS
INSERT INTO inventory_movements_details (inventory_movement_id,quantity,storage_location,comments,created_at,created_by) VALUES
	 (1,12,NULL,NULL,'2021-10-04 11:18:36',5),
	 (2,10,NULL,NULL,'2021-10-04 11:18:36',5),
	 (3,15,NULL,NULL,'2021-10-04 11:18:36',5),
	 (4,5,NULL,NULL,'2021-10-04 11:19:47',5),
	 (5,16,NULL,NULL,'2021-10-04 11:19:47',5),
	 (6,10,NULL,NULL,'2021-10-04 11:19:47',5),
	 (7,2,NULL,NULL,'2021-10-04 11:39:17',5),
	 (8,3,NULL,NULL,'2021-10-04 11:39:17',5),
	 (9,2,NULL,NULL,'2021-10-04 11:40:40',5),
	 (10,4,NULL,NULL,'2021-10-04 11:40:40',5);
INSERT INTO inventory_movements_details (inventory_movement_id,quantity,storage_location,comments,created_at,created_by) VALUES
	 (11,1,NULL,NULL,'2021-10-04 11:40:40',5),
	 (12,2,NULL,NULL,'2021-10-04 11:41:57',5),
	 (13,1,NULL,NULL,'2021-10-04 11:43:06',5),
	 (14,2,NULL,NULL,'2021-10-04 11:43:06',5),
	 (15,4,NULL,NULL,'2021-10-04 11:53:56',5),
	 (16,2,NULL,NULL,'2021-10-04 11:53:56',5),
	 (17,1,NULL,NULL,'2021-10-04 12:45:26',5),
	 (18,1,NULL,NULL,'2021-10-04 12:45:26',5),
	 (19,2,NULL,NULL,'2021-10-04 13:19:20',5),
	 (20,3,NULL,NULL,'2021-10-04 13:19:20',5);