-- TAXES
INSERT INTO taxes (name, fee) VALUES ('EXENTO', 0);
INSERT INTO taxes (name, fee) VALUES ('IVA', 12);

-- PRODUCTS
INSERT INTO products (product_type,product_category,status,description,code,serial_number,tax_id,stock,inventory_unit_value,inventory_total_value,image_url,created_at,created_by,updated_at,updated_by) VALUES
	 ('SERVICE',NULL,'ACTIVE','CytomX Therapeutics, Inc.','68788-9406','40-476-4166',1,1,0.0,0.0,NULL,'2020-09-01 09:45:13',1,NULL,NULL),
	 ('SERVICE',NULL,'ACTIVE','Navios Maritime Holdings Inc.','0409-2988','35-603-1767',1,1,0.0,0.0,NULL,'2021-03-01 03:59:59',1,NULL,NULL),
	 ('SERVICE',NULL,'INACTIVE','Mobile Mini, Inc.','59726-470','01-925-7081',1,1,0.0,0.0,NULL,'2020-07-28 14:35:20',1,NULL,NULL),
	 ('SERVICE',NULL,'ACTIVE','Foresight Autonomous Holdings Ltd.','0456-3428','22-758-5488',1,1,0.0,0.0,NULL,'2021-04-21 00:26:41',1,NULL,NULL),
	 ('PRODUCT','EQUIPMENT','ACTIVE','Forward Air Corporation','55714-4528','48-921-2648',2,12,30,360,NULL,'2020-09-25 08:55:11',2,'2021-10-04 13:19:21',5),
	 ('PRODUCT','EQUIPMENT','ACTIVE','Western Asset Global Corporate Defined Opportunity Fund Inc.','43857-0148','48-392-9814',2,10,36,360,NULL,'2021-03-26 08:46:30',2,'2021-10-04 13:19:21',5),
	 ('PRODUCT','EQUIPMENT','INACTIVE','Shaw Communications Inc.','41520-227','38-490-4837',2,0,0.0,0.0,NULL,'2020-05-22 02:43:13',2,'2021-10-04 09:14:53',NULL),
	 ('PRODUCT','EQUIPMENT','ACTIVE','FlexShares Real Assets Allocation Index Fund','59011-444','40-152-4014',2,15,28,420,NULL,'2020-10-21 08:31:12',3,'2021-10-04 11:53:56',5),
	 ('PRODUCT','PART','ACTIVE','Phoenix New Media Limited','64616-070','17-012-0561',2,5,64,320,NULL,'2021-01-24 10:25:48',3,'2021-10-04 11:43:06',5),
	 ('PRODUCT','PART','ACTIVE','Flotek Industries, Inc.','13537-003','23-533-5068',2,16,29,464,NULL,'2020-06-25 01:43:57',3,'2021-10-04 11:19:47',5);
INSERT INTO products (product_type,product_category,status,description,code,serial_number,tax_id,stock,inventory_unit_value,inventory_total_value,image_url,created_at,created_by,updated_at,updated_by) VALUES
	 ('PRODUCT','PART','INACTIVE','Medallion Financial Corp.','59762-3051','40-122-8837',2,0,0.0,0.0,NULL,'2020-08-09 19:05:26',2,'2021-10-04 09:14:53',NULL),
	 ('PRODUCT','PART','ACTIVE','TriCo Bancshares','68788-9534','23-067-2080',2,10,33,330,NULL,'2021-10-02 22:27:13',1,'2021-10-04 13:25:55',5);

-- PROJECTS
INSERT INTO projects (id, stakeholder_id, name, start_date, end_date, created_by) VALUES
    (1, 1, 'Our first project', '2020-06-18 01:15:15', '2021-06-18 01:15:15', 1),
    (2, 2, 'Another great project', '2020-06-25 01:15:15', '2021-06-18 01:15:15', 1);