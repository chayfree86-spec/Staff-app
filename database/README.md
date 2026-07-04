# Database Schema

Target database: MySQL 8+ / MariaDB 10.4+ for shared hosting.

Database name: `staff`.

On many cPanel/shared-hosting accounts, MySQL may force a prefix such as `cpaneluser_staff`. If that happens, replace `staff` in the SQL files with the actual database name or select the database in phpMyAdmin and remove the `CREATE DATABASE` / `USE staff` lines before import.

Main tables:

- `businesses`: business profile shown in the app header and salary slip.
- `app_users`: admin/login users for each business.
- `business_settings`: holiday, salary cycle, theme, and auto-attendance settings.
- `staff`: employee master data, salary configuration, and optional logged-in user ownership.
- `attendance_records`: one attendance record per staff member per date.
- `staff_transactions`: advances, advance returns, and deductions.
- `salary_payouts`: actual salary payments made to staff.
- `salary_slip_snapshots`: optional month-end frozen salary slip calculations.

Conventions:

- Simple INT AUTO_INCREMENT primary keys (1, 2, 3, ...); the server assigns ids on insert.
- Money is stored as whole rupees in integer columns (no paise/decimal conversion).
- `salary_month` is always the first day of the month, for example `2026-07-01`.
- `staff_transactions.kind` distinguishes `advance_given`, `advance_returned`, and `deduction`.
- `attendance_records` enforces one row per staff member per date.
- `weekly_holidays` is JSON, for example `["Sunday"]`.
- `weekly_holiday_paid` supports both `paid` and `unpaid`.
- Date/time columns use `DATETIME`; the backend should set the MySQL session timezone to `+05:30` so values are saved in Indian local time.
- `staff.owner_user_id` can be used to show only the logged-in user's staff list.
- `salary_slip_snapshots.payment_status` stores `unpaid`, `partial`, or `paid`.
- `app_users.password_hash` and `app_users.pin_hash` store hashes, not plain credentials.

## Migrations

Fresh install (phpMyAdmin):

1. Open phpMyAdmin.
2. Create/select the `staff` database.
3. Import `001_create_staff_database.sql` (creates the full current schema — numeric ids, MEDIUMTEXT images, whole-rupee amounts).
4. Import `002_seed_default_staff_business.sql`.

Existing installs that predate a schema change should run the newer numbered
migration directly (e.g. `005_paise_to_rupees.sql`). `003_expand_image_columns.sql`
and `004_simple_numeric_ids.sql` are kept for history only.

The `schema_migrations` table records which migrations were applied.

Migration `002` creates the initial admin user with the configured mobile/email and hashed password/PIN.
