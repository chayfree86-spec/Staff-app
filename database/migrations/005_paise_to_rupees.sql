-- Migration: 005_paise_to_rupees
-- Money is now stored as whole rupees instead of paise (integer cents).
-- Renames the *_paise columns and divides existing values by 100.

USE staff;

-- staff.monthly_salary_paise -> monthly_salary
ALTER TABLE staff CHANGE COLUMN monthly_salary_paise monthly_salary INT UNSIGNED NOT NULL DEFAULT 0;
UPDATE staff SET monthly_salary = ROUND(monthly_salary / 100);

-- staff.per_day_salary_paise -> per_day_salary
ALTER TABLE staff CHANGE COLUMN per_day_salary_paise per_day_salary INT UNSIGNED NOT NULL DEFAULT 0;
UPDATE staff SET per_day_salary = ROUND(per_day_salary / 100);

-- staff_transactions.amount_paise -> amount (drop/recreate the positive-amount check)
ALTER TABLE staff_transactions DROP CONSTRAINT chk_transaction_amount_positive_v2;
ALTER TABLE staff_transactions CHANGE COLUMN amount_paise amount INT UNSIGNED NOT NULL;
UPDATE staff_transactions SET amount = ROUND(amount / 100);
ALTER TABLE staff_transactions ADD CONSTRAINT chk_transaction_amount_positive_v2 CHECK (amount > 0);

-- salary_payouts.amount_paise -> amount
ALTER TABLE salary_payouts CHANGE COLUMN amount_paise amount INT UNSIGNED NOT NULL;
UPDATE salary_payouts SET amount = ROUND(amount / 100);

-- salary_slip_snapshots.*_paise -> * (table not yet used by the app, kept consistent)
ALTER TABLE salary_slip_snapshots CHANGE COLUMN earned_paise earned INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE salary_slip_snapshots CHANGE COLUMN advance_adjusted_paise advance_adjusted INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE salary_slip_snapshots CHANGE COLUMN deduction_paise deduction INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE salary_slip_snapshots CHANGE COLUMN hold_paise hold INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE salary_slip_snapshots CHANGE COLUMN released_paise released INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE salary_slip_snapshots CHANGE COLUMN net_payable_paise net_payable INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE salary_slip_snapshots CHANGE COLUMN paid_paise paid INT UNSIGNED NOT NULL DEFAULT 0;
UPDATE salary_slip_snapshots SET
  earned = ROUND(earned / 100),
  advance_adjusted = ROUND(advance_adjusted / 100),
  deduction = ROUND(deduction / 100),
  hold = ROUND(hold / 100),
  released = ROUND(released / 100),
  net_payable = ROUND(net_payable / 100),
  paid = ROUND(paid / 100);

INSERT INTO schema_migrations (version, name)
VALUES ('005', 'paise_to_rupees')
ON DUPLICATE KEY UPDATE applied_at = applied_at;
