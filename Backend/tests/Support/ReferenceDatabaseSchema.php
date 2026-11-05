<?php

declare(strict_types=1);

namespace App\Tests\Support;

use Doctrine\DBAL\Connection;

/** Builds an empty SQLite fixture from the selected dump, never importing its data. */
final class ReferenceDatabaseSchema
{
    public static function create(Connection $db): void
    {
        if (!$db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform) {
            throw new \LogicException('Reference fixtures require the isolated SQLite test database.');
        }
        $directory = dirname(__DIR__, 3).'/Context_and_DB_V2/';
        $filename = trim(file_get_contents($directory.'LAST_DB_TO_USE.txt'));
        if (basename($filename) !== $filename) {
            throw new \LogicException('The reference dump must be inside Context_and_DB_V2.');
        }
        $sql = file_get_contents($directory.$filename);
        preg_match_all('/CREATE TABLE `([^`]+)` \((.*?)\) ENGINE=[^;]+;/s', $sql, $tables, PREG_SET_ORDER);
        if ($tables === []) {
            throw new \LogicException('No reference table definitions found.');
        }
        foreach ($tables as $table) {
            $definitions = [];
            foreach (explode("\n", $table[2]) as $line) {
                $line = rtrim(trim($line), ',');
                if ($line === '' || str_starts_with($line, 'KEY ')) { continue; }
                $line = preg_replace('/UNIQUE KEY `[^`]+`/', 'UNIQUE', $line);
                $line = preg_replace('/CHARACTER SET \w+|COLLATE \w+|AUTO_INCREMENT|COMMENT \'[^\']*\'/i', '', $line);
                $line = preg_replace('/\bENUM\s*\([^)]*\)/i', 'VARCHAR(255)', $line);
                $line = preg_replace('/\bint\b/i', 'INTEGER', $line);
                $line = preg_replace('/\bbool\b|\btinyint\(1\)/i', 'BOOLEAN', $line);
                $line = preg_replace('/\bjson\b|\blongtext\b/i', 'CLOB', $line);
                $line = preg_replace('/DEFAULT \(now\(\)\)/i', 'DEFAULT CURRENT_TIMESTAMP', $line);
                $definitions[] = $line;
            }
            $db->executeStatement('CREATE TABLE `'.$table[1].'` ('.implode(', ', $definitions).')');
        }
    }
}
