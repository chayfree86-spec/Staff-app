<?php

declare(strict_types=1);

function json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_user(): array
{
    if (empty($_SESSION['user_id']) || empty($_SESSION['business_id'])) {
        respond(['ok' => false, 'message' => 'Not authenticated.'], 401);
    }

    return [
        'user_id' => (string) $_SESSION['user_id'],
        'business_id' => (string) $_SESSION['business_id'],
    ];
}

function title_from_enum(?string $value): string
{
    $value = str_replace('_', ' ', (string) $value);
    return ucwords($value);
}

function enum_from_title(?string $value): string
{
    return strtolower(str_replace(' ', '_', trim((string) $value)));
}

// Money is stored as whole rupees; round any decimal input down to a whole number.
function whole_rupees(float|int $amount): int
{
    return (int) round((float) $amount);
}

// Mirrors src/utils/salary.ts::getSalaryCycleForDate — keep both in sync.
// Returns the salary cycle [start, end, label] a given date falls into.
// When cycleStartDay is 1 (the default) this is exactly the calendar month.
// When it's e.g. 26, 2026-07-10 falls in 2026-06-26..2026-07-25, labelled
// '2026-07' (the month the cycle ends in — the "July payroll").
function salary_cycle_for_date(string $dateStr, int $cycleStartDay): array
{
    $clampedStart = max(1, min(28, $cycleStartDay ?: 1));
    $parts = explode('-', $dateStr);
    $year = (int) ($parts[0] ?? 0);
    $month = (int) ($parts[1] ?? 0);
    $day = (int) ($parts[2] ?? 0);
    if (!$year || !$month || !$day) {
        return ['label' => substr($dateStr, 0, 7), 'start' => $dateStr, 'end' => $dateStr];
    }

    if ($day < $clampedStart) {
        $month -= 1;
        if ($month < 1) {
            $month = 12;
            $year -= 1;
        }
    }

    $start = sprintf('%04d-%02d-%02d', $year, $month, $clampedStart);
    $endMonth = $month + 1;
    $endYear = $year;
    if ($endMonth > 12) {
        $endMonth = 1;
        $endYear += 1;
    }
    $end = date('Y-m-d', mktime(0, 0, 0, $endMonth, $clampedStart - 1, $endYear));

    return [
        'label' => substr($end, 0, 7),
        'start' => $start,
        'end' => $end,
    ];
}

// Mirrors src/utils/salary.ts::getSalaryCycleForLabel — keep both in sync.
// Given a 'YYYY-MM' salary_month label, returns the same cycle that would
// have produced that label from salary_cycle_for_date(). The label is the
// month the cycle's LAST day falls in, so day 1 of the label month is always
// still within that same cycle (day 1 is always < any valid cycleStartDay
// except 1, where the cycle starts on day 1 anyway) — a safe probe date.
function salary_cycle_for_label(string $yearMonthLabel, int $cycleStartDay): array
{
    $parts = explode('-', $yearMonthLabel);
    $year = (int) ($parts[0] ?? 0);
    $month = (int) ($parts[1] ?? 0);
    if (!$year || !$month) {
        return ['label' => $yearMonthLabel, 'start' => $yearMonthLabel . '-01', 'end' => $yearMonthLabel . '-31'];
    }
    $probeDate = sprintf('%04d-%02d-01', $year, $month);
    return salary_cycle_for_date($probeDate, $cycleStartDay);
}

// Mirrors src/utils/salary.ts::getEffectivePerDayRate — keep both in sync.
// "Fixed 30 Days" keeps the flat rate already stored on the staff record.
// "Actual Calendar Month" re-derives the day rate from the real number of
// days in the given cycle. Only applies to Monthly + Attendance Based staff.
function effective_per_day_rate(array $staff, array $cycle, string $monthCalculation): int
{
    if ($staff['salary_type'] !== 'monthly' || $staff['calculation_basis'] !== 'attendance_based') {
        return (int) $staff['per_day_salary'];
    }
    if ($monthCalculation !== 'actual_calendar_month') {
        return (int) $staff['per_day_salary'];
    }

    $days = (int) ((strtotime($cycle['end']) - strtotime($cycle['start'])) / 86400) + 1;
    if ($days <= 0) {
        return (int) $staff['per_day_salary'];
    }

    return (int) round(((int) $staff['monthly_salary']) / $days);
}

function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['ok' => false, 'message' => 'Method not allowed.'], 405);
    }
}

// IDs are INT AUTO_INCREMENT; the server assigns them. This validates ids the
// frontend sends back for updates/deletes (rejects temp ids like "tmp-...").
function require_int_id(array $input, string $key = 'id'): int
{
    $raw = $input[$key] ?? null;
    $id = (int) $raw;
    if ($id <= 0 || (string) $id !== trim((string) $raw)) {
        respond(['ok' => false, 'message' => 'Valid numeric id is required.'], 422);
    }
    return $id;
}

function valid_date(?string $value): bool
{
    if (!is_string($value)) {
        return false;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $value);
    return $dt !== false && $dt->format('Y-m-d') === $value;
}

function str_or_null(mixed $value): ?string
{
    $value = trim((string) ($value ?? ''));
    return $value === '' ? null : $value;
}

// Accepts a month label like "July 2026" (frontend format) or "2026-07" and
// returns the first day of that month as Y-m-d, or null when unparseable.
function salary_month_from_label(?string $label): ?string
{
    $label = trim((string) $label);
    if ($label === '') {
        return null;
    }
    $dt = DateTime::createFromFormat('d F Y', '01 ' . $label);
    if ($dt === false && preg_match('/^\d{4}-\d{2}$/', $label)) {
        $dt = DateTime::createFromFormat('Y-m-d', $label . '-01');
    }
    return $dt === false || $dt === null ? null : $dt->format('Y-m-01');
}
