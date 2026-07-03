<?php

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'message' => 'Method not allowed.'], 405);
}

$input = json_input();
$identifier = trim((string) ($input['identifier'] ?? ''));
$secret = (string) ($input['secret'] ?? '');
$method = (string) ($input['method'] ?? 'password');

if ($identifier === '' || $secret === '' || !in_array($method, ['password', 'pin'], true)) {
    respond(['ok' => false, 'message' => 'Mobile/email and password/PIN are required.'], 422);
}

$pdo = db();
$stmt = $pdo->prepare(
    'SELECT id, business_id, name, mobile, email, password_hash, pin_hash
     FROM app_users
     WHERE is_active = 1 AND (mobile = ? OR email = ?)
     LIMIT 1'
);
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();

$hash = $method === 'pin' ? ($user['pin_hash'] ?? '') : ($user['password_hash'] ?? '');
if (!$user || !$hash || !password_verify($secret, $hash)) {
    respond(['ok' => false, 'message' => 'Invalid login details.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
$_SESSION['business_id'] = $user['business_id'];

$stmt = $pdo->prepare('UPDATE app_users SET last_login_at = NOW() WHERE id = ?');
$stmt->execute([$user['id']]);

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
