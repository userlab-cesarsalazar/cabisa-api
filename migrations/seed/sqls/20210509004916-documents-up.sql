-- REMOVE FK
ALTER TABLE documents DROP CONSTRAINT documents_related_internal_document_id_fk;

-- PAYMENT_METHODS
INSERT INTO payment_methods (name,description) VALUES
	 ('CARD','Credit or debit card'),
	 ('TRANSFER','Wire transfer'),
	 ('CASH','Cash'),
	 ('DEPOSIT','Bank deposit'),
	 ('CHECK','Bank check');

-- OPERATIONS
INSERT INTO operations (operation_type,created_at,created_by) VALUES
	 ('PURCHASE','2021-10-04 11:18:36',5),
	 ('PURCHASE','2021-10-04 11:19:47',5),
	 ('RENT','2021-10-04 11:39:17',5),
	 ('RENT','2021-10-04 11:40:40',5),
	 ('RENT','2021-10-04 11:41:57',5),
	 ('SELL','2021-10-04 11:43:06',5),
	 ('SELL','2021-10-04 11:53:56',5),
	 ('INVENTORY_ADJUSTMENT','2021-10-04 12:45:26',5);

-- DOCUMENTS
INSERT INTO documents (document_type,stakeholder_id,operation_id,project_id,product_id,related_internal_document_id,related_external_document_id,status,comments,received_by,dispatched_by,start_date,end_date,cancel_reason,subtotal_amount,sales_commission_amount,total_discount_amount,total_tax_amount,total_amount,description,payment_method,credit_days,credit_status,credit_paid_date,credit_due_date,created_at,created_by,updated_at,updated_by) VALUES
	 ('PURCHASE_ORDER',9,1,NULL,NULL,NULL,'4321','APPROVED','Primera compra',NULL,NULL,'2021-10-04 09:20:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-10-04 11:18:36',5,'2021-10-04 11:18:36',5),
	 ('PURCHASE_ORDER',10,2,NULL,NULL,NULL,'8765','APPROVED','Segunda compra',NULL,NULL,'2021-10-07 11:18:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-10-04 11:19:47',5,'2021-10-04 11:19:47',5),
	 ('RENT_PRE_INVOICE',1,3,1,NULL,10,NULL,'APPROVED','Primera venta','Encargado','Vendedor','2021-09-01 11:37:51','2021-09-20 11:38:00',NULL,169.0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PAID','2021-10-04 17:19:21',NULL,'2021-10-04 11:39:17',5,'2021-10-04 13:19:20',5),
	 ('RENT_PRE_INVOICE',2,4,2,NULL,NULL,NULL,'PENDING','Segunda venta','Cliente','Vendedor','2021-08-09 11:39:46','2021-09-30 11:39:53',NULL,374.0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'UNPAID',NULL,NULL,'2021-10-04 11:40:40',5,'2021-10-04 11:40:40',5),
	 ('RENT_PRE_INVOICE',2,5,2,NULL,NULL,NULL,'CANCELLED','Tercer venta','Cliente','Vendedor','2021-09-15 11:40:55','2021-10-15 11:41:01',NULL,180.0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'UNPAID',NULL,NULL,'2021-10-04 11:41:57',5,'2021-10-04 13:25:55',5),
	 ('SELL_PRE_INVOICE',1,6,1,NULL,7,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,212.0,NULL,NULL,25.44,237.44,'Primera facturacion a credito','CHECK',15,'UNPAID',NULL,NULL,'2021-10-04 11:43:06',5,'2021-10-04 11:43:06',5),
	 ('SELL_INVOICE',1,6,1,NULL,6,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,212.0,10.600000000000001,NULL,25.44,237.44,'Primera facturacion a credito','CHECK',15,'UNPAID',NULL,'2021-10-19 15:43:06','2021-10-04 11:43:06',5,'2021-10-04 11:43:06',5),
	 ('SELL_PRE_INVOICE',2,7,2,NULL,9,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,314.28,NULL,9.72,37.72,352.0,'Primera facturacion de contado','TRANSFER',NULL,NULL,NULL,NULL,'2021-10-04 11:53:56',5,'2021-10-04 11:53:56',5),
	 ('SELL_INVOICE',2,7,2,NULL,8,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,314.28,15.713999999999999,9.72,37.72,352.0,'Primera facturacion de contado','TRANSFER',NULL,NULL,NULL,NULL,'2021-10-04 11:53:56',5,'2021-10-04 11:53:56',5),
	 ('RENT_INVOICE',1,3,1,NULL,3,NULL,'APPROVED','Primera venta','Encargado','Vendedor','2021-09-01 11:37:51','2021-09-20 11:38:00',NULL,169.0,8.450000000000001,NULL,16.2,185.2,'Primera factura generada desde una venta','CASH',NULL,'PAID','2021-10-04 17:19:21',NULL,'2021-10-04 13:19:20',5,'2021-10-04 13:19:20',5);

-- DOCUMENT_PRODUCTS
INSERT INTO documents_products (service_type,document_id,product_id,product_price,product_quantity,tax_fee,unit_tax_amount,discount_percentage,unit_discount_amount,parent_product_id) VALUES
	 (NULL,1,5,30.0,12,12.00,3.5999999999999996,NULL,NULL,NULL),
	 (NULL,1,6,36.0,10,12.00,4.32,NULL,NULL,NULL),
	 (NULL,1,8,28.0,15,12.00,3.36,NULL,NULL,NULL),
	 (NULL,2,9,64.0,5,12.00,7.68,NULL,NULL,NULL),
	 (NULL,2,10,29.0,16,12.00,3.48,NULL,NULL,NULL),
	 (NULL,2,12,33.0,10,12.00,3.96,NULL,NULL,NULL),
	 ('PART',3,5,39.0,2,12.00,4.68,NULL,NULL,NULL),
	 ('SERVICE',3,6,19.0,3,12.00,2.28,NULL,NULL,1),
	 ('SERVICE',3,1,34.0,1,0.00,0.0,NULL,NULL,NULL),
	 ('PART',4,8,84.0,2,12.00,10.08,NULL,NULL,NULL);
INSERT INTO documents_products (service_type,document_id,product_id,product_price,product_quantity,tax_fee,unit_tax_amount,discount_percentage,unit_discount_amount,parent_product_id) VALUES
	 ('EQUIPMENT',4,6,19.0,4,12.00,2.28,NULL,NULL,NULL),
	 ('SERVICE',4,9,61.0,1,12.00,7.319999999999999,NULL,NULL,2),
	 ('SERVICE',4,2,69.0,1,0.00,0.0,NULL,NULL,NULL),
	 ('EQUIPMENT',5,12,90.0,2,12.00,10.799999999999999,NULL,NULL,NULL),
	 ('PART',6,12,90.0,1,12.00,10.799999999999999,NULL,NULL,NULL),
	 ('EQUIPMENT',6,9,61.0,2,12.00,7.319999999999999,NULL,NULL,NULL),
	 ('PART',7,12,90.0,1,12.00,10.799999999999999,NULL,NULL,NULL),
	 ('EQUIPMENT',7,9,61.0,2,12.00,7.319999999999999,NULL,NULL,NULL),
	 ('PART',8,5,37.83,4,12.00,4.539599999999999,3.00,1.17,NULL),
	 ('EQUIPMENT',8,8,81.48,2,12.00,9.7776,3.00,2.52,NULL);
INSERT INTO documents_products (service_type,document_id,product_id,product_price,product_quantity,tax_fee,unit_tax_amount,discount_percentage,unit_discount_amount,parent_product_id) VALUES
	 ('PART',9,5,37.83,4,12.00,4.539599999999999,3.00,1.17,NULL),
	 ('EQUIPMENT',9,8,81.48,2,12.00,9.7776,3.00,2.52,NULL),
	 ('PART',10,5,39.0,2,12.00,4.68,NULL,NULL,NULL),
	 ('SERVICE',10,6,19.0,3,12.00,2.28,NULL,NULL,1),
	 ('SERVICE',10,1,34.0,1,0.00,0.0,NULL,NULL,NULL);

-- RESTORE FK
ALTER TABLE documents ADD CONSTRAINT documents_related_internal_document_id_fk FOREIGN KEY (related_internal_document_id) REFERENCES documents(id) MATCH PARTIAL ON DELETE CASCADE ON UPDATE CASCADE;