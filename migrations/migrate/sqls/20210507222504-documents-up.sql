CREATE TABLE `documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `document_type` ENUM('SELL_PRE_INVOICE','RENT_PRE_INVOICE','SELL_INVOICE','RENT_INVOICE','PURCHASE_ORDER','REPAIR_ORDER') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `stakeholder_id` INT,
  `operation_id` INT,
  `project_id` INT,
  `related_internal_document_id` INT DEFAULT NULL,
  `related_external_document_id` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('PENDING','APPROVED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'PENDING' NOT NULL,
  `comments` TEXT DEFAULT NULL,
  `received_by` VARCHAR(100) DEFAULT NULL,
  `start_date` TIMESTAMP,
  `end_date` TIMESTAMP,
  `cancel_reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  `updated_at` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT,
  CONSTRAINT documents_pk PRIMARY KEY (id),
  CONSTRAINT documents_stakeholder_id_fk FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id),
  CONSTRAINT documents_operation_id_fk FOREIGN KEY (operation_id) REFERENCES operations(id),
  CONSTRAINT documents_related_internal_document_id_fk FOREIGN KEY (related_internal_document_id) REFERENCES documents(id) MATCH PARTIAL ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT documents_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT documents_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT documents_operation_id_check CHECK (status <> 'APPROVED' OR operation_id IS NOT NULL),
  CONSTRAINT documents_stakeholder_id_check CHECK (document_type = 'REPAIR_ORDER' OR stakeholder_id IS NOT NULL),
  CONSTRAINT documents_project_id_check CHECK (document_type = 'PURCHASE_ORDER' OR document_type = 'REPAIR_ORDER' OR project_id IS NOT NULL),
  CONSTRAINT documents_start_date_check CHECK ((document_type <> 'RENT' AND document_type <> 'RENT_PRE_INVOICE') OR start_date IS NOT NULL),
  CONSTRAINT documents_end_date_check CHECK ((document_type <> 'RENT' AND document_type <> 'RENT_PRE_INVOICE') OR end_date IS NOT NULL),
  -- CONSTRAINT documents_cancel_reason_check CHECK (status <> 'CANCELLED' OR cancel_reason IS NOT NULL),
  CONSTRAINT documents_updated_by_check CHECK (status = 'PENDING' OR updated_by IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE `documents_products` (
  `document_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_price` INT NOT NULL,
  `product_quantity` INT NOT NULL,
  `product_return_cost` INT,
  `tax_fee` DECIMAL(5,2) NOT NULL,
  `unit_tax_amount` DOUBLE NOT NULL,
  CONSTRAINT documents_products_document_id_product_id_pk PRIMARY KEY (document_id, product_id),
  CONSTRAINT documents_products_product_id_fk FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT documents_products_document_id_fk FOREIGN KEY (document_id) REFERENCES documents(id),
  CONSTRAINT documents_products_tax_fee_check CHECK (tax_fee BETWEEN 0.00 AND 100.00)
) ENGINE=InnoDB;