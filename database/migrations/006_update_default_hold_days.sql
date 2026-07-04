-- Migration: 006_update_default_hold_days
-- Updates default value of new_staff_salary_hold_days to 10.

USE staff;

ALTER TABLE business_settings MODIFY COLUMN new_staff_salary_hold_days TINYINT UNSIGNED NOT NULL DEFAULT 10;

-- Update existing settings where hold days was 15 to 10
UPDATE business_settings SET new_staff_salary_hold_days = 10 WHERE new_staff_salary_hold_days = 15;

INSERT INTO schema_migrations (version, name)
VALUES ('006', 'update_default_hold_days')
ON DUPLICATE KEY UPDATE applied_at = applied_at;
