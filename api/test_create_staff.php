<?php
require_once __DIR__ . '/_bootstrap.php';
$pdo = db();

$businessId = 1; // standard business ID
$auth = ['user_id' => 1, 'business_id' => 1];

$payload = [
    'name' => 'Test Staff Member',
    'father_name' => 'Father Name',
    'mobile' => '9999999999',
    'mobile2' => null,
    'address' => 'Test Address',
    'avatar_initials' => 'TS',
    'profile_image_url' => null,
    'monthly_salary' => 15000,
    'per_day_salary' => 500,
    'salary_type' => 'monthly',
    'calculation_basis' => 'attendance_based',
    'joining_date' => '2026-07-01',
    'status' => 'active',
    'deactivation_date' => null,
    'released_salary_hold' => 0
];

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare(
        'INSERT INTO staff (
            business_id, name, father_name, mobile, mobile2, address,
            avatar_initials, profile_image_url, monthly_salary, per_day_salary,
            salary_type, calculation_basis, joining_date, status, deactivation_date,
            released_salary_hold, owner_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $businessId,
        $payload['name'],
        $payload['father_name'],
        $payload['mobile'],
        $payload['mobile2'],
        $payload['address'],
        $payload['avatar_initials'],
        $payload['profile_image_url'],
        $payload['monthly_salary'],
        $payload['per_day_salary'],
        $payload['salary_type'],
        $payload['calculation_basis'],
        $payload['joining_date'],
        $payload['status'],
        $payload['deactivation_date'],
        $payload['released_salary_hold'],
        $auth['user_id'],
    ]);

    $newStaffId = (int) $pdo->lastInsertId();
    echo "New Staff ID: " . $newStaffId . "\n";

    // Get weekly holidays from settings
    $stmtSettings = $pdo->prepare('SELECT weekly_holidays FROM business_settings WHERE business_id = ? LIMIT 1');
    $stmtSettings->execute([$businessId]);
    $settingsRow = $stmtSettings->fetch();
    $weeklyHolidays = [];
    if ($settingsRow && !empty($settingsRow['weekly_holidays'])) {
        $weeklyHolidays = json_decode($settingsRow['weekly_holidays'], true);
        if (!is_array($weeklyHolidays)) {
            $weeklyHolidays = [];
        }
    }
    echo "Weekly Holidays: " . json_encode($weeklyHolidays) . "\n";

    // Auto-mark attendance from joining date to current date (inclusive)
    $currentDateStr = date('Y-m-d');
    $joiningDateStr = $payload['joining_date'];
    echo "Current Date: " . $currentDateStr . "\n";
    echo "Joining Date: " . $joiningDateStr . "\n";

    if (strtotime($joiningDateStr) <= strtotime($currentDateStr)) {
        $joinDateObj = new DateTime($joiningDateStr);
        $currentDateObj = new DateTime($currentDateStr);
        $currentDateObj->modify('+1 day'); // to include current date in period

        $interval = new DateInterval('P1D');
        $period = new DatePeriod($joinDateObj, $interval, $currentDateObj);

        $stmtAtt = $pdo->prepare(
            'INSERT INTO attendance_records (business_id, staff_id, attendance_date, status, marked_at, marked_by)
             VALUES (?, ?, ?, ?, NOW(), ?)
             ON DUPLICATE KEY UPDATE status = ?, marked_at = NOW(), marked_by = ?'
        );

        foreach ($period as $dt) {
            $dateStr = $dt->format('Y-m-d');
            $dayName = $dt->format('l'); // Full representation of the day of the week, e.g. Sunday
            $isHoliday = in_array($dayName, $weeklyHolidays, true);
            $status = $isHoliday ? 'holiday' : 'present';

            echo "Marking $dateStr as $status\n";
            $stmtAtt->execute([
                $businessId,
                $newStaffId,
                $dateStr,
                $status,
                $auth['user_id'],
                $status,
                $auth['user_id'],
            ]);
        }
    } else {
        echo "Joining date is in the future. Skipping.\n";
    }

    recompute_salary_slip_all_months($pdo, $businessId, $newStaffId, (int) $auth['user_id']);

    $pdo->commit();
    echo "Success!\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    echo "Failed: " . $e->getMessage() . "\n";
}
