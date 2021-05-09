INSERT INTO documents (document_type, stakeholder_id, operation_id, status, created_at, created_by, authorized_at, authorized_by) VALUES ('PURCHASE_ORDER', 10, 1, 'APPROVED', '2020-07-15 09:45:13', 3, '2020-07-15 09:45:13', 1);
INSERT INTO documents (document_type, stakeholder_id, operation_id, status, created_at, created_by, authorized_at, authorized_by) VALUES ('PURCHASE_INVOICE', 10, 1, 'APPROVED', '2020-08-01 09:45:13', 1, '2020-08-01 09:45:13', 1);
INSERT INTO documents (document_type, stakeholder_id, operation_id, status, created_at, created_by, authorized_at, authorized_by) VALUES ('SELL_PRE_INVOICE', 5, 2, 'APPROVED', '2020-08-15 09:45:13', 2, '2020-08-15 09:45:13', 1);
INSERT INTO documents (document_type, stakeholder_id, operation_id, status, created_at, created_by, authorized_at, authorized_by) VALUES ('SELL_INVOICE', 5, 2, 'APPROVED', '2020-09-01 09:45:13', 1, '2020-09-01 09:45:13', 1);
INSERT INTO documents (document_type, stakeholder_id, operation_id, status, start_date, end_date, created_at, created_by, authorized_at, authorized_by) VALUES ('RENT_PRE_INVOICE', 6, 3, 'APPROVED', '2021-01-25 09:45:13', '2021-02-25 09:45:13', '2021-01-20 09:45:13', 2, '2021-01-24 09:45:13', 1);
INSERT INTO documents (document_type, stakeholder_id, operation_id, status, start_date, end_date, created_at, created_by, authorized_at, authorized_by) VALUES ('RENT_INVOICE', 6, 3, 'APPROVED', '2021-01-25 09:45:13', '2021-02-25 09:45:13', '2021-01-24 09:45:13', 1, '2021-01-24 09:45:13', 1);


INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (1, 5, 35, 5);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (1, 6, 15, 5);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (1, 7, 70, 3);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (2, 5, 35, 5);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (2, 6, 15, 5);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (2, 7, 70, 3);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (3, 5, 39, 3);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (3, 6, 19, 3);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (4, 5, 39, 3);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity) VALUES (4, 6, 19, 3);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, product_return_cost) VALUES (5, 7, 81, 2, 68);
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, product_return_cost) VALUES (6, 7, 81, 2, 68);