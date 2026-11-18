<?php
declare(strict_types=1);

namespace App\Service;

use Doctrine\ORM\EntityManagerInterface;

/** Shared row locks; all workflow writes run inside a caller transaction. */
final class WorkflowTransaction
{
    public function __construct(private EntityManagerInterface $em) {}

    public function run(callable $work): mixed
    {
        $outermost = !$this->em->getConnection()->isTransactionActive();
        try {
            return $this->em->getConnection()->transactional(function () use ($work) {
                $result = $work();
                $this->em->flush();
                return $result;
            });
        } catch (\Throwable $error) {
            if ($outermost) { $this->em->clear(); }
            throw $error;
        }
    }

    public function lock(string $table, array $ids): void
    {
        if (!in_array($table, ['users', 'services', 'agreements', 'service_queues'], true)) {
            throw new \LogicException('Unsupported workflow lock.');
        }
        sort($ids, SORT_NUMERIC);
        $db = $this->em->getConnection();
        $suffix = $db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform ? '' : ' FOR UPDATE';
        foreach (array_unique($ids) as $id) {
            $db->fetchOne("SELECT id FROM $table WHERE id = ?$suffix", [(int) $id]);
        }
    }
}
