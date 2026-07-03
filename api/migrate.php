<?php

// One-time migration runner for 004_simple_numeric_ids.
// Rebuilds all tables with simple INT AUTO_INCREMENT ids (1, 2, 3, ...) and
// copies the existing UUID-keyed data across. Only callable from localhost;
// safe to delete after use.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if (!in_array($remote, ['127.0.0.1', '::1'], true)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Localhost only.']);
    exit;
}

require_once __DIR__ . '/db.php';

$pdo = db();

$stmt = $pdo->prepare('SELECT COUNT(*) FROM schema_migrations WHERE version = ?');
$stmt->execute(['004']);
if ((int) $stmt->fetchColumn() > 0) {
    echo json_encode(['ok' => true, 'message' => 'Migration 004 already applied. IDs are already simple numbers.']);
    exit;
}

$statements = [
    'SET FOREIGN_KEY_CHECKS = 0',

    // Old-id -> new-id maps (numbered by creation order).
    'DROP TABLE IF EXISTS _map_businesses, _map_users, _map_staff',
    'CREATE TABLE _map_businesses AS
       SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS new_id FROM businesses',
    'CREATE TABLE _map_users AS
       SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS new_id FROM app_users',
    'CREATE TABLE _map_staff AS
       SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS new_id FROM staff',

    // --- New tables with INT ids ---
    'CREATE TABLE businesses_n (
       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       name VARCHAR(150) NOT NULL,
       logo_url MEDIUMTEXT,
       mobile VARCHAR(20),
       address TEXT,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    'CREATE TABLE app_users_n (
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
         FOREIGN KEY (business_id) REFERENCES businesses_n(id) ON DELETE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    'CREATE TABLE business_settings_n (
       business_id INT UNSIGNED PRIMARY KEY,
       weekly_holidays JSON NOT NULL,
       weekly_holiday_paid ENUM(\'paid\', \'unpaid\') NOT NULL DEFAULT \'paid\',
       salary_cycle_start TINYINT UNSIGNED NOT NULL DEFAULT 1,
       salary_cycle_end TINYINT UNSIGNED NOT NULL DEFAULT 30,
       new_staff_salary_hold_days TINYINT UNSIGNED NOT NULL DEFAULT 15,
       month_calculation ENUM(\'actual_calendar_month\', \'fixed_30_days\') NOT NULL DEFAULT \'actual_calendar_month\',
       default_salary_calculation_basis ENUM(\'attendance_based\', \'fixed_salary\') NOT NULL DEFAULT \'attendance_based\',
       theme ENUM(\'light\', \'dark\', \'system\') NOT NULL DEFAULT \'light\',
       auto_attendance_enabled TINYINT(1) NOT NULL DEFAULT 0,
       auto_attendance_time TIME NOT NULL DEFAULT \'09:00:00\',
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       CONSTRAINT fk_business_settings_business_v2
         FOREIGN KEY (business_id) REFERENCES businesses_n(id) ON DELETE CASCADE,
       CONSTRAINT chk_salary_cycle_start_v2 CHECK (salary_cycle_start BETWEEN 1 AND 31),
       CONSTRAINT chk_salary_cycle_end_v2 CHECK (salary_cycle_end BETWEEN 1 AND 31),
       CONSTRAINT chk_salary_hold_days_v2 CHECK (new_staff_salary_hold_days BETWEEN 0 AND 31)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    'CREATE TABLE staff_n (
       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       business_id INT UNSIGNED NOT NULL,
       name VARCHAR(150) NOT NULL,
       father_name VARCHAR(150),
       mobile VARCHAR(20),
       mobile2 VARCHAR(20),
       address TEXT,
       avatar_initials VARCHAR(4),
       profile_image_url MEDIUMTEXT,
       monthly_salary_paise INT UNSIGNED NOT NULL DEFAULT 0,
       per_day_salary_paise INT UNSIGNED NOT NULL DEFAULT 0,
       salary_type ENUM(\'monthly\', \'daily\') NOT NULL DEFAULT \'monthly\',
       calculation_basis ENUM(\'attendance_based\', \'fixed_salary\') NOT NULL DEFAULT \'attendance_based\',
       joining_date DATE NOT NULL,
       status ENUM(\'active\', \'inactive\') NOT NULL DEFAULT \'active\',
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
         FOREIGN KEY (business_id) REFERENCES businesses_n(id) ON DELETE CASCADE,
       CONSTRAINT fk_staff_owner_user_v2
         FOREIGN KEY (owner_user_id) REFERENCES app_users_n(id) ON DELETE SET NULL,
       CONSTRAINT chk_inactive_staff_has_date_v2 CHECK (
         status = \'active\' OR deactivation_date IS NOT NULL
       )
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    'CREATE TABLE attendance_records_n (
       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       business_id INT UNSIGNED NOT NULL,
       staff_id INT UNSIGNED NOT NULL,
       attendance_date DATE NOT NULL,
       status ENUM(\'present\', \'absent\', \'half_day\', \'holiday\', \'unmarked\') NOT NULL,
       marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       marked_by INT UNSIGNED,
       notes TEXT,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       UNIQUE KEY uq_attendance_staff_date (staff_id, attendance_date),
       KEY idx_attendance_business_date (business_id, attendance_date),
       KEY idx_attendance_marked_by (business_id, marked_by),
       CONSTRAINT fk_attendance_staff_business_v2
         FOREIGN KEY (business_id, staff_id) REFERENCES staff_n(business_id, id) ON DELETE CASCADE,
       CONSTRAINT fk_attendance_marked_by_v2
         FOREIGN KEY (marked_by) REFERENCES app_users_n(id) ON DELETE SET NULL
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    'CREATE TABLE staff_transactions_n (
       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       business_id INT UNSIGNED NOT NULL,
       staff_id INT UNSIGNED NOT NULL,
       kind ENUM(\'advance_given\', \'advance_returned\', \'deduction\') NOT NULL,
       amount_paise INT UNSIGNED NOT NULL,
       transaction_date DATE NOT NULL,
       remarks TEXT,
       created_by INT UNSIGNED,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       KEY idx_transactions_staff_date (staff_id, transaction_date),
       KEY idx_transactions_business_kind_date (business_id, kind, transaction_date),
       KEY idx_transactions_created_by (business_id, created_by),
       CONSTRAINT fk_transactions_staff_business_v2
         FOREIGN KEY (business_id, staff_id) REFERENCES staff_n(business_id, id) ON DELETE CASCADE,
       CONSTRAINT fk_transactions_created_by_v2
         FOREIGN KEY (created_by) REFERENCES app_users_n(id) ON DELETE SET NULL,
       CONSTRAINT chk_transaction_amount_positive_v2 CHECK (amount_paise > 0)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    'CREATE TABLE salary_payouts_n (
       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       business_id INT UNSIGNED NOT NULL,
       staff_id INT UNSIGNED NOT NULL,
       salary_month DATE NOT NULL,
       amount_paise INT UNSIGNED NOT NULL,
       payout_date DATE NOT NULL,
       payment_mode VARCHAR(50),
       remarks TEXT,
       status ENUM(\'draft\', \'paid\', \'cancelled\') NOT NULL DEFAULT \'paid\',
       created_by INT UNSIGNED,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       KEY idx_salary_payouts_staff_month (staff_id, salary_month),
       KEY idx_salary_payouts_business_month (business_id, salary_month),
       KEY idx_salary_payouts_created_by (business_id, created_by),
       CONSTRAINT fk_salary_payouts_staff_business_v2
         FOREIGN KEY (business_id, staff_id) REFERENCES staff_n(business_id, id) ON DELETE CASCADE,
       CONSTRAINT fk_salary_payouts_created_by_v2
         FOREIGN KEY (created_by) REFERENCES app_users_n(id) ON DELETE SET NULL,
       CONSTRAINT chk_salary_month_first_day_v2 CHECK (DAYOFMONTH(salary_month) = 1)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    'CREATE TABLE salary_slip_snapshots_n (
       id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       business_id INT UNSIGNED NOT NULL,
       staff_id INT UNSIGNED NOT NULL,
       salary_month DATE NOT NULL,
       earned_paise INT UNSIGNED NOT NULL DEFAULT 0,
       advance_adjusted_paise INT UNSIGNED NOT NULL DEFAULT 0,
       deduction_paise INT UNSIGNED NOT NULL DEFAULT 0,
       hold_paise INT UNSIGNED NOT NULL DEFAULT 0,
       released_paise INT UNSIGNED NOT NULL DEFAULT 0,
       net_payable_paise INT UNSIGNED NOT NULL DEFAULT 0,
       paid_paise INT UNSIGNED NOT NULL DEFAULT 0,
       payment_status ENUM(\'unpaid\', \'partial\', \'paid\') NOT NULL DEFAULT \'unpaid\',
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
         FOREIGN KEY (business_id, staff_id) REFERENCES staff_n(business_id, id) ON DELETE CASCADE,
       CONSTRAINT fk_salary_slips_generated_by_v2
         FOREIGN KEY (generated_by) REFERENCES app_users_n(id) ON DELETE SET NULL,
       CONSTRAINT chk_salary_slip_month_first_day_v2 CHECK (DAYOFMONTH(salary_month) = 1)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',

    // --- Copy data across with mapped ids ---
    'INSERT INTO businesses_n (id, name, logo_url, mobile, address, created_at, updated_at)
     SELECT m.new_id, b.name, b.logo_url, b.mobile, b.address, b.created_at, b.updated_at
     FROM businesses b JOIN _map_businesses m ON b.id = m.old_id',

    'INSERT INTO app_users_n (id, business_id, name, mobile, email, password_hash, pin_hash, is_active, last_login_at, created_at, updated_at)
     SELECT mu.new_id, mb.new_id, u.name, u.mobile, u.email, u.password_hash, u.pin_hash, u.is_active, u.last_login_at, u.created_at, u.updated_at
     FROM app_users u
     JOIN _map_users mu ON u.id = mu.old_id
     JOIN _map_businesses mb ON u.business_id = mb.old_id',

    'INSERT INTO business_settings_n (business_id, weekly_holidays, weekly_holiday_paid, salary_cycle_start, salary_cycle_end,
       new_staff_salary_hold_days, month_calculation, default_salary_calculation_basis, theme,
       auto_attendance_enabled, auto_attendance_time, created_at, updated_at)
     SELECT mb.new_id, s.weekly_holidays, s.weekly_holiday_paid, s.salary_cycle_start, s.salary_cycle_end,
       s.new_staff_salary_hold_days, s.month_calculation, s.default_salary_calculation_basis, s.theme,
       s.auto_attendance_enabled, s.auto_attendance_time, s.created_at, s.updated_at
     FROM business_settings s JOIN _map_businesses mb ON s.business_id = mb.old_id',

    'INSERT INTO staff_n (id, business_id, name, father_name, mobile, mobile2, address, avatar_initials, profile_image_url,
       monthly_salary_paise, per_day_salary_paise, salary_type, calculation_basis, joining_date, status,
       deactivation_date, released_salary_hold, owner_user_id, created_at, updated_at)
     SELECT ms.new_id, mb.new_id, st.name, st.father_name, NULLIF(st.mobile, \'\'), st.mobile2, st.address, st.avatar_initials, st.profile_image_url,
       st.monthly_salary_paise, st.per_day_salary_paise, st.salary_type, st.calculation_basis, st.joining_date, st.status,
       st.deactivation_date, st.released_salary_hold, mu.new_id, st.created_at, st.updated_at
     FROM staff st
     JOIN _map_staff ms ON st.id = ms.old_id
     JOIN _map_businesses mb ON st.business_id = mb.old_id
     LEFT JOIN _map_users mu ON st.owner_user_id = mu.old_id',

    'INSERT INTO attendance_records_n (business_id, staff_id, attendance_date, status, marked_at, marked_by, notes, created_at, updated_at)
     SELECT mb.new_id, ms.new_id, a.attendance_date, a.status, a.marked_at, mu.new_id, a.notes, a.created_at, a.updated_at
     FROM attendance_records a
     JOIN _map_staff ms ON a.staff_id = ms.old_id
     JOIN _map_businesses mb ON a.business_id = mb.old_id
     LEFT JOIN _map_users mu ON a.marked_by = mu.old_id
     ORDER BY a.marked_at, a.created_at',

    'INSERT INTO staff_transactions_n (business_id, staff_id, kind, amount_paise, transaction_date, remarks, created_by, created_at, updated_at)
     SELECT mb.new_id, ms.new_id, t.kind, t.amount_paise, t.transaction_date, t.remarks, mu.new_id, t.created_at, t.updated_at
     FROM staff_transactions t
     JOIN _map_staff ms ON t.staff_id = ms.old_id
     JOIN _map_businesses mb ON t.business_id = mb.old_id
     LEFT JOIN _map_users mu ON t.created_by = mu.old_id
     ORDER BY t.created_at',

    'INSERT INTO salary_payouts_n (business_id, staff_id, salary_month, amount_paise, payout_date, payment_mode, remarks, status, created_by, created_at, updated_at)
     SELECT mb.new_id, ms.new_id, p.salary_month, p.amount_paise, p.payout_date, p.payment_mode, p.remarks, p.status, mu.new_id, p.created_at, p.updated_at
     FROM salary_payouts p
     JOIN _map_staff ms ON p.staff_id = ms.old_id
     JOIN _map_businesses mb ON p.business_id = mb.old_id
     LEFT JOIN _map_users mu ON p.created_by = mu.old_id
     ORDER BY p.created_at',

    'INSERT INTO salary_slip_snapshots_n (business_id, staff_id, salary_month, earned_paise, advance_adjusted_paise, deduction_paise,
       hold_paise, released_paise, net_payable_paise, paid_paise, payment_status, present_days, absent_days, half_days,
       holiday_days, snapshot_json, generated_at, generated_by)
     SELECT mb.new_id, ms.new_id, sl.salary_month, sl.earned_paise, sl.advance_adjusted_paise, sl.deduction_paise,
       sl.hold_paise, sl.released_paise, sl.net_payable_paise, sl.paid_paise, sl.payment_status, sl.present_days, sl.absent_days, sl.half_days,
       sl.holiday_days, sl.snapshot_json, sl.generated_at, mu.new_id
     FROM salary_slip_snapshots sl
     JOIN _map_staff ms ON sl.staff_id = ms.old_id
     JOIN _map_businesses mb ON sl.business_id = mb.old_id
     LEFT JOIN _map_users mu ON sl.generated_by = mu.old_id',

    // --- Swap in the new tables ---
    'DROP TABLE salary_slip_snapshots, salary_payouts, staff_transactions, attendance_records, staff, business_settings, app_users, businesses',
    'RENAME TABLE
       businesses_n TO businesses,
       app_users_n TO app_users,
       business_settings_n TO business_settings,
       staff_n TO staff,
       attendance_records_n TO attendance_records,
       staff_transactions_n TO staff_transactions,
       salary_payouts_n TO salary_payouts,
       salary_slip_snapshots_n TO salary_slip_snapshots',
    'DROP TABLE _map_businesses, _map_users, _map_staff',

    'SET FOREIGN_KEY_CHECKS = 1',
];

try {
    foreach ($statements as $sql) {
        $pdo->exec($sql);
    }

    $stmt = $pdo->prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)');
    $stmt->execute(['004', 'simple_numeric_ids']);

    $counts = [];
    foreach (['businesses', 'app_users', 'staff', 'attendance_records', 'staff_transactions', 'salary_payouts'] as $table) {
        $counts[$table] = (int) $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
    }

    echo json_encode([
        'ok' => true,
        'message' => 'Migration 004 applied. All ids are now simple numbers (1, 2, 3, ...). Please log in again.',
        'rows' => $counts,
    ]);
} catch (Throwable $e) {
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Migration failed: ' . $e->getMessage()]);
}
