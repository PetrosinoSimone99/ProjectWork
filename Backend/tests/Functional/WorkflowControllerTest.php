<?php
declare(strict_types=1);
namespace App\Tests\Functional;

use App\Entity\{User, Service};
use App\Handler\QueueHandler;
use App\Message\QueueId;
use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
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

    public function testChatAuthorizationFollowsTheAgreementLifecycle(): void
    {
        $alice = $this->register('alice'); $bob = $this->register('bob'); $carol = $this->register('carol');
        $this->as($alice);
        $this->call('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bob['user']['id'], 'serviceId' => $bob['offers'][0]['id']], 201);
        $id = (int) $this->db()->fetchOne('SELECT id FROM agreements');
        $this->call('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bob['user']['id'], 'serviceId' => $bob['offers'][0]['id']], 409);
        $this->as($bob); $this->call('POST', '/api/send-agreement-response', ['agreementId' => $id, 'response' => true]);
        self::assertSame(2, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM agreement_details'));
        $chat = $this->call('GET', '/api/chats/agreement/'.$id);
        // Only the two participants can read or write this chat.
        $this->as($carol); $this->call('GET', '/api/chats/agreement/'.$id, [], 404);
        $this->call('POST', '/api/chats/send-message/'.$chat['chatId'], ['message' => 'Intrusion'], 404);
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM chat_messages'));
        $this->as($alice); $this->call('POST', '/api/chats/send-message/'.$chat['chatId'], ['message' => 'Hello']);
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM chat_messages'));
        // Cancelling the agreement closes the conversation, but the history stays readable.
        $this->call('POST', '/api/cancel-agreement/'.$id);
        $this->call('POST', '/api/chats/send-message/'.$chat['chatId'], ['message' => 'After cancellation'], 409);
        $this->call('GET', '/api/chats/agreement/'.$id);
    }

    public function testRequestQueueCostsOneCreditWithoutPriorDelivery(): void
    {
        $alice = $this->register('alice'); $bob = $this->register('bob');
        $this->as($alice);
        // Nothing has been delivered yet: the credit is the only cost of a request queue.
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'REQUEST'], 201);
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$alice['user']['id']]));
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'OFFER'], 409);
        $queue = (int) $this->db()->fetchOne("SELECT id FROM service_queues WHERE user_id = ? AND status = 'OPEN'", [$alice['user']['id']]);
        // A queue cancelled before a match gives the credit back.
        $this->call('POST', '/api/cancel-queue/'.$queue);
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$alice['user']['id']]));
        // Without a credit the request queue is refused and nothing is stored.
        $this->db()->executeStatement('UPDATE users SET credits = 0 WHERE id = ?', [$alice['user']['id']]);
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'REQUEST'], 400);
        self::assertSame(0, (int) $this->db()->fetchOne("SELECT COUNT(*) FROM service_queues WHERE user_id = ? AND status = 'OPEN'", [$alice['user']['id']]));
        // An offer queue costs nothing.
        $this->call('POST', '/api/create-service-queue', ['queueType' => 'OFFER'], 201);
        $source = (int) $this->db()->fetchOne("SELECT id FROM service_queues WHERE user_id = ? AND status = 'OPEN'", [$alice['user']['id']]);
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$alice['user']['id']]));
        $this->as($bob); $this->call('POST', '/api/create-service-queue', ['queueType' => 'REQUEST'], 201);
        $handler = static::getContainer()->get(QueueHandler::class); $handler(new QueueId($source)); $handler(new QueueId($source));
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM agreements'));
        $id = (int) $this->db()->fetchOne("SELECT id FROM agreements WHERE status = 'ACCEPTED'");
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM agreement_details WHERE agreement_id = ?', [$id]));
        self::assertSame(2, (int) $this->db()->fetchOne("SELECT COUNT(*) FROM service_queues WHERE status = 'IN_PROGRESS'"));
        // Confirming the sheet is the delivery: it completes the exchange and credits the provider again.
        $this->as($alice); $this->call('POST', '/api/send-agreement-details', ['agreementId' => $id, 'notes' => 'Ritiro sabato mattina.']);
        $this->as($bob); $this->call('POST', '/api/accept-agreement-details/'.$id);
        self::assertSame('COMPLETED', $this->db()->fetchOne('SELECT status FROM agreements WHERE id = ?', [$id]));
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$alice['user']['id']]));
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT credits FROM users WHERE id = ?', [$bob['user']['id']]));
        $this->as($alice); $profile = $this->call('GET', '/api/profile');
        self::assertArrayNotHasKey('canRequestQueue', $profile['profile']);
        self::assertSame(1, $profile['profile']['credits']);
    }

    public function testOwnerCannotSuspendOrDeleteTheTwoMandatoryServices(): void
    {
        $alice = $this->register('alice'); $bob = $this->register('bob');
        $offer = (int) $alice['offers'][0]['id']; $request = (int) $alice['requests'][0]['id'];
        $this->as($alice);
        foreach (['true', 'false'] as $suspended) {
            $this->call('PATCH', '/api/offers/'.$offer, ['isSuspended' => $suspended === 'true'], 409);
            $this->call('PATCH', '/api/requests/'.$request, ['isSuspended' => $suspended === 'true'], 409);
        }
        $this->call('DELETE', '/api/offers/'.$offer, [], 409);
        $this->call('DELETE', '/api/requests/'.$request, [], 409);
        self::assertSame(2, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM services WHERE user_id = ? AND deleted_at IS NULL AND is_suspended = 0', [$alice['user']['id']]));
        // Content stays editable, and a missing or foreign service is still a 404.
        self::assertSame('Updated offer', $this->call('PATCH', '/api/offers/'.$offer, ['description' => 'Updated offer'])['offer']['description']);
        self::assertSame('Updated request', $this->call('PATCH', '/api/requests/'.$request, ['description' => 'Updated request', 'isRemote' => true])['request']['description']);
        $this->call('DELETE', '/api/offers/'.(int) $bob['offers'][0]['id'], [], 404);
        $this->call('DELETE', '/api/requests/999999', [], 404);
        // Staff restore keeps working for a service deleted before this rule.
        $this->db()->update('services', ['deleted_at' => '2026-01-01 00:00:00'], ['id' => $offer]);
        $staff = $this->register('staff');
        $staffUser = $this->em->find(User::class, $staff['user']['id']); $staffUser->setRoles([User::ROLE_STAFF]); $this->em->flush();
        $staff['token'] = static::getContainer()->get(JWTTokenManagerInterface::class)->create($staffUser);
        $this->as($staff);
        $this->call('POST', '/api/staff/services/'.$offer.'/restore');
        self::assertNull($this->db()->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$offer]));
        $this->as($alice);
        self::assertSame([$offer], array_column($this->call('GET', '/api/offers/mine')['offers'], 'id'));
    }

    public function testSingleServiceSlotPerTypeAndLoginThrottle(): void
    {
        $account = $this->register('alice'); $this->as($account);
        self::assertSame([], $this->call('GET', '/api/get-queues')['queues']);
        $offer = (int) $account['offers'][0]['id'];
        // Registration fills the only slot of each type, and no owner action frees it.
        $body = ['type' => 'OFFER', 'description' => 'Duplicate', 'categoryIds' => [$account['offers'][0]['categories'][0]['id']]];
        $this->call('POST', '/api/services', $body, 409);
        $this->call('PATCH', '/api/offers/'.$offer, ['isSuspended' => true], 409);
        $this->call('POST', '/api/services', $body, 409);
        $this->call('DELETE', '/api/offers/'.$offer, [], 409);
        $this->call('POST', '/api/services', $body, 409);
        self::assertSame(0, (int) $this->db()->fetchOne("SELECT COUNT(*) FROM service_queues WHERE user_id = ?", [$account['user']['id']]));
        for ($i = 0; $i < 5; ++$i) { $this->call('POST', '/api/auth/login', ['username' => 'alice', 'password' => 'wrong'], 401); }
        $this->call('POST', '/api/auth/login', ['username' => 'alice', 'password' => 'safe-password'], 429);
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
        $staff['token'] = static::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
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
    private function register(string $name): array
    {
        return $this->call('POST', '/api/auth/register', ['name' => $name, 'surname' => 'Test', 'username' => $name, 'email' => $name.'@example.test', 'password' => 'safe-password', 'location' => 'Roma',
            'offers' => [['description' => 'Offer '.$name, 'categories' => ['Workflow category']]],
            'requests' => [['description' => 'Request '.$name, 'categories' => ['Workflow category']]]], 201);
    }
    private function call(string $method, string $path, array $body = [], int $status = 200): array
    {
        if ($method === 'GET' || $method === 'DELETE' || $body === []) { $this->client->request($method, $path); }
        else { $this->client->jsonRequest($method, $path, $body); }
        self::assertResponseStatusCodeSame($status);
        return $status === 204 ? [] : json_decode($this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
