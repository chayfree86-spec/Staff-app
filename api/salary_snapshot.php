<?php

declare(strict_types=1);

// Recomputes and upserts the salary_slip_snapshots row for one staff member and
// one salary month (Y-m-01), mirroring the calculation used by the frontend
// (SalaryScreen/StaffProfileScreen/ReportsScreen/SalarySlipModal getSalaryDetails).
// Called after any change that could affect a month's numbers, so the table
// always reflects the current attendance/salary/advance/deduction/payout state.
function recompute_salary_slip_snapshot(PDO $pdo, string $businessId, int $staffId, string $salaryMonth, ?int $generatedBy = null): void
{
    $monthPrefix = substr($salaryMonth, 0, 7); // 'YYYY-MM'

    $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ? AND business_id = ? LIMIT 1');
    $stmt->execute([$staffId, $businessId]);
    $staff = $stmt->fetch();
    if (!$staff) {
        return;
    }

    $stmt = $pdo->prepare('SELECT new_staff_salary_hold_days FROM business_settings WHERE business_id = ? LIMIT 1');
    $stmt->execute([$businessId]);
    $holdDays = (int) ($stmt->fetchColumn() ?: 0);

    $stmt = $pdo->prepare(
        "SELECT status, COUNT(*) AS cnt FROM attendance_records
         WHERE business_id = ? AND staff_id = ? AND DATE_FORMAT(attendance_date, '%Y-%m') = ?
         GROUP BY status"
    );
    $stmt->execute([$businessId, $staffId, $monthPrefix]);
    $counts = ['present' => 0, 'absent' => 0, 'half_day' => 0, 'holiday' => 0];
    foreach ($stmt->fetchAll() as $row) {
        if (isset($counts[$row['status']])) {
            $counts[$row['status']] = (int) $row['cnt'];
        }
    }
    $presentDays = $counts['present'];
    $absentDays = $counts['absent'];
    $halfDays = $counts['half_day'];
    $holidayDays = $counts['holiday'];
    $totalDaysCredited = $presentDays + ($halfDays * 0.5) + $holidayDays;

    $perDayVal = (int) $staff['per_day_salary'];
    $monthlySalary = (int) $staff['monthly_salary'];

    $earned = ($staff['calculation_basis'] === 'fixed_salary' && $staff['salary_type'] === 'monthly')
        ? $monthlySalary
        : (int) round($totalDaysCredited * $perDayVal);

    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(amount), 0) FROM staff_transactions
         WHERE staff_id = ? AND kind = 'advance_returned' AND DATE_FORMAT(transaction_date, '%Y-%m') = ?"
    );
    $stmt->execute([$staffId, $monthPrefix]);
    $advanceAdjusted = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(amount), 0) FROM staff_transactions
         WHERE staff_id = ? AND kind = 'deduction' AND DATE_FORMAT(transaction_date, '%Y-%m') = ?"
    );
    $stmt->execute([$staffId, $monthPrefix]);
    $deduction = (int) $stmt->fetchColumn();

    $holdAmount = 0;
    $releasedAmount = 0;
    if ($holdDays > 0) {
        $joiningMonth = substr((string) $staff['joining_date'], 0, 7);
        if ($joiningMonth === $monthPrefix) {
            if ((bool) $staff['released_salary_hold']) {
                $releasedAmount = (int) round($holdDays * $perDayVal);
            } else {
                $holdAmount = min($earned, (int) round($holdDays * $perDayVal));
            }
        }
        if (
            $staff['status'] === 'inactive'
            && $staff['deactivation_date']
            && substr((string) $staff['deactivation_date'], 0, 7) === $monthPrefix
            && !(bool) $staff['released_salary_hold']
        ) {
            $releasedAmount = (int) round($holdDays * $perDayVal);
        }
    }

    $netPayable = max(0, $earned - $advanceAdjusted - $deduction - $holdAmount + $releasedAmount);

    $stmt = $pdo->prepare('SELECT COALESCE(SUM(amount), 0) FROM salary_payouts WHERE staff_id = ? AND salary_month = ?');
    $stmt->execute([$staffId, $salaryMonth]);
    $paid = (int) $stmt->fetchColumn();

    $paymentStatus = $paid >= $netPayable ? 'paid' : ($paid > 0 ? 'partial' : 'unpaid');

    $stmt = $pdo->prepare('SELECT name, mobile, address FROM businesses WHERE id = ? LIMIT 1');
    $stmt->execute([$businessId]);
    $business = $stmt->fetch() ?: [];

    $stmt = $pdo->prepare(
        'SELECT payout_date, amount, payment_mode, remarks FROM salary_payouts
         WHERE staff_id = ? AND salary_month = ? ORDER BY payout_date ASC, created_at ASC'
    );
    $stmt->execute([$staffId, $salaryMonth]);
    $payouts = $stmt->fetchAll();

    $snapshotJson = json_encode([
        'businessName' => $business['name'] ?? '',
        'businessAddress' => $business['address'] ?? '',
        'businessMobile' => $business['mobile'] ?? '',
        'staffName' => $staff['name'],
        'staffMobile' => $staff['mobile'],
        'salaryType' => title_from_enum($staff['salary_type']),
        'calculationBasis' => title_from_enum($staff['calculation_basis']),
        'monthlySalary' => $monthlySalary,
        'perDaySalary' => $perDayVal,
        'payouts' => array_map(static function (array $p): array {
            return [
                'date' => $p['payout_date'],
                'amount' => (int) $p['amount'],
                'paymentMode' => $p['payment_mode'],
                'remarks' => $p['remarks'],
            ];
        }, $payouts),
    ], JSON_UNESCAPED_UNICODE);

    $stmt = $pdo->prepare(
        'INSERT INTO salary_slip_snapshots (
            business_id, staff_id, salary_month, earned, advance_adjusted, deduction,
            hold, released, net_payable, paid, payment_status,
            present_days, absent_days, half_days, holiday_days, snapshot_json, generated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            earned = VALUES(earned),
            advance_adjusted = VALUES(advance_adjusted),
            deduction = VALUES(deduction),
            hold = VALUES(hold),
            released = VALUES(released),
            net_payable = VALUES(net_payable),
            paid = VALUES(paid),
            payment_status = VALUES(payment_status),
            present_days = VALUES(present_days),
            absent_days = VALUES(absent_days),
            half_days = VALUES(half_days),
            holiday_days = VALUES(holiday_days),
            snapshot_json = VALUES(snapshot_json),
            generated_at = CURRENT_TIMESTAMP,
            generated_by = VALUES(generated_by)'
    );
    $stmt->execute([
        $businessId, $staffId, $salaryMonth, $earned, $advanceAdjusted, $deduction,
        $holdAmount, $releasedAmount, $netPayable, $paid, $paymentStatus,
        $presentDays, $absentDays, $halfDays, $holidayDays, $snapshotJson, $generatedBy,
    ]);
}

