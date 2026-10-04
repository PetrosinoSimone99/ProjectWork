<?php

declare(strict_types=1);

// This script creates isolated databases. It never migrates the configured local database.
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Tools\DsnParser;
use Symfony\Component\Dotenv\Dotenv;
use Symfony\Component\Process\Process;

require dirname(__DIR__).'/vendor/autoload.php';
chdir(dirname(__DIR__));
(new Dotenv())->bootEnv('.env');
$url = $_SERVER['DATABASE_URL'] ?? $_ENV['DATABASE_URL'];
$parameters = (new DsnParser(['mysql' => 'pdo_mysql']))->parse($url);
$local = DriverManager::getConnection($parameters);
$adminParameters = $parameters;
unset($adminParameters['dbname']);
$admin = DriverManager::getConnection($adminParameters);
$suffix = date('Ymd_His');
$prefix = 'chain_check_'.$suffix;
$tools = $_SERVER['MYSQL_BIN_DIR'] ?? $_ENV['MYSQL_BIN_DIR'] ?? 'C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin';
$backupDirectory = 'var/chain-backups';
if (!is_dir($backupDirectory)) { mkdir($backupDirectory, 0700, true); }
$backup = realpath($backupDirectory).'/'.$parameters['dbname'].'_'.$suffix.'.sql';
$dumpArguments = [$tools.'/mysqldump.exe', '--host='.$parameters['host'], '--port='.($parameters['port'] ?? 3306), '--user='.$parameters['user'], '--single-transaction', '--no-tablespaces', '--result-file='.$backup];
if (!str_starts_with((string) ($parameters['serverVersion'] ?? ''), 'mariadb')) {
    $dumpArguments[] = '--set-gtid-purged=OFF';
} elseif (in_array($parameters['host'], ['127.0.0.1', 'localhost'], true)) {
    $dumpArguments[] = '--skip-ssl';
}
$dumpArguments[] = $parameters['dbname'];
$dump = new Process($dumpArguments, null, ['MYSQL_PWD' => $parameters['password'] ?? '']);
$dump->mustRun();
if (!is_file($backup) || filesize($backup) === 0) { throw new RuntimeException('The backup is empty.'); }
$cases = ['empty' => null, 'dump' => '../Context_and_DB_V2/barattolo_v2_27092026.sql', 'existing' => $backup];
$databases = [];
foreach ($cases as $case => $source) {
    $name = $prefix.'_'.$case;
    $admin->executeStatement('CREATE DATABASE '.$admin->quoteSingleIdentifier($name).' CHARACTER SET utf8mb4');
    $testParameters = $parameters;
    $testParameters['dbname'] = $name;
    $db = DriverManager::getConnection($testParameters);
    if ($source !== null) {
        // PDO accepts the trusted full dump, including session SQL mode and delimiter-free DDL.
        $db->getNativeConnection()->exec(file_get_contents($source));
    }
    $beforeUsers = $source === null ? 0 : (int) $db->fetchOne('SELECT COUNT(*) FROM users');
    $beforeDates = $source === null ? [] : $db->fetchAllAssociative('SELECT id, creation_date FROM services ORDER BY id');
    $beforeChat = [];
    foreach (['chat', 'chat_participants', 'chat_messages'] as $table) {
        if ($db->createSchemaManager()->tablesExist([$table])) {
            $beforeChat[$table] = [$db->fetchAllAssociative('SHOW CREATE TABLE '.$table), $db->fetchAllAssociative('SELECT * FROM '.$table)];
        }
    }
    $testUrl = preg_replace('~(/)[^/?]+(?=\?|$)~', '${1}'.$name, $url);
    // Clear Dotenv's inherited list, otherwise .env.local can overwrite our explicit test URL.
    $environment = ['APP_ENV' => 'dev', 'DATABASE_URL' => $testUrl, 'SYMFONY_DOTENV_VARS' => false];
    $identity = new Process([PHP_BINARY, 'bin/console', 'dbal:run-sql', 'SELECT DATABASE() AS database_name', '--no-interaction'], null, $environment);
    $identity->mustRun();
    if (!str_contains($identity->getOutput(), $name)) { throw new RuntimeException('The migration connection is not isolated.'); }
    $migration = new Process([PHP_BINARY, 'bin/console', 'doctrine:migrations:migrate', '--no-interaction'], null, $environment);
    $migration->mustRun();
    if ($source !== null && (int) $db->fetchOne('SELECT COUNT(*) FROM users') !== $beforeUsers) { throw new RuntimeException('Users changed during migration.'); }
    if ($source !== null && $beforeDates !== $db->fetchAllAssociative('SELECT id, creation_date FROM services ORDER BY id')) { throw new RuntimeException('Service creation dates changed during migration.'); }
    foreach ($beforeChat as $table => $before) {
        $after = [$db->fetchAllAssociative('SHOW CREATE TABLE '.$table), $db->fetchAllAssociative('SELECT * FROM '.$table)];
        if ($before !== $after) { throw new RuntimeException('Chat changed during migration.'); }
    }
    if ($case === 'dump') {
        if ($db->fetchOne('SELECT type FROM services WHERE id = 1') !== 'OFFER' || $db->fetchOne('SELECT offer_pair_key FROM proposals WHERE id = 1') !== '1:2') {
            throw new RuntimeException('Imported direct proposals were not reconciled.');
        }
    }
    $migration->mustRun(); // A second migration invocation must be harmless.
    $databases[$case] = $name;
    echo 'Verified '.$case.' migration and unchanged chat.', PHP_EOL;
}
$apiName = $prefix.'_api';
$admin->executeStatement('CREATE DATABASE '.$admin->quoteSingleIdentifier($apiName.'_test').' CHARACTER SET utf8mb4');
$apiUrl = preg_replace('~(/)[^/?]+(?=\?|$)~', '${1}'.$apiName, $url);
file_put_contents('var/chain-check.json', json_encode(['backup' => $backup, 'databases' => $databases, 'apiDatabase' => $apiName.'_test', 'apiUrl' => $apiUrl], JSON_PRETTY_PRINT));
echo 'Backup and verification details saved in var/chain-check.json.', PHP_EOL;
