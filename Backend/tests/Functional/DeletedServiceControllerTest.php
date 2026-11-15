<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Category;
use App\Entity\Service;
use App\Entity\User;
use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;

/** Uses only the empty schema from the selected dump and a separate SQLite database. */
final class DeletedServiceControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private User $owner;
    private User $other;
    private User $staff;
    private Category $category;

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        self::assertInstanceOf(\Doctrine\DBAL\Platforms\SQLitePlatform::class, $db->getDatabasePlatform());
        $this->dropTables();
        ReferenceDatabaseSchema::create($db);
        $db->executeStatement('PRAGMA foreign_keys = ON');
        $this->owner = $this->user('owner');
        $this->other = $this->user('other');
        $this->staff = $this->user('staff');
        $this->staff->setRoles([User::ROLE_STAFF]);
        $this->category = new Category('Repairs');
        $this->em->persist($this->category);
        $this->em->flush();
    }

    protected function tearDown(): void
    {
        if (isset($this->em)) { $this->dropTables(); }
        parent::tearDown();
    }

    private function dropTables(): void
    {
        $db = $this->em->getConnection();
        $db->executeStatement('PRAGMA foreign_keys = OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) {
            $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
        }
    }

    public static function types(): iterable
    {
        yield 'offers' => [Service::TYPE_OFFER, 'offers', 'offer'];
        yield 'requests' => [Service::TYPE_REQUEST, 'requests', 'request'];
    }

    #[DataProvider('types')]
    public function testDeleteListRestoreCycle(string $type, string $resource, string $key): void
    {
        $service = $this->service($this->owner, $type, false);
        $id = $service->getId();
        $this->as($this->owner);
        $this->client->request('DELETE', '/api/'.$resource.'/'.$id);
        self::assertResponseStatusCodeSame(204);
        $this->client->request('GET', '/api/'.$resource.'/mine');
        self::assertSame([], $this->data()[$resource]);
        $this->client->request('GET', '/api/'.$resource.'/deleted');
        self::assertResponseIsSuccessful();
        self::assertSame([$id], array_column($this->data()[$resource], 'id'));
        self::assertStringEndsWith('+00:00', $this->data()[$resource][0]['deletedAt']);
        $this->client->request('POST', '/api/'.$resource.'/'.$id.'/restore', content: '{}');
        self::assertResponseIsSuccessful();
        self::assertSame($id, $this->data()[$key]['id']);
        self::assertSame([$this->category->getId()], array_column($this->data()[$key]['categories'], 'id'));
        self::assertSame('Rome', $this->data()[$key]['location']);
        self::assertTrue($this->data()[$key]['isRemote']);
        self::assertNull($this->em->getConnection()->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$id]));
        $this->client->request('POST', '/api/'.$resource.'/'.$id.'/restore');
        self::assertResponseIsSuccessful();
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM notifications'));
        $this->client->request('GET', '/api/'.$resource.'/deleted');
        self::assertSame([], $this->data()[$resource]);
        $this->client->request('GET', '/api/'.$resource.'/mine');
        self::assertSame([$id], array_column($this->data()[$resource], 'id'));
        $this->as($this->other);
        $this->client->request('GET', '/api/services');
        self::assertSame($type === Service::TYPE_OFFER ? [$id] : [], array_column($this->data()['offers'], 'id'));
    }

    #[DataProvider('types')]
    public function testUserCannotRestoreOtherOwnersOrWrongTypes(string $type, string $resource, string $key): void
    {
        $own = $this->service($this->owner, $type);
        $foreign = $this->service($this->other, $type);
        $wrong = $this->service($this->owner, $type === Service::TYPE_OFFER ? Service::TYPE_REQUEST : Service::TYPE_OFFER);
        $this->as($this->owner);
        $this->client->request('GET', '/api/'.$resource.'/deleted');
        self::assertSame([$own->getId()], array_column($this->data()[$resource], 'id'));
        foreach ([$foreign->getId(), $wrong->getId(), 99999] as $id) {
            $this->client->request('POST', '/api/'.$resource.'/'.$id.'/restore');
            self::assertResponseStatusCodeSame(404);
        }
        $this->em->clear();
        self::assertTrue($this->em->find(Service::class, $foreign->getId())->isDeleted());
        self::assertTrue($this->em->find(Service::class, $wrong->getId())->isDeleted());
    }

    public function testDeletedListsArePaginatedFilteredAndOrdered(): void
    {
        $first = $this->service($this->owner, Service::TYPE_OFFER);
        $second = $this->service($this->owner, Service::TYPE_OFFER);
        $request = $this->service($this->other, Service::TYPE_REQUEST);
        $this->service($this->owner, Service::TYPE_OFFER, false);
        $db = $this->em->getConnection();
        $db->executeStatement("UPDATE services SET deleted_at = '2026-01-01 00:00:00' WHERE deleted_at IS NOT NULL");
        $this->as($this->staff);
        $this->client->request('GET', '/api/staff/services/deleted?limit=1');
        self::assertResponseIsSuccessful();
        self::assertSame([$request->getId()], array_column($this->data()['services'], 'id'));
        self::assertSame(['page' => 1, 'limit' => 1, 'totalItems' => 3, 'totalPages' => 3], $this->data()['pagination']);
        self::assertSame($this->other->getId(), $this->data()['services'][0]['owner']['id']);
        self::assertArrayNotHasKey('email', $this->data()['services'][0]['owner']);
        $this->client->request('GET', '/api/staff/services/deleted?userId='.$this->owner->getId().'&type=OFFER');
        self::assertSame([$second->getId(), $first->getId()], array_column($this->data()['services'], 'id'));
        $db->update('services', ['deleted_at' => '2026-02-01 00:00:00'], ['id' => $first->getId()]);
        $this->em->clear();
        $this->as($this->owner);
        $this->client->request('GET', '/api/offers/deleted?limit=1&page=2');
        self::assertSame([$second->getId()], array_column($this->data()['offers'], 'id'));
        $this->client->request('GET', '/api/offers/deleted?page=100');
        self::assertSame([], $this->data()['offers']);
    }

    public function testStaffRestorePreservesSuspensionAndWritesHistoryOnce(): void
    {
        $service = $this->service($this->owner, Service::TYPE_OFFER);
        $service->setIsSuspended(true);
        $this->owner->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        $this->as($this->staff);
        $path = '/api/staff/services/'.$service->getId().'/restore';
        $this->client->request('POST', $path);
        self::assertResponseIsSuccessful();
        self::assertTrue($this->data()['service']['isSuspended']);
        self::assertSame($this->owner->getId(), $this->data()['service']['owner']['id']);
        $this->client->request('POST', $path);
        self::assertResponseIsSuccessful();
        $this->client->request('GET', '/api/staff/operations?action=SERVICE_RESTORED&targetType=SERVICE&targetId='.$service->getId());
        self::assertResponseIsSuccessful();
        self::assertSame(1, $this->data()['pagination']['totalItems']);
        $entry = $this->data()['operations'][0];
        self::assertSame($this->staff->getId(), $entry['actor']['id']);
        self::assertNotNull($entry['before']['deletedAt']);
        self::assertSame(['deletedAt' => null], $entry['after']);
        $notifications = $this->em->getConnection()->fetchAllAssociative('SELECT * FROM notifications');
        self::assertCount(1, $notifications);
        self::assertSame($this->owner->getId(), (int) $notifications[0]['user_id']);
        self::assertSame('SERVICE_RESTORED', $notifications[0]['type']);
        self::assertSame('Your service has been restored by staff.', $notifications[0]['message']);
        self::assertSame(['serviceId' => $service->getId()], json_decode($notifications[0]['data'], true, flags: JSON_THROW_ON_ERROR));
        self::assertNull($notifications[0]['read_at']);
        $this->as($this->other);
        $this->client->request('GET', '/api/services');
        self::assertSame([], $this->data()['offers']);
        // Test each catalog restriction separately.
        $this->em->find(Service::class, $service->getId())->setIsSuspended(false);
        $this->em->flush();
        $this->client->request('GET', '/api/services');
        self::assertSame([], $this->data()['offers']);
        $this->em->find(Service::class, $service->getId())->setIsSuspended(true);
        $this->em->find(User::class, $this->owner->getId())->setAccountStatus(User::STATUS_ACTIVE);
        $this->em->flush();
        $this->client->request('GET', '/api/services');
        self::assertSame([], $this->data()['offers']);
    }

    public function testHistoryFailureRollsBackRestore(): void
    {
        $service = $this->service($this->owner, Service::TYPE_REQUEST);
        $this->as($this->staff);
        $db = $this->em->getConnection();
        $before = $db->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$service->getId()]);
        $db->executeStatement("CREATE TRIGGER reject_restore_log BEFORE INSERT ON staff_operation_logs BEGIN SELECT RAISE(ABORT, 'Test history failure'); END");
        $this->client->request('POST', '/api/staff/services/'.$service->getId().'/restore');
        self::assertResponseStatusCodeSame(500);
        self::assertSame($before, $db->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$service->getId()]));
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
    }

    public function testStaffRestoringOwnServiceDoesNotNotifyThemselves(): void
    {
        $service = $this->service($this->staff, Service::TYPE_OFFER);
        $this->as($this->staff);
        $this->client->request('POST', '/api/staff/services/'.$service->getId().'/restore');
        self::assertResponseIsSuccessful();
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM notifications'));
        self::assertSame(1, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
    }

    public function testNotificationFailureRollsBackStaffRestoreAndHistory(): void
    {
        $service = $this->service($this->owner, Service::TYPE_REQUEST);
        $this->as($this->staff);
        $db = $this->em->getConnection();
        $before = $db->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$service->getId()]);
        $db->executeStatement("CREATE TRIGGER reject_notification BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'Test notification failure'); END");
        $this->client->request('POST', '/api/staff/services/'.$service->getId().'/restore');
        self::assertResponseStatusCodeSame(500);
        self::assertSame($before, $db->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$service->getId()]));
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM notifications'));
    }

    public function testRestoreKeepsExistingReferences(): void
    {
        $service = $this->service($this->owner, Service::TYPE_OFFER);
        $db = $this->em->getConnection();
        $db->insert('service_queues', ['user_id' => $this->owner->getId(), 'type' => 'OFFER', 'service_id' => $service->getId()]);
        $this->as($this->owner);
        $this->client->request('POST', '/api/offers/'.$service->getId().'/restore');
        self::assertResponseIsSuccessful();
        self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM service_queues WHERE service_id = ?', [$service->getId()]));
    }

    public function testPermissionsAndInputValidation(): void
    {
        $offer = $this->service($this->owner, Service::TYPE_OFFER);
        $request = $this->service($this->owner, Service::TYPE_REQUEST);
        $routes = [
            ['GET', '/api/offers/deleted'], ['GET', '/api/requests/deleted'],
            ['POST', '/api/offers/'.$offer->getId().'/restore'],
            ['POST', '/api/requests/'.$request->getId().'/restore'],
            ['GET', '/api/staff/services/deleted'], ['POST', '/api/staff/services/'.$offer->getId().'/restore'],
        ];
        foreach ($routes as [$method, $path]) {
            $this->client->request($method, $path);
            self::assertResponseStatusCodeSame(401);
        }
        $this->as($this->owner);
        foreach (array_slice($routes, 4) as [$method, $path]) {
            $this->client->request($method, $path);
            self::assertResponseStatusCodeSame(403);
        }
        foreach ([$this->owner, $this->staff] as $user) {
            $this->em->find(User::class, $user->getId())->setAccountStatus(User::STATUS_INACTIVE);
            $this->em->flush();
            $this->as($user);
            foreach ($routes as [$method, $path]) {
                $this->client->request($method, $path);
                self::assertResponseStatusCodeSame(403);
            }
        }
        $this->em->find(User::class, $this->owner->getId())->setAccountStatus(User::STATUS_ACTIVE);
        $this->em->find(User::class, $this->staff->getId())->setAccountStatus(User::STATUS_ACTIVE);
        $this->em->flush();
        $this->as($this->staff);
        foreach (['page=0', 'limit=51', 'page[]=1', 'limit=abc', 'page=9999999999999999999999', 'unknown=1', 'userId=0', 'userId[]=1', 'type=OTHER', 'type[]=OFFER'] as $query) {
            $this->client->request('GET', '/api/staff/services/deleted?'.$query);
            self::assertResponseStatusCodeSame(400);
        }
        $this->client->request('POST', '/api/staff/services/99999/restore');
        self::assertResponseStatusCodeSame(404);
        $this->as($this->owner);
        foreach (['userId=1', 'type=OFFER', 'page=0', 'limit=51', 'page[]=1'] as $query) {
            foreach (['offers', 'requests'] as $resource) {
                $this->client->request('GET', '/api/'.$resource.'/deleted?'.$query);
                self::assertResponseStatusCodeSame(400);
            }
        }
        $this->as($this->staff);
        foreach (['[]', 'null', 'true', '"text"', '{"deletedAt":null}', '{', ' '] as $body) {
            foreach ([$routes[2], $routes[3], $routes[5]] as [$method, $path]) {
                $this->client->request($method, $path, content: $body);
                self::assertResponseStatusCodeSame(400);
            }
        }
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM notifications'));
    }

    private function user(string $username): User
    {
        $user = new User('Test', 'User', $username, $username.'@example.test');
        $user->setPassword('unused');
        $this->em->persist($user);
        return $user;
    }

    private function service(User $owner, string $type, bool $deleted = true): Service
    {
        $service = new Service($owner, $type, 'Original description');
        $service->setLocation('Rome');
        $service->setIsRemote(true);
        $service->addCategory($this->category);
        if ($deleted) { $service->markDeleted(); }
        $this->em->persist($service);
        $this->em->flush();
        return $service;
    }

    private function as(User $user): void
    {
        $token = static::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$token);
    }

    private function data(): array
    {
        return json_decode($this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