// Recomputes the snapshot for whichever month a given date falls in.
function recompute_salary_slip_for_date(PDO $pdo, string $businessId, int $staffId, string $date, ?int $generatedBy = null): void
{
    $salaryMonth = date('Y-m-01', strtotime($date));
    recompute_salary_slip_snapshot($pdo, $businessId, $staffId, $salaryMonth, $generatedBy);
}

// Recomputes every month that has any recorded attendance/transaction/payout/
// snapshot data for this staff member, plus the current month. Used after a
// staff record edit (salary/basis/status), since that can affect several
// months' figures at once.
function recompute_salary_slip_all_months(PDO $pdo, string $businessId, int $staffId, ?int $generatedBy = null): void
{
    $stmt = $pdo->prepare(
        "SELECT DISTINCT DATE_FORMAT(attendance_date, '%Y-%m-01') AS m FROM attendance_records WHERE business_id = ? AND staff_id = ?
         UNION SELECT DISTINCT DATE_FORMAT(transaction_date, '%Y-%m-01') FROM staff_transactions WHERE business_id = ? AND staff_id = ?
         UNION SELECT DISTINCT salary_month FROM salary_payouts WHERE business_id = ? AND staff_id = ?
         UNION SELECT DISTINCT salary_month FROM salary_slip_snapshots WHERE business_id = ? AND staff_id = ?
         UNION SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01')"
    );
    $stmt->execute([$businessId, $staffId, $businessId, $staffId, $businessId, $staffId, $businessId, $staffId]);
    $months = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($months as $month) {
        if ($month) {
            recompute_salary_slip_snapshot($pdo, $businessId, $staffId, (string) $month, $generatedBy);
        }
    }
}
