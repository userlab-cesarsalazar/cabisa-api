CREATE TABLE `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_type` ENUM('SERVICE','EQUIPMENT','PART') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `status` ENUM('ACTIVE','INACTIVE') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'ACTIVE' NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) DEFAULT NULL,
  `serial_number` VARCHAR(50) DEFAULT NULL,
  `unit_price` DOUBLE NOT NULL DEFAULT 0,
  `stock` INT DEFAULT 0 NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  `updated_at` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP DEFAULT NULL,
  `updated_by` INT,
  CONSTRAINT products_pk PRIMARY KEY (`id`),
  CONSTRAINT products_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT products_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;