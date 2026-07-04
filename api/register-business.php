<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();

// Only the primary admin (first user) can create businesses.
if ((int) $auth['user_id'] !== 1) {
    respond(['ok' => false, 'message' => 'Only the primary admin can create businesses.'], 403);
}

$businessName = trim((string) ($input['businessName'] ?? ''));
$businessMobile = trim((string) ($input['businessMobile'] ?? ''));
$businessAddress = trim((string) ($input['businessAddress'] ?? ''));

$userName = trim((string) ($input['userName'] ?? ''));
$userMobile = trim((string) ($input['userMobile'] ?? ''));
$userEmail = trim((string) ($input['userEmail'] ?? ''));
$password = (string) ($input['password'] ?? '');
$pin = trim((string) ($input['pin'] ?? ''));

if ($businessName === '') {
    respond(['ok' => false, 'message' => 'Business name is required.'], 422);
}
if ($userName === '') {
    respond(['ok' => false, 'message' => 'Admin user name is required.'], 422);
}
if ($userMobile === '' && $userEmail === '') {
    respond(['ok' => false, 'message' => 'User mobile or email is required for login.'], 422);
}
if ($userMobile !== '' && !preg_match('/^\d{10}$/', $userMobile)) {
    respond(['ok' => false, 'message' => 'User mobile must be exactly 10 digits.'], 422);
}
if ($userEmail !== '' && !filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
    respond(['ok' => false, 'message' => 'Enter a valid email address.'], 422);
}
if (strlen($password) < 4) {
    respond(['ok' => false, 'message' => 'Password must be at least 4 characters long.'], 422);
}
if ($pin !== '' && !preg_match('/^\d{4,6}$/', $pin)) {
    respond(['ok' => false, 'message' => 'PIN must be 4 to 6 digits.'], 422);
}

// Login matches mobile/email across all businesses, so they must be globally unique.
$conditions = [];
$params = [];
if ($userMobile !== '') {
    $conditions[] = 'mobile = ?';
    $params[] = $userMobile;
}
if ($userEmail !== '') {
    $conditions[] = 'email = ?';
    $params[] = $userEmail;
}
$stmt = $pdo->prepare('SELECT id FROM app_users WHERE ' . implode(' OR ', $conditions) . ' LIMIT 1');
$stmt->execute($params);
if ($stmt->fetch()) {
    respond(['ok' => false, 'message' => 'This mobile/email is already registered with another account.'], 422);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('INSERT INTO businesses (name, mobile, address) VALUES (?, ?, ?)');
    $stmt->execute([
        $businessName,
        $businessMobile !== '' ? $businessMobile : null,
        $businessAddress !== '' ? $businessAddress : null,
    ]);
    $businessId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'INSERT INTO app_users (business_id, name, mobile, email, password_hash, pin_hash)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $businessId,
        $userName,
        $userMobile !== '' ? $userMobile : null,
        $userEmail !== '' ? $userEmail : null,
        password_hash($password, PASSWORD_DEFAULT),
        $pin !== '' ? password_hash($pin, PASSWORD_DEFAULT) : null,
    ]);
    $userId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'INSERT INTO business_settings (business_id, weekly_holidays) VALUES (?, ?)'
    );
    $stmt->execute([$businessId, json_encode(['Sunday'])]);

    $pdo->commit();

    respond([
        'ok' => true,
        'message' => 'Business created successfully.',
        'businessId' => $businessId,
        'userId' => $userId,
    ]);
} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('register-business failed: ' . $e->getMessage());
    respond(['ok' => false, 'message' => 'Could not create business. Please try again.'], 500);
}
