-- PROJECTS
-- INSERT INTO projects (id, stakeholder_id, name, start_date, end_date, created_by)
-- VALUES (1, 1, 'Our first project', '2020-06-18 01:15:15', '2021-06-18 01:15:15', 1);

-- INSERT INTO projects (id, stakeholder_id, name, start_date, created_by)
-- VALUES (2, 2, 'Another great project', '2020-06-25 01:15:15', 1);

-- INSERT INTO operations (operation_type, created_at, created_by) VALUES ('PURCHASE', '2020-08-01 09:45:13', 1);
-- INSERT INTO operations (operation_type, created_at, created_by) VALUES ('SELL', '2020-09-01 09:45:13', 1);
-- INSERT INTO operations (operation_type, created_at, created_by) VALUES ('RENT', '2021-01-24 09:45:13', 1);

INSERT INTO projects (stakeholder_id, name, start_date, end_date, created_by)
VALUES (1, 'Our first project', '2020-06-18 01:15:15', '2021-06-18 01:15:15', 1);
