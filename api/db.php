<?php

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $config['db_charset']
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
    $pdo->exec("SET time_zone = '+05:30'");

    run_auto_migrations($pdo);

    return $pdo;
}

function run_auto_migrations(PDO $pdo): void
{
    static $migrationsRun = false;
    if ($migrationsRun) {
        return;
    }
    $migrationsRun = true;

    // 1. Ensure schema_migrations table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // 2. Fetch applied migrations
    $stmt = $pdo->query("SELECT version FROM schema_migrations");
    $applied = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // 3. Scan migrations directory
    $migrationsDir = __DIR__ . '/migrations';
    if (!is_dir($migrationsDir)) {
        return;
    }

    $files = glob($migrationsDir . '/*.sql');
    if ($files === false) {
        return;
    }

    // Sort files by name (e.g. 001, 002, 003...)
    sort($files);

    foreach ($files as $file) {
        $filename = basename($file);
        // Extract version (digits at the start of filename)
        if (preg_match('/^(\d+)/', $filename, $matches)) {
            $version = $matches[1];
            if (in_array($version, $applied, true)) {
                continue; // Already applied
            }

            // Read migration content
            $sql = file_get_contents($file);
            if ($sql === false) {
                continue;
            }

            // Remove 'USE staff;' or any other 'USE database;' statements so it runs on the currently selected DB
            $sql = preg_replace('/^\s*USE\s+\w+;\s*$/im', '', $sql);

            // Execute the migration SQL
            try {
                $pdo->exec($sql);

                // If the migration script did NOT insert itself into schema_migrations, do it here
                $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM schema_migrations WHERE version = ?");
                $stmtCheck->execute([$version]);
                if ((int) $stmtCheck->fetchColumn() === 0) {
                    $name = preg_replace('/^\d+_(.+)\.sql$/', '$1', $filename);
                    $stmtInsert = $pdo->prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)");
                    $stmtInsert->execute([$version, $name]);
                }
            } catch (PDOException $e) {
                // Log and halt on failure to prevent any inconsistent state
                error_log("Database Migration Failed on version {$version}: " . $e->getMessage());
                throw new RuntimeException("Database Migration Failed on version {$version}. Error: " . $e->getMessage());
            }
        }
    }
}
