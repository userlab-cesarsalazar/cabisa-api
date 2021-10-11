-- INVETORY_MOVEMENTS
INSERT INTO inventory_movements (operation_id,product_id,movement_type,quantity,unit_cost,total_cost,inventory_quantity,inventory_unit_cost,inventory_total_cost,status) VALUES
	 (1,5,'IN',12,30.0,360.0,12,30.0,360.0,'APPROVED'),
	 (1,6,'IN',10,36.0,360.0,10,36.0,360.0,'APPROVED'),
	 (1,8,'IN',15,28.0,420.0,15,28.0,420.0,'APPROVED'),
	 (2,9,'IN',5,64.0,320.0,5,64.0,320.0,'APPROVED'),
	 (2,10,'IN',16,29.0,464.0,16,29.0,464.0,'APPROVED'),
	 (2,12,'IN',10,33.0,330.0,10,33.0,330.0,'APPROVED');

-- INVETORY_MOVEMENTS_DETAILS
INSERT INTO inventory_movements_details (inventory_movement_id,quantity,storage_location,comments,created_at,created_by) VALUES
	 (1,12,NULL,NULL,'2021-10-04 11:18:36',5),
	 (2,10,NULL,NULL,'2021-10-04 11:18:36',5),
	 (3,15,NULL,NULL,'2021-10-04 11:18:36',5),
	 (4,5,NULL,NULL,'2021-10-04 11:19:47',5),
	 (5,16,NULL,NULL,'2021-10-04 11:19:47',5),
	 (6,10,NULL,NULL,'2021-10-04 11:19:47',5);