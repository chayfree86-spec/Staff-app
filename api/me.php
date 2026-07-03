<?php

require_once __DIR__ . '/_bootstrap.php';

$session = require_user();
$pdo = db();

$stmt = $pdo->prepare('SELECT id, business_id, name, mobile, email FROM app_users WHERE id = ? AND is_active = 1 LIMIT 1');
$stmt->execute([$session['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    respond(['ok' => false, 'message' => 'Not authenticated.'], 401);
}

respond([
    'ok' => true,
    'user' => [
        'id' => $user['id'],
        'businessId' => $user['business_id'],
        'name' => $user['name'],
        'mobile' => $user['mobile'],
        'email' => $user['email'],
    ],
    'data' => load_bootstrap_data($pdo, $user['business_id']),
]);
