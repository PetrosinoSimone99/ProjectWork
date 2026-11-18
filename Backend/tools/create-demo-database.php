<?php

declare(strict_types=1);

// Run from Backend with: php tools/create-demo-database.php
// This one-time tool refuses to seed a database that already contains data.
require dirname(__DIR__).'/vendor/autoload.php';
chdir(dirname(__DIR__));
(new Symfony\Component\Dotenv\Dotenv())->bootEnv('.env');

$url = parse_url($_SERVER['DATABASE_URL']);
$databaseName = ltrim($url['path'] ?? '', '/');
if ($url === false || ($url['scheme'] ?? '') !== 'mysql' || ($databaseName !== 'barattolo' && !preg_match('/^workflow_[a-z0-9_]+_test$/', $databaseName))
    || !in_array($url['host'] ?? '', ['127.0.0.1', 'localhost', 'database'], true)) {
    throw new RuntimeException('This tool requires the local MySQL barattolo database.');
}
$pdo = new PDO(
    'mysql:host='.$url['host'].';port='.($url['port'] ?? 3306).';dbname='.$databaseName.';charset=utf8mb4',
    urldecode($url['user'] ?? ''), urldecode($url['pass'] ?? ''),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);
$pdo->exec("SET time_zone = '+00:00'");
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    if ($table === 'doctrine_migration_versions') { continue; }
    if ((int) $pdo->query('SELECT COUNT(*) FROM '.quoteName($table))->fetchColumn() !== 0) {
        throw new RuntimeException('The database is no longer empty. Nothing has been changed.');
    }
}
$output = $argv[1] ?? __DIR__.'/../var/demo-export.sql';
if (file_exists($output)) {
    throw new RuntimeException('The demo dump already exists. Refusing to overwrite it.');
}

// Capture every table before any DDL. MySQL DROP TABLE cannot be rolled back.
$backupDirectory = __DIR__.'/../var/backups';
if (!is_dir($backupDirectory) && !mkdir($backupDirectory, 0777, true)) {
    throw new RuntimeException('Cannot create the backup directory.');
}
$backup = $backupDirectory.'/barattolo_before_demo_'.gmdate('Ymd_His').'.sql';
writeDump($pdo, $backup, 'Backup before inserting demo data.');
echo 'Backup: '.realpath($backup).PHP_EOL;



$seed = file_get_contents(__DIR__.'/../docker/seed-demo.sql');
if ($seed === false) { throw new RuntimeException('The maintained demo seed is missing.'); }
// The curated seed names its columns and is compatible with the incremental schema.
$pdo->exec($seed);
writeDump($pdo, $output, 'Barattolo demo exported from the current schema. Passwords: demo1234.');
echo 'Created: '.$output.PHP_EOL;

function quoteName(string $name): string
{
    return '`'.str_replace('`', '``', $name).'`';
}

function insertRow(PDO $pdo, string $table, array $row): void
{
    $statement = $pdo->prepare('INSERT INTO '.quoteName($table).' ('.implode(', ', array_map('quoteName', array_keys($row))).') VALUES ('.implode(', ', array_fill(0, count($row), '?')).')');
    $statement->execute(array_values($row));
}

/** Export schema and data without DROP or CREATE DATABASE statements. */
function writeDump(PDO $pdo, string $path, string $description): void
{
    $sql = '-- '.$description."\n-- Import into an empty MySQL database. Dates are UTC.\nSET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS = 0;\n\n";
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
        $sql .= $pdo->query('SHOW CREATE TABLE '.quoteName($table))->fetch(PDO::FETCH_NUM)[1].";\n\n";
        $columns = $pdo->query('SHOW COLUMNS FROM '.quoteName($table))->fetchAll(PDO::FETCH_ASSOC);
        $names = array_column(array_filter($columns, static fn ($column) => !str_contains($column['Extra'], 'GENERATED')), 'Field');
        $rows = $pdo->query('SELECT '.implode(', ', array_map('quoteName', $names)).' FROM '.quoteName($table))->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $values = array_map(static fn ($value): string => $value === null ? 'NULL' : $pdo->quote((string) $value), array_values($row));
            $sql .= 'INSERT INTO '.quoteName($table).' ('.implode(', ', array_map('quoteName', array_keys($row))).') VALUES ('.implode(', ', $values).");\n";
        }
        $sql .= "\n";
    }
    $sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";
    if (file_put_contents($path, $sql, LOCK_EX) !== strlen($sql)) {
        throw new RuntimeException('Cannot write complete dump: '.$path);
    }
}
