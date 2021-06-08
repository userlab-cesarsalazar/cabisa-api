ALTER TABLE documents
DROP CONSTRAINT documents_project_id_fk;

DROP TABLE IF EXISTS projects;