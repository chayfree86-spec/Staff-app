# Database Schema

Target database: MySQL 8+ / MariaDB 10.4+ for shared hosting.

Main tables:

- `businesses`: business profile shown in the app header and salary slip.
- `app_users`: admin/login users for each business.
- `business_settings`: holiday, salary cycle, theme, and auto-attendance settings.
- `staff`: employee master data and salary configuration.
- `attendance_records`: one attendance record per staff member per date.
- `staff_transactions`: advances, advance returns, and deductions.
- `salary_payouts`: actual salary payments made to staff.
- `salary_slip_snapshots`: optional month-end frozen salary slip calculations.

Conventions:

- UUID primary keys.
- Money is stored as paise in integer columns.
- `salary_month` is always the first day of the month, for example `2026-07-01`.
- `staff_transactions.kind` distinguishes `advance_given`, `advance_returned`, and `deduction`.
- `attendance_records` enforces one row per staff member per date.
- IDs are `CHAR(36)` so the backend can create UUIDs before inserting rows.
- `weekly_holidays` is JSON, for example `["Sunday"]`.
