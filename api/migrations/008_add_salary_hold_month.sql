-- Migration: 008_add_salary_hold_month
-- Adds salary_hold_month column to staff table.

USE staff;

ALTER TABLE staff ADD COLUMN salary_hold_month VARCHAR(7) NULL;

INSERT INTO schema_migrations (version, name)
VALUES ('008', 'add_salary_hold_month')
ON DUPLICATE KEY UPDATE applied_at = applied_at;
