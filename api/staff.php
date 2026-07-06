<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();
$action = (string) ($input['action'] ?? '');

$businessId = $auth['business_id'];

function staff_payload_from_input(array $input): array
{
    $staff = is_array($input['staff'] ?? null) ? $input['staff'] : [];

    $name = trim((string) ($staff['name'] ?? ''));
    if ($name === '') {
        respond(['ok' => false, 'message' => 'Staff name is required.'], 422);
    }

    $salaryType = enum_from_title((string) ($staff['salaryType'] ?? 'Monthly'));
    if (!in_array($salaryType, ['monthly', 'daily'], true)) {
        $salaryType = 'monthly';
    }

    $calculationBasis = enum_from_title((string) ($staff['calculationBasis'] ?? 'Attendance Based'));
    if (!in_array($calculationBasis, ['attendance_based', 'fixed_salary'], true)) {
        $calculationBasis = 'attendance_based';
    }

    $status = enum_from_title((string) ($staff['status'] ?? 'Active'));
    if (!in_array($status, ['active', 'inactive'], true)) {
        $status = 'active';
    }

    $joiningDate = (string) ($staff['joiningDate'] ?? '');
    if (!valid_date($joiningDate)) {
        respond(['ok' => false, 'message' => 'Valid joining date is required.'], 422);
    }

    $deactivationDate = str_or_null($staff['deactivationDate'] ?? null);
    if ($deactivationDate !== null && !valid_date($deactivationDate)) {
        respond(['ok' => false, 'message' => 'Invalid deactivation date.'], 422);
    }
    if ($status === 'inactive' && $deactivationDate === null) {
        $deactivationDate = date('Y-m-d');
    }
    if ($status === 'active') {
        $deactivationDate = null;
    }

    return [
        'name' => $name,
        'father_name' => str_or_null($staff['fatherName'] ?? null),
        'mobile' => str_or_null($staff['mobile'] ?? null),
        'mobile2' => str_or_null($staff['mobile2'] ?? null),
        'address' => str_or_null($staff['address'] ?? null),
        'avatar_initials' => substr((string) ($staff['avatar'] ?? initials_for_name($name)), 0, 4),
        'profile_image_url' => str_or_null($staff['profileImage'] ?? null),
        'monthly_salary' => whole_rupees((float) ($staff['monthlySalary'] ?? 0)),
        'per_day_salary' => whole_rupees((float) ($staff['perDaySalary'] ?? 0)),
        'salary_type' => $salaryType,
        'calculation_basis' => $calculationBasis,
        'joining_date' => $joiningDate,
        'status' => $status,
        'deactivation_date' => $deactivationDate,
        'released_salary_hold' => !empty($staff['releasedSalaryHold']) ? 1 : 0,
    ];
}

if ($action === 'create') {
    $payload = staff_payload_from_input($input);

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

        // Auto-mark attendance from joining date to today (inclusive). Always
        // use the server's own date here — the client's "currentDate" is
        // whatever day the Attendance calendar happens to be viewing, not
        // necessarily today, so it cannot be trusted for this boundary.
        $currentDateStr = date('Y-m-d');
        $joiningDateStr = $payload['joining_date'];

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
        }

        recompute_salary_slip_all_months($pdo, $businessId, $newStaffId, (int) $auth['user_id']);

        $pdo->commit();
        respond(['ok' => true, 'id' => $newStaffId]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('create staff failed: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'Could not create staff: ' . $e->getMessage()], 500);
    }
}

if ($action === 'update') {
    $staffInput = is_array($input['staff'] ?? null) ? $input['staff'] : [];
    $id = require_int_id($staffInput);
    $payload = staff_payload_from_input($input);

    $stmt = $pdo->prepare(
        'UPDATE staff SET
            name = ?, father_name = ?, mobile = ?, mobile2 = ?, address = ?,
            avatar_initials = ?, profile_image_url = ?, monthly_salary = ?,
            per_day_salary = ?, salary_type = ?, calculation_basis = ?,
            joining_date = ?, status = ?, deactivation_date = ?, released_salary_hold = ?
         WHERE id = ? AND business_id = ?'
    );
    $stmt->execute([
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
        $id,
        $businessId,
    ]);

    recompute_salary_slip_all_months($pdo, $businessId, $id, (int) $auth['user_id']);

    respond(['ok' => true, 'id' => $id]);
}

if ($action === 'delete') {
    $id = require_int_id($input);

    $stmt = $pdo->prepare('DELETE FROM staff WHERE id = ? AND business_id = ?');
    $stmt->execute([$id, $businessId]);

    respond(['ok' => true]);
}

respond(['ok' => false, 'message' => 'Unknown action.'], 422);
