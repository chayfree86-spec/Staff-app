<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();
$action = (string) ($input['action'] ?? '');
$type = (string) ($input['type'] ?? '');

$businessId = $auth['business_id'];

if (!in_array($type, ['advance', 'deduction'], true)) {
    respond(['ok' => false, 'message' => 'Transaction type must be advance or deduction.'], 422);
}

// The frontend represents "advance returned" as a negative advance amount;
// the DB stores a positive amount with kind = advance_returned instead.
function transaction_kind_and_paise(string $type, float $amount): array
{
    $paise = paise_from_rupees(abs($amount));
    if ($paise <= 0) {
        respond(['ok' => false, 'message' => 'Amount must be greater than zero.'], 422);
    }
    if ($type === 'deduction') {
        return ['deduction', $paise];
    }
    return [$amount < 0 ? 'advance_returned' : 'advance_given', $paise];
}

if ($action === 'create') {
    $staffId = trim((string) ($input['staffId'] ?? ''));
    $date = (string) ($input['date'] ?? '');
    if ($staffId === '' || !valid_date($date)) {
        respond(['ok' => false, 'message' => 'Staff id and valid date are required.'], 422);
    }

    [$kind, $paise] = transaction_kind_and_paise($type, (float) ($input['amount'] ?? 0));
    $id = id_from_input($input);

    $stmt = $pdo->prepare(
        'INSERT INTO staff_transactions (id, business_id, staff_id, kind, amount_paise, transaction_date, remarks, created_by)
         SELECT ?, ?, id, ?, ?, ?, ?, ? FROM staff WHERE id = ? AND business_id = ?'
    );
    $stmt->execute([
        $id,
        $businessId,
        $kind,
        $paise,
        $date,
        str_or_null($input['remarks'] ?? null),
        $auth['user_id'],
        $staffId,
        $businessId,
    ]);

    if ($stmt->rowCount() === 0) {
        respond(['ok' => false, 'message' => 'Staff member not found.'], 404);
    }

    respond(['ok' => true, 'id' => $id]);
}

if ($action === 'update') {
    $id = trim((string) ($input['id'] ?? ''));
    $date = (string) ($input['date'] ?? '');
    if ($id === '' || !valid_date($date)) {
        respond(['ok' => false, 'message' => 'Transaction id and valid date are required.'], 422);
    }

    [$kind, $paise] = transaction_kind_and_paise($type, (float) ($input['amount'] ?? 0));

    $stmt = $pdo->prepare(
        'UPDATE staff_transactions
         SET kind = ?, amount_paise = ?, transaction_date = ?, remarks = ?
         WHERE id = ? AND business_id = ?'
    );
    $stmt->execute([
        $kind,
        $paise,
        $date,
        str_or_null($input['remarks'] ?? null),
        $id,
        $businessId,
    ]);

    respond(['ok' => true, 'id' => $id]);
}

if ($action === 'delete') {
    $id = trim((string) ($input['id'] ?? ''));
    if ($id === '') {
        respond(['ok' => false, 'message' => 'Transaction id is required.'], 422);
    }

    $stmt = $pdo->prepare('DELETE FROM staff_transactions WHERE id = ? AND business_id = ?');
    $stmt->execute([$id, $businessId]);

    respond(['ok' => true]);
}

respond(['ok' => false, 'message' => 'Unknown action.'], 422);
