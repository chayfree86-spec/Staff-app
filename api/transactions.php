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
    $staffId = require_int_id($input, 'staffId');
    $date = (string) ($input['date'] ?? '');
    if (!valid_date($date)) {
        respond(['ok' => false, 'message' => 'Valid date is required.'], 422);
    }

    [$kind, $paise] = transaction_kind_and_paise($type, (float) ($input['amount'] ?? 0));

    $stmt = $pdo->prepare(
        'INSERT INTO staff_transactions (business_id, staff_id, kind, amount_paise, transaction_date, remarks, created_by)
         SELECT ?, id, ?, ?, ?, ?, ? FROM staff WHERE id = ? AND business_id = ?'
    );
    $stmt->execute([
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

    respond(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

if ($action === 'update') {
    $id = require_int_id($input);
    $date = (string) ($input['date'] ?? '');
    if (!valid_date($date)) {
        respond(['ok' => false, 'message' => 'Valid date is required.'], 422);
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
    $id = require_int_id($input);

    $stmt = $pdo->prepare('DELETE FROM staff_transactions WHERE id = ? AND business_id = ?');
    $stmt->execute([$id, $businessId]);

    respond(['ok' => true]);
}

respond(['ok' => false, 'message' => 'Unknown action.'], 422);
