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

final class RetainedApiTest extends WebTestCase
{
    private ?\Doctrine\DBAL\Connection $referenceDb = null;

    protected function tearDown(): void
    {
        if ($this->referenceDb !== null) {
            $this->referenceDb->executeStatement('PRAGMA foreign_keys = OFF');
            foreach ($this->referenceDb->createSchemaManager()->listTableNames() as $table) {
                $this->referenceDb->executeStatement('DROP TABLE '.$this->referenceDb->quoteSingleIdentifier($table));
            }
            $this->referenceDb->executeStatement('PRAGMA foreign_keys = ON');
        }
        parent::tearDown();
    }

    public function testRouteInventoryPreservesAllRemainingApis(): void
    {
        self::bootKernel();
        $actual = [];
        foreach (static::getContainer()->get('router')->getRouteCollection() as $route) {
            if (!str_starts_with($route->getPath(), '/api')) { continue; }
            foreach ($route->getMethods() as $method) { $actual[] = $method.' '.$route->getPath(); }
        }
        $expected = [
            'POST /api/auth/register', 'POST /api/auth/login',
            'GET /api/profile', 'PATCH /api/profile', 'GET /api/categories',
            'GET /api/services', 'POST /api/services',
            'GET /api/offers/mine', 'PATCH /api/offers/{id}', 'DELETE /api/offers/{id}',
            'GET /api/requests/mine', 'PATCH /api/requests/{id}', 'DELETE /api/requests/{id}',
            'POST /api/reports', 'GET /api/staff/users', 'GET /api/staff/users/{id}',
            'POST /api/staff/users/{id}/promote', 'PATCH /api/staff/users/{id}/status',
            'GET /api/staff/reports', 'GET /api/staff/reports/{id}',
            'POST /api/staff/reports/{id}/claim', 'PATCH /api/staff/reports/{id}/review',
            'GET /api/staff/operations', 'GET /api/staff/operations/{id}',
            'GET /api/chats/mutual-proposal/{proposalId}',
            'GET /api/chats/group-proposal/beneficiary/{groupProposalId}',
            'GET /api/chats/group-proposal/provider/{groupProposalId}',
            'POST /api/chats/send-message/{chatId}', 'GET /api/chats/most-recent-message',
            'GET /api/chats/check-new-messages/{recentMessageId}',
        ];
        sort($actual);
        sort($expected);
        self::assertSame($expected, $actual);
    }

    public static function serviceReferences(): iterable
    {
        foreach (['OFFER' => 'offers', 'REQUEST' => 'requests'] as $type => $resource) {
            foreach (['agreement', 'queue', 'reservation', 'closed-redemption', 'unused'] as $reference) {
                yield $type.' '.$reference => [$type, $resource, $reference];
            }
        }
    }

