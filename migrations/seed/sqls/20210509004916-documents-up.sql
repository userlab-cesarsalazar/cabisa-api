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
	 ('PURCHASE','2021-10-04 11:19:47',5);

-- DOCUMENTS
INSERT INTO documents (document_type,stakeholder_id,operation_id,project_id,product_id,related_internal_document_id,related_external_document_id,status,comments,received_by,dispatched_by,start_date,end_date,cancel_reason,subtotal_amount,sales_commission_amount,total_discount_amount,total_tax_amount,total_amount,description,payment_method,credit_days,credit_status,credit_paid_date,credit_due_date,created_at,created_by,updated_at,updated_by) VALUES
	 ('PURCHASE_ORDER',9,1,NULL,NULL,NULL,'4321','APPROVED','Primera compra',NULL,NULL,'2021-10-04 09:20:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-10-04 11:18:36',5,'2021-10-04 11:18:36',5),
	 ('PURCHASE_ORDER',10,2,NULL,NULL,NULL,'8765','APPROVED','Segunda compra',NULL,NULL,'2021-10-07 11:18:45',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2021-10-04 11:19:47',5,'2021-10-04 11:19:47',5);

-- DOCUMENT_PRODUCTS
INSERT INTO documents_products (service_type,document_id,product_id,product_price,product_quantity,tax_fee,unit_tax_amount,discount_percentage,unit_discount_amount,parent_product_id) VALUES
	 (NULL,1,5,30.0,12,12.00,3.5999999999999996,NULL,NULL,NULL),
	 (NULL,1,6,36.0,10,12.00,4.32,NULL,NULL,NULL),
	 (NULL,1,8,28.0,15,12.00,3.36,NULL,NULL,NULL),
	 (NULL,2,9,64.0,5,12.00,7.68,NULL,NULL,NULL),
	 (NULL,2,10,29.0,16,12.00,3.48,NULL,NULL,NULL),
	 (NULL,2,12,33.0,10,12.00,3.96,NULL,NULL,NULL);

-- RESTORE FK
ALTER TABLE documents ADD CONSTRAINT documents_related_internal_document_id_fk FOREIGN KEY (related_internal_document_id) REFERENCES documents(id) MATCH PARTIAL ON DELETE CASCADE ON UPDATE CASCADE;