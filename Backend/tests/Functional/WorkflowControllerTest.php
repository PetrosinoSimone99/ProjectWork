<?php
declare(strict_types=1);
namespace App\Tests\Functional;

use App\Entity\{User, Service};
use App\Handler\QueueHandler;
use App\Message\QueueId;
use App\Schedule\AgreementEndDateChecker;
use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;

/** The same workflow assertions run against SQLite and an isolated MySQL schema. */
final class WorkflowControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient(); $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        $mysql = !$db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform;
        if ($mysql && !preg_match('/^workflow_[a-z0-9_]+_test$/', $db->getDatabase() ?? '')) { throw new \RuntimeException('Refusing to reset a non-workflow test database.'); }
        $db->executeStatement($mysql ? 'SET FOREIGN_KEY_CHECKS=0' : 'PRAGMA foreign_keys=OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) { $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table)); }
        $db->executeStatement($mysql ? 'SET FOREIGN_KEY_CHECKS=1' : 'PRAGMA foreign_keys=ON');
        if (!$mysql) { ReferenceDatabaseSchema::create($db); return; }
        $db->getNativeConnection()->exec(file_get_contents(dirname(__DIR__, 3).'/Context_and_DB_V2/barattolo_15112026.sql'));
        require_once dirname(__DIR__, 2).'/migrations/Version20261118000100.php';
        $migration = new \DoctrineMigrations\Version20261118000100($db, new \Psr\Log\NullLogger());
        $migration->up(new \Doctrine\DBAL\Schema\Schema());
        foreach ($migration->getSql() as $query) { $db->executeStatement($query->getStatement(), $query->getParameters(), $query->getTypes()); }
    }

    public function testReciprocalProposalChatAuthorizationAndStableDates(): void
    {
        $alice = $this->register('alice'); $bob = $this->register('bob'); $carol = $this->register('carol');
        $this->as($alice);
        $this->call('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bob['user']['id'], 'serviceId' => $bob['offers'][0]['id']], 201);
        $id = (int) $this->db()->fetchOne('SELECT id FROM agreements');
        $this->call('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bob['user']['id'], 'serviceId' => $bob['offers'][0]['id']], 409);
        $this->as($bob); $this->call('POST', '/api/send-agreement-response', ['agreementId' => $id, 'response' => true]);
        self::assertSame(2, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM agreement_details'));
        $this->call('POST', '/api/accept-agreement-details/'.$id, [], 409);
        $this->as($alice); $this->call('POST', '/api/send-agreement-details', ['agreementId' => $id, 'fromRemote' => false, 'startDate' => '2026-01-01', 'endDate' => '2026-01-02']);
        $before = $this->db()->fetchOne('SELECT start_date FROM agreement_details WHERE provider_id = ?', [$alice['user']['id']]);
        $this->as($bob); $this->call('POST', '/api/accept-agreement-details/'.$id);
        self::assertSame($before, $this->db()->fetchOne('SELECT start_date FROM agreement_details WHERE provider_id = ?', [$alice['user']['id']]));
        $this->call('POST', '/api/accept-agreement-details/'.$id, [], 409);
        $chat = $this->call('GET', '/api/chats/agreement/'.$id);
        $this->as($carol); $this->call('GET', '/api/chats/agreement/'.$id, [], 404);
        $this->call('POST', '/api/chats/send-message/'.$chat['chatId'], ['message' => 'Intrusion'], 404);
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM chat_messages'));
        $this->as($alice); $this->call('POST', '/api/chats/send-message/'.$chat['chatId'], ['message' => 'Hello']);
        $this->call('POST', '/api/send-agreement-details', ['agreementId' => $id, 'fromRemote' => true, 'startDate' => '2026-02-01', 'endDate' => '2026-02-02'], 409);
        static::getContainer()->get(AgreementEndDateChecker::class)();
        self::assertSame('ACCEPTED', $this->db()->fetchOne('SELECT status FROM agreements WHERE id = ?', [$id]), 'One missing confirmation prevents completion.');
        $this->call('POST', '/api/cancel-agreement/'.$id);
        $this->call('POST', '/api/chats/send-message/'.$chat['chatId'], ['message' => 'After cancellation'], 409);
        $this->call('GET', '/api/chats/agreement/'.$id);
    }

    public function testQueueMatchingCompletionEligibilityAndSingleCredits(): void
    {
        $alice = $this->register('alice'); $bob = $this->register('bob');
        $this->as($alice); $this->call('POST', '/api/create-service-queue', ['queueType' => 'REQUEST'], 409);
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$alice['user']['id']]));
        // Bob has already delivered a service through an earlier, completed offer queue.
        $this->db()->insert('agreements', ['status' => 'COMPLETED', 'creation_date' => '2026-01-01', 'from_queue' => 1]);
        $history = $this->db()->lastInsertId();
        $this->db()->insert('service_queues', ['user_id' => $bob['user']['id'], 'type' => 'OFFER', 'service_id' => $bob['offers'][0]['id'], 'status' => 'CLOSED', 'agreement_created' => $history]);
        $this->as($bob); $this->call('POST', '/api/create-service-queue', ['queueType' => 'REQUEST'], 201);
        $this->as($alice); $this->call('POST', '/api/create-service-queue', ['queueType' => 'OFFER'], 201);
        $source = (int) $this->db()->fetchOne("SELECT id FROM service_queues WHERE user_id = ? AND status = 'OPEN'", [$alice['user']['id']]);
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'OFFER'], 409);
        $handler = static::getContainer()->get(QueueHandler::class); $handler(new QueueId($source)); $handler(new QueueId($source));
        self::assertSame(2, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM agreements'));
        $id = (int) $this->db()->fetchOne("SELECT id FROM agreements WHERE status = 'ACCEPTED'");
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM agreement_details WHERE agreement_id = ?', [$id]));
        $this->call('POST', '/api/send-agreement-details', ['agreementId' => $id, 'fromRemote' => false, 'startDate' => '2026-01-01', 'endDate' => '2026-01-02']);
        $this->as($bob); $this->call('POST', '/api/accept-agreement-details/'.$id);
        $scheduler = static::getContainer()->get(AgreementEndDateChecker::class); $scheduler(); $scheduler();
        self::assertSame('COMPLETED', $this->db()->fetchOne('SELECT status FROM agreements WHERE id = ?', [$id]));
        self::assertSame(2, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$alice['user']['id']]));
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$bob['user']['id']]));
        $this->as($alice); $profile = $this->call('GET', '/api/profile'); self::assertTrue($profile['profile']['canRequestQueue']);
        $this->call('PATCH', '/api/offers/'.$alice['offers'][0]['id'], ['isSuspended' => true]);
        $this->call('PATCH', '/api/offers/'.$alice['offers'][0]['id'], ['description' => 'Updated after completion']);
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'OFFER'], 409);
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'REQUEST'], 201);
        $queue = (int) $this->db()->fetchOne("SELECT id FROM service_queues WHERE user_id = ? AND status = 'OPEN'", [$alice['user']['id']]);
        $this->call('POST', '/api/cancel-queue/'.$queue); $this->call('POST', '/api/cancel-queue/'.$queue);
        self::assertSame(2, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$alice['user']['id']]));
        $this->call('POST', '/api/cancel-queue/999999', [], 404);
    }

    public function testOptionalRegistrationSlotsAndLoginThrottle(): void
    {
        $user = $this->register('empty', false); $this->as($user);
        self::assertSame([], $this->call('GET', '/api/get-queues')['queues']);
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'OFFER'], 409);
        $account = $this->register('alice'); $this->as($account);
        $body = ['type' => 'OFFER', 'description' => 'Duplicate', 'categoryIds' => [$account['offers'][0]['categories'][0]['id']]];
        $this->call('POST', '/api/services', $body, 409);
        $offer = $account['offers'][0]['id']; $this->call('PATCH', '/api/offers/'.$offer, ['isSuspended' => true]);
        $this->call('POST', '/api/services', $body, 409);
        $this->call('DELETE', '/api/offers/'.$offer, [], 204); $this->call('POST', '/api/services', $body, 201);
        $this->call('POST', '/api/offers/'.$offer.'/restore', [], 409);
        for ($i = 0; $i < 5; ++$i) { $this->call('POST', '/api/auth/login', ['username' => 'empty', 'password' => 'wrong'], 401); }
        $this->call('POST', '/api/auth/login', ['username' => 'empty', 'password' => 'safe-password'], 429);
        self::assertGreaterThan(0, (int) $this->client->getResponse()->headers->get('Retry-After'));
    }

    public function testFailedNotificationRollsBackAcceptance(): void
    {
        $alice = $this->register('alice'); $bob = $this->register('bob'); $this->as($alice);
        $this->call('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bob['user']['id'], 'serviceId' => $bob['offers'][0]['id']], 201);
        $id = (int) $this->db()->fetchOne('SELECT id FROM agreements');
        $mysql = !$this->db()->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform;
        $this->db()->executeStatement($mysql ? "CREATE TRIGGER workflow_notification_failure BEFORE INSERT ON notifications FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Workflow test failure'" : "CREATE TRIGGER workflow_notification_failure BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'Workflow test failure'); END");
        $this->as($bob); $this->call('POST', '/api/send-agreement-response', ['agreementId' => $id, 'response' => true], 500);
        self::assertSame('PENDING', $this->db()->fetchOne('SELECT status FROM agreements WHERE id = ?', [$id]));
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM agreement_details'));
        self::assertStringNotContainsString('Workflow test failure', $this->client->getResponse()->getContent());
    }

    public function testStaffRolesAreFilteredBeforePagination(): void
    {
        $staff = $this->register('staff'); $this->register('member');
        $user = $this->em->find(User::class, $staff['user']['id']); $user->setRoles([User::ROLE_STAFF]); $this->em->flush();
        $staff['token'] = static::getContainer()->get(\Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface::class)->create($user);
        $this->as($staff);
        $data = $this->call('GET', '/api/staff/users?role=STAFF&limit=1');
        self::assertSame(1, $data['pagination']['totalItems']); self::assertSame('staff', $data['users'][0]['username']);
        $data = $this->call('GET', '/api/staff/users?role=USER&limit=1');
        self::assertSame(1, $data['pagination']['totalItems']); self::assertSame('member', $data['users'][0]['username']);
        $this->call('GET', '/api/staff/users?role=invalid', [], 400);
    }

    public function testConcurrentQueueCreationHasOneWinner(): void
    {
        if ($this->db()->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform) { self::markTestSkipped('Requires MySQL row locks.'); }
        $account = $this->register('alice');
        $this->em->getProxyFactory()->generateProxyClasses($this->em->getMetadataFactory()->getAllMetadata(), $this->em->getConfiguration()->getProxyDir());
        $processes = [];
        for ($i = 0; $i < 2; ++$i) {
            $process = new \Symfony\Component\Process\Process([PHP_BINARY, dirname(__DIR__).'/Support/workflow-worker.php', 'queue', (string) $account['user']['id']]);
            $process->setTimeout(60); $process->start(); $processes[] = $process;
        }
        $results = [];
        foreach ($processes as $process) { $process->wait(); self::assertSame(0, $process->getExitCode(), $process->getErrorOutput()); $results[] = trim($process->getOutput()); }
        sort($results); self::assertSame(['200', '409'], $results);
        self::assertSame(1, (int) $this->db()->fetchOne("SELECT COUNT(*) FROM service_queues WHERE status = 'OPEN'"));
        $source = (int) $this->db()->fetchOne('SELECT id FROM service_queues');
        $bob = $this->register('bob');
        $this->db()->insert('agreements', ['status' => 'COMPLETED', 'creation_date' => '2026-01-01', 'from_queue' => 1]);
        $history = $this->db()->lastInsertId();
        $this->db()->insert('service_queues', ['user_id' => $bob['user']['id'], 'type' => 'OFFER', 'service_id' => $bob['offers'][0]['id'], 'status' => 'CLOSED', 'agreement_created' => $history]);
        $this->as($bob); $this->call('POST', '/api/create-service-queue', ['queueType' => 'REQUEST'], 201);
        $processes = [];
        for ($i = 0; $i < 2; ++$i) {
            $process = new \Symfony\Component\Process\Process([PHP_BINARY, dirname(__DIR__).'/Support/workflow-worker.php', 'match', (string) $source]);
            $process->setTimeout(60); $process->start(); $processes[] = $process;
        }
        foreach ($processes as $process) { $process->wait(); self::assertSame(0, $process->getExitCode(), $process->getErrorOutput()); self::assertContains(trim($process->getOutput()), ['200', '409']); }
        self::assertSame(1, (int) $this->db()->fetchOne("SELECT COUNT(*) FROM agreements WHERE status = 'ACCEPTED'"));
        self::assertSame(2, (int) $this->db()->fetchOne("SELECT COUNT(*) FROM service_queues WHERE status = 'IN_PROGRESS'"));
    }

    public function testMigrationReportsDuplicatesBeforeChangingSchema(): void
    {
        $account = $this->register('alice');
        $mysql = !$this->db()->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform;
        $this->db()->executeStatement($mysql ? 'DROP INDEX service_active_slot_unique ON services' : 'DROP INDEX service_active_slot_unique');
        $this->db()->insert('services', ['user_id' => $account['user']['id'], 'type' => 'OFFER', 'description' => 'Legacy duplicate', 'creation_date' => '2026-01-01']);
        $before = array_keys($this->db()->createSchemaManager()->listTableColumns('services'));
        require_once dirname(__DIR__, 2).'/migrations/Version20261118000100.php';
        $migration = new \DoctrineMigrations\Version20261118000100($this->db(), new \Psr\Log\NullLogger());
        try { $migration->up(new \Doctrine\DBAL\Schema\Schema()); self::fail('Duplicate services must stop migration.'); }
        catch (\Doctrine\Migrations\Exception\AbortMigration $error) { self::assertStringContainsString('Resolve duplicate', $error->getMessage()); }
        self::assertSame($before, array_keys($this->db()->createSchemaManager()->listTableColumns('services')));
        self::assertSame(3, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM services'));
    }

    private function db(): \Doctrine\DBAL\Connection { return $this->em->getConnection(); }
    private function as(array $account): void { $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$account['token']); }
    private function register(string $name, bool $services = true): array
    {
        return $this->call('POST', '/api/auth/register', ['name' => $name, 'surname' => 'Test', 'username' => $name, 'email' => $name.'@example.test', 'password' => 'safe-password', 'location' => 'Roma',
            'offers' => $services ? [['description' => 'Offer '.$name, 'categories' => ['Workflow category']]] : [],
            'requests' => $services ? [['description' => 'Request '.$name, 'categories' => ['Workflow category']]] : []], 201);
    }
    private function call(string $method, string $path, array $body = [], int $status = 200): array
    {
        if ($method === 'GET' || $method === 'DELETE' || $body === []) { $this->client->request($method, $path); }
        else { $this->client->jsonRequest($method, $path, $body); }
        self::assertResponseStatusCodeSame($status);
        return $status === 204 ? [] : json_decode($this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
