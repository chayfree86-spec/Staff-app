<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();
$action = (string) ($input['action'] ?? 'create');

$businessId = $auth['business_id'];

if ($action !== 'create') {
    respond(['ok' => false, 'message' => 'Unknown action.'], 422);
}

$staffId = require_int_id($input, 'staffId');
$date = (string) ($input['date'] ?? '');
$salaryMonth = salary_month_from_label((string) ($input['month'] ?? ''));

if (!valid_date($date)) {
    respond(['ok' => false, 'message' => 'Valid payout date is required.'], 422);
}
if ($salaryMonth === null) {
    respond(['ok' => false, 'message' => 'Valid salary month is required (e.g. "July 2026").'], 422);
}

$paise = paise_from_rupees((float) ($input['amount'] ?? 0));
if ($paise <= 0) {
    respond(['ok' => false, 'message' => 'Amount must be greater than zero.'], 422);
}

$stmt = $pdo->prepare(
    'INSERT INTO salary_payouts (business_id, staff_id, salary_month, amount_paise, payout_date, payment_mode, remarks, status, created_by)
     SELECT ?, id, ?, ?, ?, ?, ?, \'paid\', ? FROM staff WHERE id = ? AND business_id = ?'
);
$stmt->execute([
    $businessId,
    $salaryMonth,
    $paise,
    $date,
    str_or_null($input['paymentMode'] ?? null),
    str_or_null($input['remarks'] ?? null),
    $auth['user_id'],
    $staffId,
    $businessId,
]);

if ($stmt->rowCount() === 0) {
    respond(['ok' => false, 'message' => 'Staff member not found.'], 404);
}

respond(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
