CREATE TABLE `inventory_movements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `operation_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_cost` DOUBLE,
  `movement_type` ENUM('IN', 'OUT') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `status` ENUM('PENDING', 'PARTIAL', 'COMPLETED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'PENDING' NOT NULL,
  CONSTRAINT inventory_movements_pk PRIMARY KEY (`id`),
  CONSTRAINT inventory_movements_operation_id_fk FOREIGN KEY (operation_id) REFERENCES operations(id),
  CONSTRAINT inventory_movements_product_id_fk FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT inventory_movements_unit_cost_check CHECK (movement_type <> 'IN' OR unit_cost IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE `inventory_movements_details` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `inventory_movement_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `storage_location` VARCHAR(255) DEFAULT NULL,
  `comments` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_by` INT NOT NULL,
  CONSTRAINT inventory_movements_details_pk PRIMARY KEY (`id`),
  CONSTRAINT inventory_movements_details_inventory_movement_id_fk FOREIGN KEY (inventory_movement_id) REFERENCES inventory_movements(id),
  CONSTRAINT inventory_movements_details_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;