    #[DataProvider('serviceReferences')]
    public function testServiceMutationsRespectReferenceSchema(string $type, string $resource, string $reference): void
    {
        [$client, $em] = $this->referenceClient();
        $db = $em->getConnection();
        $owner = new User('Test', 'Owner', 'owner', 'owner@example.test');
        $owner->setPassword('unused');
        $owner->setRoles([User::ROLE_STAFF]);
        $category = new Category('Repairs');
        $service = new Service($owner, $type, 'Original');
        $service->addCategory($category);
        foreach ([$owner, $category, $service] as $entity) { $em->persist($entity); }
        $em->flush();
        if ($reference === 'agreement') {
            $db->insert('agreements', ['id' => 1]);
            $db->insert('agreement_details', ['agreement_id' => 1, 'provider_id' => $owner->getId(), 'beneficiary_id' => $owner->getId(), 'service_provided' => $service->getId()]);
        } elseif ($reference === 'queue') {
            $db->insert('service_queues', ['user_id' => $owner->getId(), 'type' => $type, 'service_id' => $service->getId()]);
        } elseif (in_array($reference, ['reservation', 'closed-redemption'], true)) {
            $db->insert('tokens', ['id' => 1, 'user_id' => $owner->getId(), 'expiration_date' => '2030-01-01 00:00:00']);
            $db->insert('token_redemptions', ['token_id' => 1, 'service_id' => $service->getId(), 'recipient_id' => $owner->getId(), 'provider_id' => $owner->getId(), 'status' => $reference === 'reservation' ? 'PENDING' : 'COMPLETED', 'reserved_service_id' => $reference === 'reservation' ? $service->getId() : null, 'created_at' => '2026-01-01 00:00:00']);
        }
        $jwt = static::getContainer()->get(JWTTokenManagerInterface::class)->create($owner);
        $client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$jwt);
        $blocked = in_array($reference, ['agreement', 'queue', 'reservation'], true);
        $path = '/api/'.$resource.'/'.$service->getId();
        $client->jsonRequest('PATCH', $path, ['description' => 'Updated', 'isRemote' => true, 'isSuspended' => true, 'location' => 'Rome']);
        self::assertResponseStatusCodeSame($blocked ? 409 : 200);
        self::assertSame($blocked ? 'Original' : 'Updated', $db->fetchOne('SELECT description FROM services WHERE id = ?', [$service->getId()]));
        $client->request('DELETE', $path);
        self::assertResponseStatusCodeSame($blocked ? 409 : 204);
        self::assertSame($blocked, $db->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$service->getId()]) === null);

        // Existing compensation events remain readable without their former APIs.
        $db->insert('staff_operation_logs', ['staff_id' => $owner->getId(), 'staff_username' => 'owner', 'action' => 'TOKEN_DELETED', 'target_type' => 'TOKEN', 'target_id' => 42, 'before_values' => '{"deletedAt":null}', 'after_values' => '{"deletedAt":"2026-01-01"}', 'created_at' => '2026-01-01 00:00:00']);
        $client->request('GET', '/api/staff/operations?targetType=TOKEN&targetId=42');
        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertSame('TOKEN_DELETED', $data['operations'][0]['action']);
    }

    public function testJwtProfilesCatalogAndStaffReportsWorkWithSelectedSchema(): void
    {
        [$client, $em] = $this->referenceClient();
        $client->jsonRequest('POST', '/api/auth/register', [
            'name' => 'Alice', 'surname' => 'Test', 'username' => 'alice',
            'email' => 'alice@example.test', 'password' => 'safe-password', 'location' => 'Rome',
            'offers' => [['description' => 'Repairs', 'categories' => ['Repairs']]],
            'requests' => [['description' => 'Lessons', 'categories' => ['Lessons']]],
        ]);
        self::assertResponseStatusCodeSame(201);
        $registered = json_decode($client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertNotEmpty($registered['token']);
        $client->jsonRequest('POST', '/api/auth/login', ['username' => 'alice', 'password' => 'safe-password']);
        self::assertResponseIsSuccessful();
        $login = json_decode($client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        $client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$login['token']);
        $client->jsonRequest('PATCH', '/api/profile', ['bio' => 'I repair bicycles.']);
        self::assertResponseIsSuccessful();
        foreach (['/api/profile', '/api/categories', '/api/services', '/api/offers/mine', '/api/requests/mine'] as $path) {
            $client->request('GET', $path);
            self::assertResponseIsSuccessful();
        }
        $staff = new User('Staff', 'Test', 'staff', 'staff@example.test');
        $staff->setPassword('unused');
        $staff->setRoles([User::ROLE_STAFF]);
        $em->persist($staff);
        $em->flush();
        $client->jsonRequest('POST', '/api/reports', ['reportedUserId' => $staff->getId(), 'reason' => 'Please check.']);
        self::assertResponseStatusCodeSame(201);
        $report = json_decode($client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR)['report'];
        $client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.static::getContainer()->get(JWTTokenManagerInterface::class)->create($staff));
        foreach (['/api/staff/users', '/api/staff/users/'.$registered['user']['id'], '/api/staff/reports', '/api/staff/reports/'.$report['id']] as $path) {
            $client->request('GET', $path);
            self::assertResponseIsSuccessful();
        }
        $client->request('POST', '/api/staff/reports/'.$report['id'].'/claim');
        self::assertResponseIsSuccessful();
        $client->jsonRequest('PATCH', '/api/staff/reports/'.$report['id'].'/review', ['status' => 'CONFIRMED', 'reviewNote' => 'Checked.']);
        self::assertResponseIsSuccessful();
        $client->jsonRequest('PATCH', '/api/staff/users/'.$registered['user']['id'].'/status', ['accountStatus' => 'INACTIVE']);
        self::assertResponseIsSuccessful();
        $client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$login['token']);
        $client->request('GET', '/api/profile');
        self::assertResponseStatusCodeSame(403);
    }

    private function referenceClient(): array
    {
        $client = static::createClient();
        $client->disableReboot();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $em->getConnection();
        self::assertInstanceOf(\Doctrine\DBAL\Platforms\SQLitePlatform::class, $db->getDatabasePlatform());
        $this->referenceDb = $db;
        $db->executeStatement('PRAGMA foreign_keys = OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) {
            $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
        }
        ReferenceDatabaseSchema::create($db);
        $db->executeStatement('PRAGMA foreign_keys = ON');
        return [$client, $em];
    }
}
