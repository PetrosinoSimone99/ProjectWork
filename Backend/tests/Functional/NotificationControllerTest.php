<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Notification;
use App\Entity\User;
use App\Service\Clock;
use App\Service\NotificationService;
use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Exercises the selected SQL schema, not a schema generated from the entities. */
final class NotificationControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private User $alice;
    private User $bob;
    private User $staff;
    private User $inactive;
    private NotificationService $notifications;
    private Clock $clock;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        self::assertInstanceOf(\Doctrine\DBAL\Platforms\SQLitePlatform::class, $db->getDatabasePlatform());
        $db->executeStatement('PRAGMA foreign_keys = OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) {
            $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
        }
        ReferenceDatabaseSchema::create($db);
        $db->executeStatement('PRAGMA foreign_keys = ON');
        $this->alice = $this->user('alice');
        $this->bob = $this->user('bob');
        $this->staff = $this->user('staff');
        $this->staff->setRoles([User::ROLE_STAFF]);
        $this->inactive = $this->user('inactive');
        $this->inactive->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        // A fixed clock makes ordering and first-read assertions deterministic.
        $clock = new class extends Clock {
            public string $time = '2026-11-14T12:00:00+00:00';
            public function now(): \DateTimeImmutable { return new \DateTimeImmutable($this->time); }
        };
        $this->clock = $clock;
        static::getContainer()->set(Clock::class, $clock);
        $this->notifications = new NotificationService($this->em, $clock);
        $this->authenticate($this->alice);
    }

    protected function tearDown(): void
    {
        if (isset($this->em)) {
            $db = $this->em->getConnection();
            $db->executeStatement('PRAGMA foreign_keys = OFF');
            foreach ($db->createSchemaManager()->listTableNames() as $table) {
                $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
            }
            $db->executeStatement('PRAGMA foreign_keys = ON');
        }
        parent::tearDown();
    }

    public function testServicePersistsPayloadAndParticipatesInCallerRollback(): void
    {
        $notification = $this->notifications->notify($this->alice, 'AGREEMENT_RECEIVED', 'A new proposal.', ['agreementId' => 42]);
        $id = $notification->getId();
        $this->em->clear();
        $saved = $this->em->find(Notification::class, $id)->toApiArray();
        self::assertSame([
            'id' => $id, 'type' => 'AGREEMENT_RECEIVED', 'message' => 'A new proposal.',
            'data' => ['agreementId' => 42], 'createdAt' => '2026-11-14T12:00:00+00:00', 'readAt' => null,
        ], $saved);
        $db = $this->em->getConnection();
        self::assertSame($this->alice->getId(), (int) $db->fetchOne('SELECT user_id FROM notifications WHERE id = ?', [$id]));
        $alice = $this->em->find(User::class, $this->alice->getId());
        $db->beginTransaction();
        try {
            $alice->setLocation('Changed inside transaction');
            $this->notifications->notify($alice, 'EXAMPLE', 'This must roll back.');
        } finally {
            $db->rollBack();
            $this->em->clear();
        }
        self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM notifications'));
        self::assertNull($this->em->find(User::class, $alice->getId())->getLocation());
    }

    public function testInvalidMessagesAndTypesAreRejectedWithoutSaving(): void
    {
        foreach ([['', 'Message'], ['TYPE', '  '], [str_repeat('a', 101), 'Message']] as [$type, $message]) {
            try {
                $this->notifications->notify($this->alice, $type, $message);
                self::fail('Invalid notification accepted.');
            } catch (\InvalidArgumentException) {
                self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM notifications'));
            }
        }
    }

    public function testAuthenticationAndOwnershipAlsoApplyToStaff(): void
    {
        $id = $this->notifications->notify($this->alice, 'EXAMPLE', 'Private notification.')->getId();
        foreach ([null, $this->inactive] as $viewer) {
            $this->authenticate($viewer);
            foreach ([['GET', '/api/notifications'], ['PATCH', '/api/notifications/'.$id.'/read'], ['DELETE', '/api/notifications/'.$id]] as [$method, $path]) {
                $this->client->request($method, $path);
                self::assertResponseStatusCodeSame($viewer === null ? 401 : 403);
            }
        }
        foreach ([$this->bob, $this->staff] as $viewer) {
            $this->authenticate($viewer);
            $this->client->request('GET', '/api/notifications');
            self::assertResponseIsSuccessful();
            self::assertSame([], $this->data()['notifications']);
            self::assertSame(0, $this->data()['unreadCount']);
            foreach ([$id, 999999] as $hiddenId) {
                $this->client->request('PATCH', '/api/notifications/'.$hiddenId.'/read');
                self::assertResponseStatusCodeSame(404);
                $this->client->request('DELETE', '/api/notifications/'.$hiddenId);
                self::assertResponseStatusCodeSame(404);
            }
        }
        self::assertNull($this->em->find(Notification::class, $id)->toApiArray()['readAt']);
        $staff = $this->em->find(User::class, $this->staff->getId());
        $own = $this->notifications->notify($staff, 'EXAMPLE', 'Staff inbox.');
        $this->client->request('PATCH', '/api/notifications/'.$own->getId().'/read');
        self::assertResponseIsSuccessful();
    }

    public function testPaginationUnreadFilterReadAndDelete(): void
    {
        $this->client->request('GET', '/api/notifications');
        self::assertSame(['notifications' => [], 'pagination' => ['page' => 1, 'limit' => 20, 'totalItems' => 0, 'totalPages' => 0], 'unreadCount' => 0], $this->data());
        $old = new Notification($this->alice, 'OLD', 'Older notification.', null, new \DateTimeImmutable('2026-11-13T10:00:00+00:00'));
        $this->em->persist($old);
        $first = $this->notifications->notify($this->alice, 'FIRST', 'First notification.');
        $second = $this->notifications->notify($this->alice, 'SECOND', 'Second notification.');
        $this->notifications->notify($this->bob, 'OTHER', 'Someone else.');
        $this->client->request('GET', '/api/notifications?limit=1');
        self::assertSame([$second->getId()], array_column($this->data()['notifications'], 'id'));
        self::assertSame(['page' => 1, 'limit' => 1, 'totalItems' => 3, 'totalPages' => 3], $this->data()['pagination']);
        self::assertSame(3, $this->data()['unreadCount']);
        $this->client->request('GET', '/api/notifications?limit=1&page=2');
        self::assertSame([$first->getId()], array_column($this->data()['notifications'], 'id'));
        $this->client->request('GET', '/api/notifications?page=99');
        self::assertSame([], $this->data()['notifications']);
        $this->client->request('PATCH', '/api/notifications/'.$second->getId().'/read');
        self::assertResponseIsSuccessful();
        self::assertSame('2026-11-14T12:00:00+00:00', $this->data()['notification']['readAt']);
        // Move the clock forward: repeated PATCH must keep the original date.
        $this->clock->time = '2026-11-15T12:00:00+00:00';
        $this->client->request('PATCH', '/api/notifications/'.$second->getId().'/read');
        self::assertSame('2026-11-14T12:00:00+00:00', $this->data()['notification']['readAt']);
        $this->client->request('GET', '/api/notifications?unreadOnly=true&limit=1');
        self::assertSame([$first->getId()], array_column($this->data()['notifications'], 'id'));
        self::assertSame(2, $this->data()['unreadCount']);
        self::assertSame(2, $this->data()['pagination']['totalItems']);
        $this->client->request('GET', '/api/notifications?unreadOnly=false');
        self::assertCount(3, $this->data()['notifications']);
        $this->client->request('DELETE', '/api/notifications/'.$first->getId());
        self::assertResponseStatusCodeSame(204);
        self::assertSame('', $this->client->getResponse()->getContent());
        $this->client->request('DELETE', '/api/notifications/'.$first->getId());
        self::assertResponseStatusCodeSame(404);
        $this->client->request('GET', '/api/notifications');
        self::assertSame(1, $this->data()['unreadCount']);
        self::assertCount(2, $this->data()['notifications']);
    }

    public function testInvalidFiltersReturnBadRequest(): void
    {
        foreach (['page=0', 'page=-1', 'page=999999999999999999999999', 'limit=51', 'limit=0', 'limit=abc', 'page[]=1', 'unreadOnly[]=true', 'unreadOnly=1', 'unreadOnly=yes', 'unknown=1'] as $query) {
            $this->client->request('GET', '/api/notifications?'.$query);
            self::assertResponseStatusCodeSame(400);
        }
    }

    public function testSelectedSchemaEnforcesJsonAndRecipientCascade(): void
    {
        $this->notifications->notify($this->bob, 'EXAMPLE', 'Will be removed with its recipient.');
        $db = $this->em->getConnection();
        try {
            $db->executeStatement("UPDATE notifications SET data = 'invalid json'");
            self::fail('Invalid JSON must be rejected by the database.');
        } catch (\Doctrine\DBAL\Exception) {
            self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM notifications'));
        }
        $db->executeStatement('DELETE FROM users WHERE id = ?', [$this->bob->getId()]);
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM notifications'));
    }

    private function user(string $username): User
    {
        $user = new User(ucfirst($username), 'Test', $username, $username.'@example.test');
        $user->setPassword('not-used-for-jwt-tests');
        $this->em->persist($user);
        return $user;
    }

    private function authenticate(?User $user): void
    {
        $token = $user === null ? '' : static::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', $user === null ? '' : 'Bearer '.$token);
    }

    private function data(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
