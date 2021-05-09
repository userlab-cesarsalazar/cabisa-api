CREATE TABLE `roles` (
  `name` VARCHAR(20) NOT NULL,
  `status` ENUM('ACTIVE','INACTIVE') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'ACTIVE' NOT NULL,
  `permissions` JSON NOT NULL,
  CONSTRAINT roles_pk PRIMARY KEY (name),
  CONSTRAINT roles_name_unique UNIQUE (name)
) ENGINE=InnoDB;

ALTER TABLE users
ADD CONSTRAINT users_role_name_fk FOREIGN KEY (rol_name) REFERENCES roles(name);