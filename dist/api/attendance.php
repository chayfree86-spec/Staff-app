<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();
$action = (string) ($input['action'] ?? 'mark');

$businessId = $auth['business_id'];

$date = (string) ($input['date'] ?? '');
if (!valid_date($date)) {
    respond(['ok' => false, 'message' => 'Valid attendance date is required.'], 422);
}

$allowedStatuses = ['present', 'absent', 'half_day', 'holiday', 'unmarked'];

$entries = [];
if ($action === 'mark') {
    $entries[] = [
        'staffId' => (string) ($input['staffId'] ?? ''),
        'status' => (string) ($input['status'] ?? ''),
    ];
} elseif ($action === 'mark_bulk') {
    $rawEntries = is_array($input['entries'] ?? null) ? $input['entries'] : [];
    foreach ($rawEntries as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $entries[] = [
            'staffId' => (string) ($entry['staffId'] ?? ''),
            'status' => (string) ($entry['status'] ?? ''),
        ];
    }
} else {
    respond(['ok' => false, 'message' => 'Unknown action.'], 422);
}

if ($entries === []) {
    respond(['ok' => false, 'message' => 'No attendance entries provided.'], 422);
}

$stmt = $pdo->prepare(
    'INSERT INTO attendance_records (business_id, staff_id, attendance_date, status, marked_at, marked_by)
     SELECT ?, id, ?, ?, NOW(), ? FROM staff WHERE id = ? AND business_id = ?
     ON DUPLICATE KEY UPDATE status = ?, marked_at = NOW(), marked_by = ?'
);

foreach ($entries as $entry) {
    $status = enum_from_title($entry['status']);
    $staffId = (int) $entry['staffId'];
    if ($staffId <= 0 || !in_array($status, $allowedStatuses, true)) {
        respond(['ok' => false, 'message' => 'Invalid staff or status in attendance entry.'], 422);
    }
    $stmt->execute([
        $businessId,
        $date,
        $status,
        $auth['user_id'],
        $staffId,
        $businessId,
        $status,
        $auth['user_id'],
    ]);

    recompute_salary_slip_for_date($pdo, $businessId, $staffId, $date, (int) $auth['user_id']);
}

respond(['ok' => true]);
