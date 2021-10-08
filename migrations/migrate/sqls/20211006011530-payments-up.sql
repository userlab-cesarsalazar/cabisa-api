CREATE TABLE `payment_methods` (
  `name` VARCHAR(25) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  CONSTRAINT payment_methods_pk PRIMARY KEY (name)
) ENGINE=InnoDB;

CREATE TABLE `payments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `payment_method` VARCHAR(25) NOT NULL,
  `payment_amount` DOUBLE NOT NULL,
  `payment_date` TIMESTAMP NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  CONSTRAINT payments_pk PRIMARY KEY (id),
  CONSTRAINT payments_document_id_fk FOREIGN KEY (document_id) REFERENCES documents(id),
  CONSTRAINT payments_payment_method_fk FOREIGN KEY (payment_method) REFERENCES payment_methods(name)
) ENGINE=InnoDB;

ALTER TABLE documents
ADD CONSTRAINT documents_payment_method_fk FOREIGN KEY (payment_method) REFERENCES payment_methods(name) MATCH PARTIAL ON DELETE RESTRICT ON UPDATE RESTRICT;