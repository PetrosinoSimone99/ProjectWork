<?php

declare(strict_types=1);

namespace App\Tests\Support;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Schema\Schema;
use DoctrineMigrations\Version20261018000100;
use Psr\Log\NullLogger;

/** Apply the actual migration, rather than maintaining a second copy of its SQL. */
final class TokenRedemptionTestSchema
{
    public static function apply(Connection $db): void
    {
        require_once dirname(__DIR__, 2).'/migrations/Version20261018000100.php';
        $migration = new Version20261018000100($db, new NullLogger());
        $migration->up(new Schema());
        foreach ($migration->getSql() as $query) {
            $db->executeStatement($query->getStatement());
        }
    }
}
