CREATE TABLE `taxes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `fee` DECIMAL(5,2) NOT NULL,
  CONSTRAINT taxes_pk PRIMARY KEY (id),
  CONSTRAINT taxes_name_unique UNIQUE (name),
  CONSTRAINT taxes_fee_check CHECK (fee BETWEEN 0.00 AND 100.00)
) ENGINE=InnoDB;


ALTER TABLE products
ADD CONSTRAINT products_tax_id_fk FOREIGN KEY (tax_id) REFERENCES taxes(id);