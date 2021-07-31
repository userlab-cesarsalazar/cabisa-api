CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `password` TEXT NOT NULL,
  `email` varchar(50) NOT NULL,
  `sales_commision` DECIMAL(5,2) DEFAULT NULL,
  `rol_id` int NOT NULL,
  `permissions` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;