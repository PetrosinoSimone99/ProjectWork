<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Tests\Support\TokenRedemptionTestSchema;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Tools\DsnParser;
use PHPUnit\Framework\TestCase;

final class TokenRedemptionMigrationTest extends TestCase
{
    public function testMigrationOnTheOctober16DumpPreservesExistingTokens(): void
    {
        $url = $_SERVER['TOKEN_TEST_DATABASE_URL'] ?? $_ENV['TOKEN_TEST_DATABASE_URL'] ?? getenv('TOKEN_TEST_DATABASE_URL');
        if (!$url) { self::markTestSkipped('Set TOKEN_TEST_DATABASE_URL to an isolated MySQL token_check_* database.'); }
        $params = (new DsnParser(['mysql' => 'pdo_mysql']))->parse($url);
        $name = $params['dbname'] ?? '';
        if (!str_starts_with($name, 'token_check_') || str_ends_with($name, '_test')) {
            throw new \RuntimeException('Use a token_check_* database name without the _test suffix.');
        }
        // Symfony adds this suffix in functional tests; DBAL alone does not.
        $params['dbname'] = $name.'_test';
        $db = DriverManager::getConnection($params);
        try {
            $db->executeStatement('SET FOREIGN_KEY_CHECKS = 0');
            foreach ($db->createSchemaManager()->listTableNames() as $table) { $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table)); }
            $db->executeStatement('SET FOREIGN_KEY_CHECKS = 1');
            $dump = file_get_contents(dirname(__DIR__, 3).'/Context_and_DB_V2/barattolo_v2_16102026_soft_delete.sql');
            $db->getNativeConnection()->exec($dump);
            $db->insert('users', [
                'name' => 'Existing', 'surname' => 'User', 'username' => 'existing',
                'email' => 'existing@example.test', 'password_hash' => 'unused',
                'roles' => '["ROLE_USER"]', 'account_status' => 'ACTIVE', 'creation_date' => '2026-10-16 12:00:00',
            ]);
            $userId = (int) $db->lastInsertId();
            foreach ([null, '2026-10-17 12:00:00'] as $deletedAt) {
                $db->insert('tokens', ['user_id' => $userId, 'expiration_date' => '2026-11-16 12:00:00', 'deleted_at' => $deletedAt]);
            }
            $before = $db->fetchAllAssociative('SELECT * FROM tokens ORDER BY id');
            TokenRedemptionTestSchema::apply($db);
            $after = $db->fetchAllAssociative('SELECT * FROM tokens ORDER BY id');
            foreach ($after as $index => $row) {
                self::assertSame('AVAILABLE', $row['status']);
                unset($row['status']);
                self::assertSame($before[$index], $row);
            }
            self::assertTrue($db->createSchemaManager()->tablesExist(['token_redemptions']));
            self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM token_redemptions'));
            self::assertArrayHasKey('token_reserved_service_unique', $db->createSchemaManager()->listTableIndexes('token_redemptions'));
            self::assertCount(5, $db->createSchemaManager()->listTableForeignKeys('token_redemptions'));
        } finally {
            $db->close();
        }
    }
}
