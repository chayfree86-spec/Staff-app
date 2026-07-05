<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();

$settings = is_array($input['settings'] ?? null) ? $input['settings'] : $input;

$weeklyHoliday = is_array($settings['weeklyHoliday'] ?? null) ? array_values(array_map('strval', $settings['weeklyHoliday'])) : [];

$weeklyHolidayPaid = enum_from_title((string) ($settings['weeklyHolidayPaid'] ?? 'Paid'));
if (!in_array($weeklyHolidayPaid, ['paid', 'unpaid'], true)) {
    $weeklyHolidayPaid = 'paid';
}

$monthCalculation = enum_from_title((string) ($settings['monthCalculation'] ?? 'Actual Calendar Month'));
if (!in_array($monthCalculation, ['actual_calendar_month', 'fixed_30_days'], true)) {
    $monthCalculation = 'actual_calendar_month';
}

$salaryCalculationBasis = enum_from_title((string) ($settings['salaryCalculationBasis'] ?? 'Attendance Based'));
if (!in_array($salaryCalculationBasis, ['attendance_based', 'fixed_salary'], true)) {
    $salaryCalculationBasis = 'attendance_based';
}

$theme = (string) ($settings['theme'] ?? 'light');
if (!in_array($theme, ['light', 'dark', 'system'], true)) {
    $theme = 'light';
}

$clamp = static function (mixed $value, int $min, int $max, int $fallback): int {
    $value = (int) ($value ?? $fallback);
    return max($min, min($max, $value));
};

$salaryCycleStart = $clamp($settings['salaryCycleStart'] ?? null, 1, 31, 1);
$salaryCycleEnd = $clamp($settings['salaryCycleEnd'] ?? null, 1, 31, 30);
$holdDays = $clamp($settings['newStaffSalaryHoldDays'] ?? null, 0, 31, 10);

$autoTime = (string) ($settings['autoAttendanceTime'] ?? '09:00');
if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $autoTime)) {
    $autoTime = '09:00';
}

$stmt = $pdo->prepare(
    'INSERT INTO business_settings (
        business_id, weekly_holidays, weekly_holiday_paid, salary_cycle_start, salary_cycle_end,
        new_staff_salary_hold_days, month_calculation, default_salary_calculation_basis,
        theme, auto_attendance_enabled, auto_attendance_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        auto_attendance_time = VALUES(auto_attendance_time)'
);
$stmt->execute([
    $auth['business_id'],
    json_encode($weeklyHoliday, JSON_UNESCAPED_UNICODE),
    $weeklyHolidayPaid,
    $salaryCycleStart,
    $salaryCycleEnd,
    $holdDays,
    $monthCalculation,
    $salaryCalculationBasis,
    $theme,
    !empty($settings['autoAttendanceEnabled']) ? 1 : 0,
    $autoTime . ':00',
]);

respond(['ok' => true]);
