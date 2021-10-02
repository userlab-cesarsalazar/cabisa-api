CREATE TABLE `documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `document_type` ENUM('SELL_PRE_INVOICE','RENT_PRE_INVOICE','SELL_INVOICE','RENT_INVOICE','PURCHASE_ORDER','REPAIR_ORDER') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `stakeholder_id` INT,
  `operation_id` INT,
  `project_id` INT,
  `product_id` INT,
  `related_internal_document_id` INT DEFAULT NULL,
  `related_external_document_id` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('PENDING','APPROVED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'PENDING' NOT NULL,
  `comments` TEXT DEFAULT NULL,
  `received_by` VARCHAR(255) DEFAULT NULL,
  `dispatched_by` VARCHAR(255) DEFAULT NULL,
  `start_date` TIMESTAMP,
  `end_date` TIMESTAMP,
  `cancel_reason` TEXT DEFAULT NULL,
  `subtotal_amount` DOUBLE DEFAULT NULL,
  `sales_commission_amount` DOUBLE DEFAULT NULL,
  `total_discount_amount` DOUBLE DEFAULT NULL,
  `total_tax_amount` DOUBLE DEFAULT NULL,
  `total_amount` DOUBLE DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `payment_method` ENUM('CARD','TRANSFER','CASH','DEPOSIT','CHECK') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `credit_days` INT DEFAULT NULL,
  `credit_status` ENUM('UNPAID','PAID','DEFAULT') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `credit_paid_date` TIMESTAMP,
  `credit_due_date` TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  `updated_at` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT,
  CONSTRAINT documents_pk PRIMARY KEY (id),
  CONSTRAINT documents_stakeholder_id_fk FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) MATCH PARTIAL ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT documents_product_id_fk FOREIGN KEY (product_id) REFERENCES products(id) MATCH PARTIAL ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT documents_operation_id_fk FOREIGN KEY (operation_id) REFERENCES operations(id),
  CONSTRAINT documents_related_internal_document_id_fk FOREIGN KEY (related_internal_document_id) REFERENCES documents(id) MATCH PARTIAL ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT documents_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT documents_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id),
  -- CONSTRAINT documents_operation_id_check CHECK (status <> 'APPROVED' OR operation_id IS NOT NULL),
  CONSTRAINT documents_product_id_check CHECK (document_type <> 'REPAIR_ORDER' OR product_id IS NOT NULL),
  CONSTRAINT documents_stakeholder_id_check CHECK (document_type = 'REPAIR_ORDER' OR stakeholder_id IS NOT NULL),
  -- CONSTRAINT documents_start_date_check CHECK ((document_type <> 'RENT_INVOICE' AND document_type <> 'RENT_PRE_INVOICE') OR start_date IS NOT NULL),
  -- CONSTRAINT documents_end_date_check CHECK ((document_type <> 'RENT_INVOICE' AND document_type <> 'RENT_PRE_INVOICE') OR end_date IS NOT NULL),
  -- CONSTRAINT documents_payment_method_check CHECK (document_type <> 'SELL_INVOICE' OR payment_method IS NOT NULL),
  CONSTRAINT documents_subtotal_amount_check CHECK ((document_type <> 'RENT_INVOICE' AND document_type <> 'RENT_PRE_INVOICE' AND document_type <> 'SELL_INVOICE' AND document_type <> 'SELL_PRE_INVOICE') OR subtotal_amount IS NOT NULL),
  -- CONSTRAINT documents_total_discount_amount_check CHECK ((document_type <> 'RENT_INVOICE' AND document_type <> 'SELL_INVOICE') OR total_discount_amount IS NOT NULL),
  CONSTRAINT documents_total_amount_check CHECK ((document_type <> 'RENT_INVOICE' AND document_type <> 'SELL_INVOICE') OR total_amount IS NOT NULL),
  CONSTRAINT documents_credit_status_check CHECK (credit_days IS NULL OR credit_status IS NOT NULL),
  -- CONSTRAINT documents_cancel_reason_check CHECK (status <> 'CANCELLED' OR cancel_reason IS NOT NULL)
  CONSTRAINT documents_credit_paid_date_check CHECK (credit_status <> 'PAID' OR credit_paid_date IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE `documents_products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_type` ENUM('MACHINERY','EQUIPMENT','SERVICE') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `document_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_price` DOUBLE NOT NULL,
  `product_quantity` INT NOT NULL,
  `tax_fee` DECIMAL(5,2) NOT NULL,
  `unit_tax_amount` DOUBLE NOT NULL,
  `discount_percentage` DECIMAL(5,2) DEFAULT NULL,
  `unit_discount_amount` DOUBLE DEFAULT NULL,
  `parent_product_id` INT DEFAULT NULL,
  CONSTRAINT documents_products_id_pk PRIMARY KEY (id),
  CONSTRAINT documents_products_product_id_fk FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT documents_products_document_id_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT documents_products_tax_fee_check CHECK (tax_fee BETWEEN 0.00 AND 100.00),
  CONSTRAINT documents_products_discount_percentage_check CHECK (discount_percentage BETWEEN 0.00 AND 100.00)
) ENGINE=InnoDB;