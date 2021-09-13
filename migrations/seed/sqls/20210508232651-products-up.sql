-- TAXES
INSERT INTO taxes (name, fee) VALUES ('EXENTO', 0);
INSERT INTO taxes (name, fee) VALUES ('IVA', 12);

-- PRODUCTS
INSERT INTO products (product_type, stock, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('SERVICE', 1, 'ACTIVE', 'CytomX Therapeutics, Inc.', '68788-9406', '40-476-4166', 34, 1, '2020-09-01 09:45:13', 1);
INSERT INTO products (product_type, stock, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('SERVICE', 1, 'ACTIVE', 'Navios Maritime Holdings Inc.', '0409-2988', '35-603-1767', 69, 1, '2021-03-01 03:59:59', 1);
INSERT INTO products (product_type, stock, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('SERVICE', 1, 'INACTIVE', 'Mobile Mini, Inc.', '59726-470', '01-925-7081', 69, 1, '2020-07-28 14:35:20', 1);
INSERT INTO products (product_type, stock, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('SERVICE', 1, 'ACTIVE', 'Foresight Autonomous Holdings Ltd.', '0456-3428', '22-758-5488', 33, 1, '2021-04-21 00:26:41', 1);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('PRODUCT', 10, 'EQUIPMENT', 'ACTIVE', 'Forward Air Corporation', '55714-4528', '48-921-2648', 39, 2, '2020-09-25 08:55:11', 2);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('PRODUCT', 10, 'EQUIPMENT', 'ACTIVE', 'Western Asset Global Corporate Defined Opportunity Fund Inc.', '43857-0148', '48-392-9814', 19, 2, '2021-03-26 08:46:30', 2);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('PRODUCT', 10, 'EQUIPMENT', 'INACTIVE', 'Shaw Communications Inc.', '41520-227', '38-490-4837', 81, 2, '2020-05-22 02:43:13', 2);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('PRODUCT', 10, 'EQUIPMENT', 'ACTIVE', 'FlexShares Real Assets Allocation Index Fund', '59011-444', '40-152-4014', 84, 2, '2020-10-21 08:31:12', 3);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('PRODUCT', 10, 'PART', 'ACTIVE', 'Phoenix New Media Limited', '64616-070', '17-012-0561', 61, 2, '2021-01-24 10:25:48', 3);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('PRODUCT', 10, 'PART', 'ACTIVE', 'Flotek Industries, Inc.', '13537-003', '23-533-5068', 97, 2, '2020-06-25 01:43:57', 3);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_at, created_by) VALUES ('PRODUCT', 10, 'PART', 'INACTIVE', 'Medallion Financial Corp.', '59762-3051', '40-122-8837', 64, 2, '2020-08-09 19:05:26', 2);
INSERT INTO products (product_type, stock, product_category, status, description, code, serial_number, unit_price, tax_id, created_by) VALUES ('PRODUCT', 10, 'PART', 'ACTIVE', 'TriCo Bancshares', '68788-9534', '23-067-2080', 90, 2, 1);

-- PROJECTS
INSERT INTO projects (id, stakeholder_id, name, start_date, end_date, created_by) VALUES
    (1, 1, 'Our first project', '2020-06-18 01:15:15', '2021-06-18 01:15:15', 1),
    (2, 2, 'Another great project', '2020-06-25 01:15:15', '2021-06-18 01:15:15', 1);