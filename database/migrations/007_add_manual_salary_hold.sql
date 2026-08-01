-- Migration: 007_add_manual_salary_hold
-- Adds manual salary hold column to staff table.

USE staff;

ALTER TABLE staff ADD COLUMN salary_hold TINYINT(1) NOT NULL DEFAULT 0;

INSERT INTO schema_migrations (version, name)
VALUES ('007', 'add_manual_salary_hold')
ON DUPLICATE KEY UPDATE applied_at = applied_at;
