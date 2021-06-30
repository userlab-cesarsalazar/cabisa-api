CREATE TABLE `projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `stakeholder_id` INT NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `start_date` TIMESTAMP,
  `end_date` TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  `updated_at` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT,
  CONSTRAINT projects_pk PRIMARY KEY (id),
  CONSTRAINT projects_stakeholder_id_fk FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT projects_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT projects_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

ALTER TABLE documents
ADD CONSTRAINT documents_project_id_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE;