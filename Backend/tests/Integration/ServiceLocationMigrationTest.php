<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Schema\Schema;
use DoctrineMigrations\Version20261016000200;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

require_once dirname(__DIR__, 2).'/migrations/Version20261016000200.php';

final class ServiceLocationMigrationTest extends TestCase
{
    public function testMigrationPreservesExistingRowsAndCanBeReversed(): void
    {
        // A private in-memory database keeps this check away from application data.
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        try {
            $db->executeStatement('CREATE TABLE services (id INTEGER PRIMARY KEY, description VARCHAR(255) NOT NULL)');
            $db->insert('services', ['id' => 1, 'description' => 'Existing service']);
            $migration = new Version20261016000200($db, new NullLogger());
            $migration->up(new Schema());
            foreach ($migration->getSql() as $query) {
                $db->executeStatement($query->getStatement());
            }
            self::assertSame(['id' => 1, 'description' => 'Existing service', 'location' => null], $db->fetchAssociative('SELECT * FROM services'));
            $db->update('services', ['location' => 'Rome'], ['id' => 1]);
            self::assertSame('Rome', $db->fetchOne('SELECT location FROM services'));

            $rollback = new Version20261016000200($db, new NullLogger());
            $rollback->down(new Schema());
            foreach ($rollback->getSql() as $query) {
                $db->executeStatement($query->getStatement());
            }
            self::assertSame(['id' => 1, 'description' => 'Existing service'], $db->fetchAssociative('SELECT * FROM services'));
        } finally {
            $db->close();
        }
    }
}
