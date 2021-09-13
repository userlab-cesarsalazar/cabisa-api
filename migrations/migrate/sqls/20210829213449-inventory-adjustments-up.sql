CREATE TABLE `inventory_adjustments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `adjustment_reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  CONSTRAINT inventory_adjustments_pk PRIMARY KEY (id),
  CONSTRAINT inventory_adjustments_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE `inventory_adjustments_products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `inventory_adjustment_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `preview_stock` int NOT NULL,
  `next_stock` int NOT NULL,
  CONSTRAINT inventory_adjustment_products_id_pk PRIMARY KEY (id),
  CONSTRAINT inventory_adjustment_product_id_fk FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT inventory_adjustments_inventory_adjustment_id_fk FOREIGN KEY (inventory_adjustment_id) REFERENCES inventory_adjustments(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;