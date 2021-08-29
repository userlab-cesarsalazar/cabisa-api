-- REMOVE FK
ALTER TABLE documents DROP CONSTRAINT documents_related_internal_document_id_fk;

-- OPERATIONS
INSERT INTO cabisa.operations (operation_type,created_at,created_by) VALUES
	 ('PURCHASE','2021-08-25 22:26:07',1),
	 ('PURCHASE','2021-08-25 23:17:51',1),
	 ('PURCHASE','2021-08-26 11:54:35',1),
	 ('RENT','2021-08-26 12:03:58',1),
	 ('SELL','2021-08-26 12:24:26',1);

-- DOCUMENTS
INSERT INTO cabisa.documents (document_type,stakeholder_id,operation_id,project_id,related_internal_document_id,related_external_document_id,status,comments,received_by,dispatched_by,start_date,end_date,cancel_reason,subtotal_amount,total_discount_amount,total_tax_amount,total_amount,description,payment_method,credit_days,credit_status,created_at,created_by,updated_at,updated_by) VALUES
    ('PURCHASE_ORDER',9,1,NULL,NULL,'2020','APPROVED','test compra 20',NULL,NULL,'2021-08-20 02:20:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-08-25 22:26:07',1,'2021-08-26 11:51:01',1),
    ('PURCHASE_ORDER',9,2,NULL,NULL,'66444','CANCELLED','5555',NULL,NULL,'2021-08-31 15:17:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-08-25 23:17:51',1,'2021-08-26 00:50:29',1),
    ('PURCHASE_ORDER',10,3,NULL,NULL,'3030','APPROVED','5555',NULL,NULL,'2021-08-30 11:53:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-08-26 11:54:35',1,'2021-08-26 11:54:35',1),
    ('RENT_PRE_INVOICE',1,4,1,5,NULL,'APPROVED','observaciones','recibe','entrega','2021-08-01 15:59:29','2021-08-31 15:59:33',NULL,539.0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-08-26 12:03:58',1,'2021-08-26 12:21:44',1),
    ('RENT_INVOICE',1,4,1,4,NULL,'APPROVED','observaciones','recibe','entrega','2021-08-01 15:59:29','2021-08-31 15:59:33',NULL,512.05,26.95,53.58,565.63,'descrpcion','CHECK',7,'UNPAID','2021-08-26 12:21:44',1,'2021-08-26 12:21:44',1),
    ('SELL_PRE_INVOICE',2,5,2,7,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,177.0,NULL,17.16,194.16,'65','TRANSFER',NULL,NULL,'2021-08-26 12:24:26',1,'2021-08-26 12:24:26',1),
    ('SELL_INVOICE',2,5,2,6,NULL,'APPROVED',NULL,NULL,NULL,NULL,NULL,NULL,177.0,NULL,17.16,194.16,'65','TRANSFER',NULL,NULL,'2021-08-26 12:24:26',1,'2021-08-26 12:24:26',1);

-- DOCUMENT_PRODUCTS
INSERT INTO cabisa.documents_products (service_type,document_id,product_id,product_price,product_quantity,tax_fee,unit_tax_amount,discount_percentage,unit_discount_amount,parent_product_id) VALUES
	 (NULL,2,9,50.0,2,12.00,6.0,NULL,NULL,NULL),
	 (NULL,2,6,19.0,1,12.00,2.28,NULL,NULL,NULL),
	 (NULL,1,5,20.0,2,12.00,2.4,NULL,NULL,NULL),
	 (NULL,1,8,90.0,2,12.00,10.799999999999999,NULL,NULL,NULL),
	 (NULL,3,5,39.0,5,12.00,4.68,NULL,NULL,NULL),
	 (NULL,3,9,61.0,5,12.00,7.319999999999999,NULL,NULL,NULL),
	 ('MACHINERY',4,5,39.0,2,12.00,4.68,NULL,NULL,NULL),
	 ('EQUIPMENT',4,8,90.0,3,12.00,10.799999999999999,NULL,NULL,NULL),
	 ('SERVICE',4,9,61.0,2,12.00,7.319999999999999,NULL,NULL,2),
	 ('SERVICE',4,2,69.0,1,0.00,0.0,NULL,NULL,NULL);
INSERT INTO cabisa.documents_products (service_type,document_id,product_id,product_price,product_quantity,tax_fee,unit_tax_amount,discount_percentage,unit_discount_amount,parent_product_id) VALUES
	 ('MACHINERY',5,5,37.05,2,12.00,4.446,5.00,1.9500000000000002,NULL),
	 ('EQUIPMENT',5,8,85.5,3,12.00,10.26,5.00,4.5,NULL),
	 ('SERVICE',5,9,57.95,2,12.00,6.954,5.00,3.0500000000000003,2),
	 ('SERVICE',5,2,65.55,1,0.00,0.0,5.00,3.45,NULL),
	 ('MACHINERY',6,5,39.0,2,12.00,4.68,NULL,NULL,NULL),
	 ('SERVICE',6,9,65.0,1,12.00,7.8,NULL,NULL,1),
	 ('SERVICE',6,1,34.0,1,0.00,0.0,NULL,NULL,NULL),
	 ('MACHINERY',7,5,39.0,2,12.00,4.68,NULL,NULL,NULL),
	 ('SERVICE',7,9,65.0,1,12.00,7.8,NULL,NULL,1),
	 ('SERVICE',7,1,34.0,1,0.00,0.0,NULL,NULL,NULL);

-- RESTORE FK
ALTER TABLE documents ADD CONSTRAINT documents_related_internal_document_id_fk FOREIGN KEY (related_internal_document_id) REFERENCES documents(id) MATCH PARTIAL ON DELETE CASCADE ON UPDATE CASCADE;