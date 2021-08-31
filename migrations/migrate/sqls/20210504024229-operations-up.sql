CREATE TABLE `operations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `operation_type` ENUM('SELL','PURCHASE','RENT','REPAIR') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  CONSTRAINT operations_pk PRIMARY KEY (id),
  CONSTRAINT operations_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id)
  
) ENGINE=InnoDB;