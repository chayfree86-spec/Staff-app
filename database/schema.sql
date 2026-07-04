-- Staff App database schema
-- Target database: MySQL 8+ / MariaDB 10.4+
-- Money values are stored as whole rupees (no paise/decimal conversion).
-- Store date/time values in Indian local time (Asia/Kolkata). Set the backend DB session timezone to +05:30.
-- IDs are simple INT AUTO_INCREMENT values; the server assigns them on insert.

CREATE DATABASE IF NOT EXISTS staff
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE staff;

CREATE TABLE schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE businesses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  logo_url MEDIUMTEXT,
  mobile VARCHAR(20),
  address TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20),
  email VARCHAR(150),
  password_hash VARCHAR(255) NOT NULL,
  pin_hash VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_users_business_email (business_id, email),
  UNIQUE KEY uq_app_users_business_mobile (business_id, mobile),
  CONSTRAINT fk_app_users_business_v2
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE business_settings (
  business_id INT UNSIGNED PRIMARY KEY,
  weekly_holidays JSON NOT NULL,
  weekly_holiday_paid ENUM('paid', 'unpaid') NOT NULL DEFAULT 'paid',
  salary_cycle_start TINYINT UNSIGNED NOT NULL DEFAULT 1,
  salary_cycle_end TINYINT UNSIGNED NOT NULL DEFAULT 30,
  new_staff_salary_hold_days TINYINT UNSIGNED NOT NULL DEFAULT 10,
  month_calculation ENUM('actual_calendar_month', 'fixed_30_days') NOT NULL DEFAULT 'actual_calendar_month',
  default_salary_calculation_basis ENUM('attendance_based', 'fixed_salary') NOT NULL DEFAULT 'attendance_based',
  theme ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'light',
  auto_attendance_enabled TINYINT(1) NOT NULL DEFAULT 0,
  auto_attendance_time TIME NOT NULL DEFAULT '09:00:00',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_business_settings_business_v2
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT chk_salary_cycle_start_v2 CHECK (salary_cycle_start BETWEEN 1 AND 31),
  CONSTRAINT chk_salary_cycle_end_v2 CHECK (salary_cycle_end BETWEEN 1 AND 31),
  CONSTRAINT chk_salary_hold_days_v2 CHECK (new_staff_salary_hold_days BETWEEN 0 AND 31)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  father_name VARCHAR(150),
  mobile VARCHAR(20),
  mobile2 VARCHAR(20),
  address TEXT,
  avatar_initials VARCHAR(4),
  profile_image_url MEDIUMTEXT,
  monthly_salary INT UNSIGNED NOT NULL DEFAULT 0,
  per_day_salary INT UNSIGNED NOT NULL DEFAULT 0,
  salary_type ENUM('monthly', 'daily') NOT NULL DEFAULT 'monthly',
  calculation_basis ENUM('attendance_based', 'fixed_salary') NOT NULL DEFAULT 'attendance_based',
  joining_date DATE NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  deactivation_date DATE,
  released_salary_hold TINYINT(1) NOT NULL DEFAULT 0,
  owner_user_id INT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_business_id_id (business_id, id),
  UNIQUE KEY uq_staff_business_mobile (business_id, mobile),
  KEY idx_staff_business_status (business_id, status),
  KEY idx_staff_owner_user (business_id, owner_user_id),
  CONSTRAINT fk_staff_business_v2
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_owner_user_v2
    FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_inactive_staff_has_date_v2 CHECK (
    status = 'active' OR deactivation_date IS NOT NULL
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendance_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id INT UNSIGNED NOT NULL,
  staff_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present', 'absent', 'half_day', 'holiday', 'unmarked') NOT NULL,
  marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  marked_by INT UNSIGNED,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_staff_date (staff_id, attendance_date),
  KEY idx_attendance_business_date (business_id, attendance_date),
  KEY idx_attendance_marked_by (business_id, marked_by),
  CONSTRAINT fk_attendance_staff_business_v2
    FOREIGN KEY (business_id, staff_id) REFERENCES staff(business_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_marked_by_v2
    FOREIGN KEY (marked_by) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id INT UNSIGNED NOT NULL,
  staff_id INT UNSIGNED NOT NULL,
  kind ENUM('advance_given', 'advance_returned', 'deduction') NOT NULL,
  amount INT UNSIGNED NOT NULL,
  transaction_date DATE NOT NULL,
  remarks TEXT,
  created_by INT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_transactions_staff_date (staff_id, transaction_date),
  KEY idx_transactions_business_kind_date (business_id, kind, transaction_date),
  KEY idx_transactions_created_by (business_id, created_by),
  CONSTRAINT fk_transactions_staff_business_v2
    FOREIGN KEY (business_id, staff_id) REFERENCES staff(business_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_transactions_created_by_v2
    FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_transaction_amount_positive_v2 CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE salary_payouts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id INT UNSIGNED NOT NULL,
  staff_id INT UNSIGNED NOT NULL,
  salary_month DATE NOT NULL,
  amount INT UNSIGNED NOT NULL,
  payout_date DATE NOT NULL,
  payment_mode VARCHAR(50),
  remarks TEXT,
  status ENUM('draft', 'paid', 'cancelled') NOT NULL DEFAULT 'paid',
  created_by INT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_salary_payouts_staff_month (staff_id, salary_month),
  KEY idx_salary_payouts_business_month (business_id, salary_month),
  KEY idx_salary_payouts_created_by (business_id, created_by),
  CONSTRAINT fk_salary_payouts_staff_business_v2
    FOREIGN KEY (business_id, staff_id) REFERENCES staff(business_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_payouts_created_by_v2
    FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_salary_month_first_day_v2 CHECK (DAYOFMONTH(salary_month) = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE salary_slip_snapshots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_id INT UNSIGNED NOT NULL,
  staff_id INT UNSIGNED NOT NULL,
  salary_month DATE NOT NULL,
  earned INT UNSIGNED NOT NULL DEFAULT 0,
  advance_adjusted INT UNSIGNED NOT NULL DEFAULT 0,
  deduction INT UNSIGNED NOT NULL DEFAULT 0,
  hold INT UNSIGNED NOT NULL DEFAULT 0,
  released INT UNSIGNED NOT NULL DEFAULT 0,
  net_payable INT UNSIGNED NOT NULL DEFAULT 0,
  paid INT UNSIGNED NOT NULL DEFAULT 0,
  payment_status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
  present_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  absent_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  half_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  holiday_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  snapshot_json JSON NOT NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by INT UNSIGNED,
  UNIQUE KEY uq_salary_slip_staff_month (staff_id, salary_month),
  KEY idx_salary_slips_business_month (business_id, salary_month),
  KEY idx_salary_slips_generated_by (business_id, generated_by),
  CONSTRAINT fk_salary_slips_staff_business_v2
    FOREIGN KEY (business_id, staff_id) REFERENCES staff(business_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_slips_generated_by_v2
    FOREIGN KEY (generated_by) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_salary_slip_month_first_day_v2 CHECK (DAYOFMONTH(salary_month) = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
