<?php

require_once __DIR__ . '/_bootstrap.php';

require_post();
$auth = require_user();
$pdo = db();
$input = json_input();
$action = (string) ($input['action'] ?? 'list');

// Business/user management is limited to the primary admin (first user).
if ((int) $auth['user_id'] !== 1) {
    respond(['ok' => false, 'message' => 'Only the primary admin can manage businesses.'], 403);
}

if ($action === 'list') {
    $businesses = $pdo->query(
        'SELECT b.id, b.name, b.mobile, b.address,
            (SELECT COUNT(*) FROM staff s WHERE s.business_id = b.id) AS staff_count
         FROM businesses b
         ORDER BY b.id ASC'
    )->fetchAll();

    $users = $pdo->query(
        'SELECT id, business_id, name, mobile, email, is_active, last_login_at
         FROM app_users
         ORDER BY business_id ASC, id ASC'
    )->fetchAll();

    $usersByBusiness = [];
    foreach ($users as $user) {
        $usersByBusiness[$user['business_id']][] = [
            'id' => (string) $user['id'],
            'name' => $user['name'],
            'mobile' => $user['mobile'],
            'email' => $user['email'],
            'isActive' => (bool) $user['is_active'],
            'lastLoginAt' => $user['last_login_at'],
        ];
    }

    $list = array_map(static function (array $row) use ($usersByBusiness): array {
        return [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'mobile' => $row['mobile'],
            'address' => $row['address'],
            'staffCount' => (int) $row['staff_count'],
            'users' => $usersByBusiness[$row['id']] ?? [],
        ];
    }, $businesses);

    respond(['ok' => true, 'businesses' => $list, 'currentUserId' => (string) $auth['user_id']]);
}

if ($action === 'switch') {
    $businessId = require_int_id($input, 'businessId');
    $_SESSION['business_id'] = $businessId;
    $data = load_bootstrap_data($pdo, (string) $businessId);
    respond([
        'ok' => true,
        'data' => $data
    ]);
}

if ($action === 'toggle_user') {
    $userId = require_int_id($input, 'userId');
    $isActive = !empty($input['isActive']) ? 1 : 0;

    if ($userId === (int) $auth['user_id']) {
        respond(['ok' => false, 'message' => 'You cannot disable your own login.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE app_users SET is_active = ? WHERE id = ?');
    $stmt->execute([$isActive, $userId]);

    respond(['ok' => true]);
}

if ($action === 'update_business') {
    $businessId = require_int_id($input, 'businessId');
    $name = trim((string) ($input['name'] ?? ''));
    if ($name === '') {
        respond(['ok' => false, 'message' => 'Business name is required.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE businesses SET name = ?, mobile = ?, address = ? WHERE id = ?');
    $stmt->execute([
        $name,
        str_or_null($input['mobile'] ?? null),
        str_or_null($input['address'] ?? null),
        $businessId,
    ]);

    respond(['ok' => true]);
}

if ($action === 'delete_business') {
    $businessId = require_int_id($input, 'businessId');

    if ($businessId === (int) $auth['business_id']) {
        respond(['ok' => false, 'message' => 'You cannot delete your own business.'], 422);
    }

    // FK cascades remove users, settings, staff, attendance, transactions and payouts.
    $stmt = $pdo->prepare('DELETE FROM businesses WHERE id = ?');
    $stmt->execute([$businessId]);

    respond(['ok' => true]);
}

if ($action === 'update_user') {
    $userId = require_int_id($input, 'userId');
    $name = trim((string) ($input['name'] ?? ''));
    $mobile = trim((string) ($input['mobile'] ?? ''));
    $email = trim((string) ($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $pin = trim((string) ($input['pin'] ?? ''));

    if ($name === '') {
        respond(['ok' => false, 'message' => 'User name is required.'], 422);
    }
    if ($mobile === '' && $email === '') {
        respond(['ok' => false, 'message' => 'User mobile or email is required for login.'], 422);
    }
    if ($mobile !== '' && !preg_match('/^\d{10}$/', $mobile)) {
        respond(['ok' => false, 'message' => 'User mobile must be exactly 10 digits.'], 422);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['ok' => false, 'message' => 'Enter a valid email address.'], 422);
    }
    if ($password !== '' && strlen($password) < 4) {
        respond(['ok' => false, 'message' => 'New password must be at least 4 characters long.'], 422);
    }
    if ($pin !== '' && !preg_match('/^\d{4,6}$/', $pin)) {
        respond(['ok' => false, 'message' => 'PIN must be 4 to 6 digits.'], 422);
    }

    // Login matches mobile/email across all businesses — keep them globally unique.
    $conditions = [];
    $params = [];
    if ($mobile !== '') {
        $conditions[] = 'mobile = ?';
        $params[] = $mobile;
    }
    if ($email !== '') {
        $conditions[] = 'email = ?';
        $params[] = $email;
    }
    $params[] = $userId;
    $stmt = $pdo->prepare(
        'SELECT id FROM app_users WHERE (' . implode(' OR ', $conditions) . ') AND id <> ? LIMIT 1'
    );
    $stmt->execute($params);
    if ($stmt->fetch()) {
        respond(['ok' => false, 'message' => 'This mobile/email is already registered with another account.'], 422);
    }

    $sets = ['name = ?', 'mobile = ?', 'email = ?'];
    $updateParams = [
        $name,
        $mobile !== '' ? $mobile : null,
        $email !== '' ? $email : null,
    ];
    if ($password !== '') {
        $sets[] = 'password_hash = ?';
        $updateParams[] = password_hash($password, PASSWORD_DEFAULT);
    }
    if ($pin !== '') {
        $sets[] = 'pin_hash = ?';
        $updateParams[] = password_hash($pin, PASSWORD_DEFAULT);
    }
    $updateParams[] = $userId;

    $stmt = $pdo->prepare('UPDATE app_users SET ' . implode(', ', $sets) . ' WHERE id = ?');
    $stmt->execute($updateParams);

    respond(['ok' => true]);
}

if ($action === 'delete_user') {
    $userId = require_int_id($input, 'userId');

    if ($userId === (int) $auth['user_id']) {
        respond(['ok' => false, 'message' => 'You cannot delete your own login.'], 422);
    }

    $stmt = $pdo->prepare('DELETE FROM app_users WHERE id = ?');
    $stmt->execute([$userId]);

    respond(['ok' => true]);
}

respond(['ok' => false, 'message' => 'Unknown action.'], 422);
