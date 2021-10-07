ALTER TABLE documents DROP CONSTRAINT documents_payment_method_fk;

DROP TABLE IF EXISTS payments;

DROP TABLE IF EXISTS payment_methods;