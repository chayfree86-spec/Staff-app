<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();

$info = is_array($input['businessInfo'] ?? null) ? $input['businessInfo'] : $input;

$name = trim((string) ($info['name'] ?? ''));
if ($name === '') {
    respond(['ok' => false, 'message' => 'Business name is required.'], 422);
}

$stmt = $pdo->prepare('UPDATE businesses SET name = ?, logo_url = ?, mobile = ?, address = ? WHERE id = ?');
$stmt->execute([
    $name,
    str_or_null($info['logo'] ?? null),
    str_or_null($info['mobile'] ?? null),
    str_or_null($info['address'] ?? null),
    $auth['business_id'],
]);

respond(['ok' => true]);
