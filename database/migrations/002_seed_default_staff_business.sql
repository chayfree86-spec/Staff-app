-- Migration: 002_seed_default_staff_business
-- Creates the first business/settings/admin user (numeric AUTO_INCREMENT ids).

USE staff;

INSERT INTO businesses (name, mobile, address)
VALUES (
  'Flavors Bistro',
  '9876543210',
  '12, Connaught Place, Block E, New Delhi - 110001'
);

SET @business_id = LAST_INSERT_ID();

INSERT INTO app_users (business_id, name, mobile, email, password_hash, pin_hash)
VALUES (
  @business_id,
  'Administrator',
  '9628717175',
  'chaychaupal@gmail.com',
  '$2y$12$qLohC3Ntfd5FDi6y258vQ.4krG8BFjMH/8hgAverfCdP4riv9rFVS',
  '$2y$12$8bSSoDtlsbyiojT5CiR3ke2f/P0/tlRlTQupSZwZeKML8cqtW5paK'
);

INSERT INTO business_settings (
  business_id,
  weekly_holidays,
  weekly_holiday_paid,
  salary_cycle_start,
  salary_cycle_end,
  new_staff_salary_hold_days,
  month_calculation,
  default_salary_calculation_basis,
  theme,
  auto_attendance_enabled,
  auto_attendance_time
)
VALUES (
  @business_id,
  JSON_ARRAY('Sunday'),
  'paid',
  1,
  30,
  10,
  'actual_calendar_month',
  'attendance_based',
  'light',
  0,
  '09:00:00'
);

INSERT INTO schema_migrations (version, name)
VALUES ('002', 'seed_default_staff_business')
ON DUPLICATE KEY UPDATE applied_at = applied_at;
