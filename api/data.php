<?php

declare(strict_types=1);

function initials_for_name(string $name): string
{
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $initials = '';
    foreach ($parts as $part) {
        if ($part !== '') {
            $initials .= strtoupper(substr($part, 0, 1));
        }
    }
    return substr($initials, 0, 2);
}

function load_bootstrap_data(PDO $pdo, string $businessId): array
{
    $stmt = $pdo->prepare('SELECT id, name, logo_url, mobile, address FROM businesses WHERE id = ? LIMIT 1');
    $stmt->execute([$businessId]);
    $business = $stmt->fetch() ?: [
        'name' => '',
        'logo_url' => '',
        'mobile' => '',
        'address' => '',
    ];

    $stmt = $pdo->prepare('SELECT * FROM business_settings WHERE business_id = ? LIMIT 1');
    $stmt->execute([$businessId]);
    $settingsRow = $stmt->fetch() ?: [];
    $weeklyHolidays = json_decode((string) ($settingsRow['weekly_holidays'] ?? '[]'), true);
    if (!is_array($weeklyHolidays)) {
        $weeklyHolidays = [];
    }

    $stmt = $pdo->prepare('SELECT * FROM staff WHERE business_id = ? ORDER BY created_at ASC, name ASC');
    $stmt->execute([$businessId]);
    $staffRows = $stmt->fetchAll();
    // ids are ints in the DB; the frontend works with string ids everywhere.
    $staffList = array_map(static function (array $row): array {
        return [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'mobile' => $row['mobile'] ?? '',
            'avatar' => $row['avatar_initials'] ?: initials_for_name($row['name']),
            'monthlySalary' => (int) $row['monthly_salary'],
            'perDaySalary' => (int) $row['per_day_salary'],
            'salaryType' => title_from_enum($row['salary_type']),
            'calculationBasis' => title_from_enum($row['calculation_basis']),
            'joiningDate' => $row['joining_date'],
            'status' => title_from_enum($row['status']),
            'deactivationDate' => $row['deactivation_date'],
            'fatherName' => $row['father_name'],
            'mobile2' => $row['mobile2'],
            'address' => $row['address'],
            'profileImage' => $row['profile_image_url'],
            'releasedSalaryHold' => (bool) $row['released_salary_hold'],
        ];
    }, $staffRows);

    $stmt = $pdo->prepare('SELECT * FROM attendance_records WHERE business_id = ? ORDER BY attendance_date ASC');
    $stmt->execute([$businessId]);
    $attendance = [];
    foreach ($stmt->fetchAll() as $row) {
        $date = $row['attendance_date'];
        if (!isset($attendance[$date])) {
            $attendance[$date] = [];
        }
        $attendance[$date][(string) $row['staff_id']] = [
            'status' => title_from_enum($row['status']),
            'timestamp' => $row['marked_at'],
        ];
    }

    $stmt = $pdo->prepare('SELECT * FROM staff_transactions WHERE business_id = ? ORDER BY transaction_date ASC, created_at ASC');
    $stmt->execute([$businessId]);
    $advanceList = [];
    $deductionList = [];
    foreach ($stmt->fetchAll() as $row) {
        $amount = (int) $row['amount'];
        if ($row['kind'] === 'advance_given' || $row['kind'] === 'advance_returned') {
            $advanceList[] = [
                'id' => (string) $row['id'],
                'staffId' => (string) $row['staff_id'],
                'amount' => $row['kind'] === 'advance_returned' ? -$amount : $amount,
                'date' => $row['transaction_date'],
                'remarks' => $row['remarks'] ?? '',
            ];
            continue;
        }

        $deductionList[] = [
            'id' => (string) $row['id'],
            'staffId' => (string) $row['staff_id'],
            'amount' => $amount,
            'date' => $row['transaction_date'],
            'remarks' => $row['remarks'] ?? '',
        ];
    }

    $stmt = $pdo->prepare('SELECT * FROM salary_payouts WHERE business_id = ? ORDER BY payout_date ASC, created_at ASC');
    $stmt->execute([$businessId]);
    $payoutList = array_map(static function (array $row): array {
        return [
            'id' => (string) $row['id'],
            'staffId' => (string) $row['staff_id'],
            'amount' => (int) $row['amount'],
            'date' => $row['payout_date'],
            'month' => date('F Y', strtotime($row['salary_month'])),
            'paymentMode' => $row['payment_mode'],
            'remarks' => $row['remarks'],
        ];
    }, $stmt->fetchAll());

    return [
        'businessInfo' => [
            'name' => $business['name'] ?? '',
            'logo' => $business['logo_url'] ?? '',
            'mobile' => $business['mobile'] ?? '',
            'address' => $business['address'] ?? '',
        ],
        'settings' => [
            'weeklyHoliday' => $weeklyHolidays,
            'weeklyHolidayPaid' => title_from_enum($settingsRow['weekly_holiday_paid'] ?? 'paid'),
            'salaryCycleStart' => (int) ($settingsRow['salary_cycle_start'] ?? 1),
            'salaryCycleEnd' => (int) ($settingsRow['salary_cycle_end'] ?? 30),
            'newStaffSalaryHoldDays' => (int) ($settingsRow['new_staff_salary_hold_days'] ?? 10),
            'monthCalculation' => title_from_enum($settingsRow['month_calculation'] ?? 'actual_calendar_month'),
            'salaryCalculationBasis' => title_from_enum($settingsRow['default_salary_calculation_basis'] ?? 'attendance_based'),
            'theme' => $settingsRow['theme'] ?? 'light',
            'autoAttendanceEnabled' => (bool) ($settingsRow['auto_attendance_enabled'] ?? 0),
            'autoAttendanceTime' => substr((string) ($settingsRow['auto_attendance_time'] ?? '09:00:00'), 0, 5),
        ],
        'staffList' => $staffList,
        'attendance' => (object) $attendance,
        'advanceList' => $advanceList,
        'deductionList' => $deductionList,
        'payoutList' => $payoutList,
    ];
}
