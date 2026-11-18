<?php
declare(strict_types=1);
// Applies only the incremental workflow migrations to the reference schema, one
// step at a time, in order. Each step checks its own column first, so a second
// start of the container is a no-op and a half-applied upgrade is named instead
// of silently retried.
require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');
$kernel = new App\Kernel($_SERVER['APP_ENV'] ?? 'dev', false); $kernel->boot();
$db = $kernel->getContainer()->get('doctrine')->getConnection();
$schema = $db->createSchemaManager();

/** Runs one migration class and stops the process if it fails. */
function applyMigration(string $version): void
{
    $process = new Symfony\Component\Process\Process([PHP_BINARY, dirname(__DIR__).'/bin/console', 'doctrine:migrations:execute', 'DoctrineMigrations\\'.$version, '--up', '--no-interaction']);
    $process->setTimeout(120); $process->run(fn ($type, $buffer) => print($buffer));
    if ($process->getExitCode() !== 0) { exit($process->getExitCode()); }
}

// 2026-11-18: proposal services, queue dates, service and queue slots.
$proposalColumns = $schema->listTableColumns('agreement_proposal');
if (!isset($proposalColumns['service_id'])) {
    applyMigration('Version20261118000100');
}
if (!$schema->tablesExist(['login_attempts'])) { throw new RuntimeException('Partial workflow migration: repair before restarting.'); }

// 2026-11-19: the sheet carries the free-text description and its send time.
$detailsColumns = $schema->listTableColumns('agreement_details');
if (!isset($detailsColumns['notes']) || !isset($detailsColumns['sent_at'])) {
    applyMigration('Version20261119000100');
}
if (!isset($schema->listTableColumns('agreement_details')['notes'])) { throw new RuntimeException('Partial sheet migration: repair before restarting.'); }
echo "Workflow schema installed.\n";
