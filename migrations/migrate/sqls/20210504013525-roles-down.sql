ALTER TABLE users
DROP CONSTRAINT users_roles_id_fk;

DROP TABLE IF EXISTS roles;

-- ALTER TABLE users
-- DROP CONSTRAINT users_role_name_fk;

-- DROP TABLE IF EXISTS roles;