<?php
declare(strict_types=1);
// Applies only the incremental workflow migration to the reference schema.
require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');
$kernel = new App\Kernel($_SERVER['APP_ENV'] ?? 'dev', false); $kernel->boot();
$db = $kernel->getContainer()->get('doctrine')->getConnection();
$columns = $db->createSchemaManager()->listTableColumns('agreement_proposal');
if (isset($columns['service_id'])) {
    if (!$db->createSchemaManager()->tablesExist(['login_attempts'])) { throw new RuntimeException('Partial workflow migration: repair before restarting.'); }
    echo "Workflow schema already installed.\n"; exit(0);
}
$process = new Symfony\Component\Process\Process([PHP_BINARY, dirname(__DIR__).'/bin/console', 'doctrine:migrations:execute', 'DoctrineMigrations\\Version20261118000100', '--up', '--no-interaction']);
$process->setTimeout(120); $process->run(fn ($type, $buffer) => print($buffer)); exit($process->getExitCode());
