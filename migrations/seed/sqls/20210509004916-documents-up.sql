-- PROJECTS
INSERT INTO projects (id, stakeholder_id, name, start_date, end_date, created_by)
VALUES (1, 1, 'Our first project', '2020-06-18 01:15:15', '2021-06-18 01:15:15', 1);

INSERT INTO projects (id, stakeholder_id, name, start_date, created_by)
VALUES (2, 2, 'Another great project', '2020-06-25 01:15:15', 1);

-- DOCUMENTS
INSERT INTO documents (document_type, stakeholder_id, operation_id, related_external_document_id, status, created_at, created_by, updated_at, updated_by)
VALUES ('PURCHASE_ORDER', 10, 1, 12345, 'APPROVED', '2020-07-15 09:45:13', 3, '2020-07-15 09:45:13', 1);

INSERT INTO documents (document_type, stakeholder_id, project_id, status, created_at, created_by, updated_at, updated_by)
VALUES ('SELL_PRE_INVOICE', 5, 1, 'PENDING', '2020-08-15 09:45:13', 2, '2020-08-15 09:45:13', 1);

INSERT INTO documents (document_type, stakeholder_id, project_id, operation_id, related_internal_document_id, status, payment_method, total_invoice, service_type, created_at, created_by, updated_at, updated_by)
VALUES ('SELL_INVOICE', 5, 1, 2, 2, 'APPROVED', 'TRANSFER', 194.88, 'EQUIPMENT', '2020-09-01 09:45:13', 1, '2020-09-01 09:45:13', 1);

INSERT INTO documents (document_type, stakeholder_id, project_id, status, start_date, end_date, created_at, created_by, updated_at, updated_by)
VALUES ('RENT_PRE_INVOICE', 6, 2, 'PENDING', '2021-01-25 09:45:13', '2021-02-25 09:45:13', '2021-01-20 09:45:13', 2, '2021-01-24 09:45:13', 1);

INSERT INTO documents (document_type, stakeholder_id, project_id, operation_id, related_internal_document_id, status, total_invoice, service_type, start_date, end_date, created_at, created_by, updated_at, updated_by)
VALUES ('RENT_INVOICE', 6, 2, 3, 4, 'APPROVED', 181.44, 'MACHINERY', '2021-01-25 09:45:13', '2021-02-25 09:45:13', '2021-01-24 09:45:13', 1, '2021-01-24 09:45:13', 1);

UPDATE documents SET status = 'APPROVED', operation_id = 2, related_internal_document_id = 2 WHERE id = 3;
UPDATE documents SET status = 'APPROVED', operation_id = 3, related_internal_document_id = 4 WHERE id = 5;

-- DOCUMENTS_PRODUCTS
INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (1, 5, 35, 5, 12.00, 4.2);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (1, 6, 15, 5, 12.00, 1.8);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (1, 7, 70, 3, 12.00, 8.4);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (2, 5, 39, 3, 12.00, 4.68);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (2, 6, 19, 3, 12.00, 2.28);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (3, 5, 39, 3, 12.00, 4.68);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (3, 6, 19, 3, 12.00, 2.28);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (4, 7, 81, 2, 12.00, 9.72);

INSERT INTO documents_products (document_id, product_id, product_price, product_quantity, tax_fee, unit_tax_amount)
VALUES (5, 7, 81, 2, 12.00, 9.72);