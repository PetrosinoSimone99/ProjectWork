<?php
declare(strict_types=1);
require dirname(__DIR__, 2).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__, 2).'/.env');
$kernel = new App\Kernel('test', true); $kernel->boot();
$container = $kernel->getContainer()->get('test.service_container');
$em = $container->get(Doctrine\ORM\EntityManagerInterface::class);
$em->getConfiguration()->setAutoGenerateProxyClasses(false);
if (!preg_match('/^workflow_[a-z0-9_]+_test$/', $em->getConnection()->getDatabase() ?? '')) { throw new RuntimeException('Isolated MySQL workflow database required.'); }
try {
    if ($argv[1] === 'queue') {
        $container->get(App\Manager\ServiceQueueManager::class)->createServiceQueue($em->find(App\Entity\User::class, (int) $argv[2]), 'OFFER');
    } elseif ($argv[1] === 'match') {
        $container->get(App\Handler\QueueHandler::class)(new App\Message\QueueId($argv[2]));
    } else { throw new InvalidArgumentException('Unknown probe.'); }
    echo '200';
} catch (DomainException|Doctrine\DBAL\Exception\UniqueConstraintViolationException|Doctrine\DBAL\Exception\RetryableException) { echo '409'; }
