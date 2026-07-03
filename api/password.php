<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();

$oldPassword = (string) ($input['oldPassword'] ?? '');
$newPassword = (string) ($input['newPassword'] ?? '');

if ($oldPassword === '' || $newPassword === '') {
    respond(['ok' => false, 'message' => 'Old and new passwords are required.'], 422);
}
if (strlen($newPassword) < 4) {
    respond(['ok' => false, 'message' => 'New password must be at least 4 characters long.'], 422);
}

$stmt = $pdo->prepare('SELECT password_hash FROM app_users WHERE id = ? AND is_active = 1 LIMIT 1');
$stmt->execute([$auth['user_id']]);
$user = $stmt->fetch();

if (!$user || !password_verify($oldPassword, $user['password_hash'])) {
    respond(['ok' => false, 'message' => 'Incorrect old password.'], 401);
}

$stmt = $pdo->prepare('UPDATE app_users SET password_hash = ? WHERE id = ?');
$stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), $auth['user_id']]);

respond(['ok' => true]);
