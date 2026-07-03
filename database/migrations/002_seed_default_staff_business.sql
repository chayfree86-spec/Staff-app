-- Migration: 002_seed_default_staff_business
-- Creates the first business/settings/admin user.

USE staff;

SET @business_id = '00000000-0000-4000-8000-000000000001';
SET @admin_id = '00000000-0000-4000-8000-000000000002';

INSERT INTO businesses (id, name, mobile, address)
VALUES (
  @business_id,
  'Flavors Bistro',
  '9876543210',
  '12, Connaught Place, Block E, New Delhi - 110001'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  mobile = VALUES(mobile),
  address = VALUES(address);

INSERT INTO app_users (id, business_id, name, mobile, email, password_hash, pin_hash)
VALUES (
  @admin_id,
  @business_id,
  'Administrator',
  '9628717175',
  'chaychaupal@gmail.com',
  '$2y$12$qLohC3Ntfd5FDi6y258vQ.4krG8BFjMH/8hgAverfCdP4riv9rFVS',
  '$2y$12$8bSSoDtlsbyiojT5CiR3ke2f/P0/tlRlTQupSZwZeKML8cqtW5paK'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  mobile = VALUES(mobile),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  pin_hash = VALUES(pin_hash);

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
  15,
  'actual_calendar_month',
  'attendance_based',
  'light',
  0,
  '09:00:00'
)
ON DUPLICATE KEY UPDATE
  weekly_holidays = VALUES(weekly_holidays),
  weekly_holiday_paid = VALUES(weekly_holiday_paid),
  salary_cycle_start = VALUES(salary_cycle_start),
  salary_cycle_end = VALUES(salary_cycle_end),
  new_staff_salary_hold_days = VALUES(new_staff_salary_hold_days),
  month_calculation = VALUES(month_calculation),
  default_salary_calculation_basis = VALUES(default_salary_calculation_basis),
  theme = VALUES(theme),
  auto_attendance_enabled = VALUES(auto_attendance_enabled),
  auto_attendance_time = VALUES(auto_attendance_time);

INSERT INTO schema_migrations (version, name)
VALUES ('002', 'seed_default_staff_business')
ON DUPLICATE KEY UPDATE applied_at = applied_at;
