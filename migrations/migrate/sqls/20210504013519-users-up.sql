CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(150) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `rol_name` VARCHAR(20) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'ACTIVE' NOT NULL,
  `block_reason` TEXT DEFAULT NULL,
  CONSTRAINT users_pk PRIMARY KEY (`id`),
  CONSTRAINT users_block_reason_check CHECK (status <> 'BLOCKED' OR block_reason IS NOT NULL)
) ENGINE=InnoDB;   