<?php

declare(strict_types=1);

function json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_user(): array
{
    if (empty($_SESSION['user_id']) || empty($_SESSION['business_id'])) {
        respond(['ok' => false, 'message' => 'Not authenticated.'], 401);
    }

    return [
        'user_id' => (string) $_SESSION['user_id'],
        'business_id' => (string) $_SESSION['business_id'],
    ];
}

function rupees_from_paise(?int $paise): int
{
    return (int) round(($paise ?? 0) / 100);
}

function title_from_enum(?string $value): string
{
    $value = str_replace('_', ' ', (string) $value);
    return ucwords($value);
}

function enum_from_title(?string $value): string
{
    return strtolower(str_replace(' ', '_', trim((string) $value)));
}

function paise_from_rupees(float|int $rupees): int
{
    return (int) round($rupees * 100);
}

function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['ok' => false, 'message' => 'Method not allowed.'], 405);
    }
}

function valid_uuid(string $value): bool
{
    return (bool) preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $value);
}

function uuid_v4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function id_from_input(array $input, string $key = 'id'): string
{
    $id = trim((string) ($input[$key] ?? ''));
    if ($id !== '' && !valid_uuid($id)) {
        respond(['ok' => false, 'message' => 'Invalid id format.'], 422);
    }
    return $id !== '' ? $id : uuid_v4();
}

function valid_date(?string $value): bool
{
    if (!is_string($value)) {
        return false;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $value);
    return $dt !== false && $dt->format('Y-m-d') === $value;
}

function str_or_null(mixed $value): ?string
{
    $value = trim((string) ($value ?? ''));
    return $value === '' ? null : $value;
}

// Accepts a month label like "July 2026" (frontend format) or "2026-07" and
// returns the first day of that month as Y-m-d, or null when unparseable.
function salary_month_from_label(?string $label): ?string
{
    $label = trim((string) $label);
    if ($label === '') {
        return null;
    }
    $dt = DateTime::createFromFormat('d F Y', '01 ' . $label);
    if ($dt === false && preg_match('/^\d{4}-\d{2}$/', $label)) {
        $dt = DateTime::createFromFormat('Y-m-d', $label . '-01');
    }
    return $dt === false || $dt === null ? null : $dt->format('Y-m-01');
}
