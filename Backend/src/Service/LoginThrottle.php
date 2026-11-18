<?php
declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;

/** Shared database counters, including across PHP workers. */
final class LoginThrottle
{
    public function __construct(private Connection $db) {}

    public function attempt(string $username, string $ip, callable $verify): array
    {
        return $this->db->transactional(function () use ($username, $ip, $verify): array {
            $now = time();
            $keys = [hash('sha256', 'ip:'.$ip) => 50, hash('sha256', 'account:'.mb_strtolower($username).':'.$ip) => 5];
            ksort($keys);
            $suffix = $this->db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform ? '' : ' FOR UPDATE';
            $retry = 0;
            foreach ($keys as $key => $limit) {
                $sql = $suffix === '' ? 'INSERT OR IGNORE INTO' : 'INSERT IGNORE INTO';
                $this->db->executeStatement($sql.' login_attempts (attempt_key, failures, expires_at) VALUES (?, 0, ?)', [$key, $now + 900]);
                $row = $this->db->fetchAssociative('SELECT * FROM login_attempts WHERE attempt_key = ?'.$suffix, [$key]);
                if ((int) $row['expires_at'] <= $now) {
                    $this->db->update('login_attempts', ['failures' => 0, 'expires_at' => $now + 900], ['attempt_key' => $key]);
                } elseif ((int) $row['failures'] >= $limit) {
                    $retry = max($retry, (int) $row['expires_at'] - $now);
                }
            }
            if ($retry > 0) { return ['allowed' => false, 'retry' => $retry, 'valid' => false]; }
            $valid = $verify();
            if (!$valid) {
                foreach ($keys as $key => $limit) {
                    $this->db->executeStatement('UPDATE login_attempts SET failures = failures + 1 WHERE attempt_key = ?', [$key]);
                }
            }
            return ['allowed' => true, 'retry' => 0, 'valid' => $valid];
        });
    }
}
