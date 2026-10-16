<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Category;
use App\Entity\Proposal;
use App\Entity\Service;
use App\Entity\SwipeDecision;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** These tests use the separate SQLite database configured in .env.test. */
final class RequestControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $schema = new SchemaTool($this->em);
        $metadata = $this->em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);
    }

    public function testListContainsOnlyOwnRequestsWithAllCategoriesInNewestOrder(): void
    {
        $alice = $this->user('alice');
        $bob = $this->user('bob');
        $first = $this->service($alice, Service::TYPE_REQUEST);
        $second = $this->service($alice, Service::TYPE_REQUEST);
        $category = new Category('Repairs');
        $this->em->persist($category);
        $second->addCategory($category);
        $this->service($alice, Service::TYPE_OFFER);
        $this->service($bob, Service::TYPE_REQUEST);
        $this->em->flush();
        $this->as($alice);

        $this->client->request('GET', '/api/requests/mine');
        self::assertResponseIsSuccessful();
        self::assertSame([$second->getId(), $first->getId()], array_column($this->data()['requests'], 'id'));
        self::assertCount(2, $this->data()['requests'][0]['categories']);
        self::assertArrayHasKey('createdAt', $this->data()['requests'][0]);
        self::assertSame('REQUEST', $this->data()['requests'][0]['type']);
    }

    public function testPartialUpdatesReplaceCategoriesAndPreserveOtherFields(): void
    {
        $alice = $this->user('alice');
        $service = $this->service($alice, Service::TYPE_REQUEST);
        $category = new Category('New category');
        $this->em->persist($category);
        $this->em->flush();
        $this->as($alice);

        $this->client->jsonRequest('PATCH', '/api/requests/'.$service->getId(), ['description' => '  I need bicycle repairs.  ']);
        self::assertResponseIsSuccessful();
        self::assertSame('I need bicycle repairs.', $this->data()['request']['description']);
        self::assertCount(1, $this->data()['request']['categories']);
        $createdAt = $this->data()['request']['createdAt'];

        $this->client->jsonRequest('PATCH', '/api/requests/'.$service->getId(), ['categoryIds' => [$category->getId()]]);
        self::assertResponseIsSuccessful();
        self::assertSame('I need bicycle repairs.', $this->data()['request']['description']);
        self::assertSame([$category->getId()], array_column($this->data()['request']['categories'], 'id'));
        self::assertSame($createdAt, $this->data()['request']['createdAt']);
        $this->em->clear();
        self::assertSame([$category->getId()], array_map(static fn (Category $item) => $item->getId(), $this->em->find(Service::class, $service->getId())->getCategories()->toArray()));
    }

    public function testInvalidPayloadsNeverPartiallyUpdateARequest(): void
    {
        $alice = $this->user('alice');
        $service = $this->service($alice, Service::TYPE_REQUEST);
        $this->as($alice);
        $path = '/api/requests/'.$service->getId();
        $categoryId = $service->getCategories()->first()->getId();

        foreach ([[], ['type' => 'OFFER'], ['description' => null], ['description' => '  '], ['description' => str_repeat('x', 256)], ['categoryIds' => []], ['categoryIds' => [0]], ['categoryIds' => [true]], ['categoryIds' => [$categoryId, $categoryId]], ['categoryIds' => ['key' => $categoryId]]] as $data) {
            $this->client->jsonRequest('PATCH', $path, $data);
            self::assertResponseStatusCodeSame(400);
        }
        $this->client->request('PATCH', $path, server: ['CONTENT_TYPE' => 'application/json'], content: '{invalid');
        self::assertResponseStatusCodeSame(400);
        $this->client->jsonRequest('PATCH', $path, ['description' => 'Must not save.', 'categoryIds' => [999999]]);
        self::assertResponseStatusCodeSame(404);
        $this->em->clear();
        self::assertSame('Original description.', $this->em->find(Service::class, $service->getId())->getDescription());
    }

    public function testOwnershipTypeAndAuthenticationAreRequired(): void
    {
        $alice = $this->user('alice');
        $bob = $this->user('bob');
        $request = $this->service($alice, Service::TYPE_REQUEST);
        $offer = $this->service($bob, Service::TYPE_OFFER);
        foreach (['GET', 'PATCH', 'DELETE'] as $method) {
            $this->client->request($method, $method === 'GET' ? '/api/requests/mine' : '/api/requests/'.$request->getId());
            self::assertResponseStatusCodeSame(401);
        }
        $this->as($bob);
        $this->client->request('GET', '/api/requests/mine');
        self::assertSame([], $this->data()['requests']);
        foreach ([$request->getId(), $offer->getId(), 999999] as $id) {
            $this->client->jsonRequest('PATCH', '/api/requests/'.$id, ['description' => 'Unauthorized change']);
            self::assertResponseStatusCodeSame(404);
            $this->client->jsonRequest('PATCH', '/api/requests/'.$id, ['isRemote' => true]);
            self::assertResponseStatusCodeSame(404);
            $this->client->request('DELETE', '/api/requests/'.$id);
            self::assertResponseStatusCodeSame(404);
        }
        $this->em->find(User::class, $bob->getId())->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        foreach (['GET', 'PATCH', 'DELETE'] as $method) {
            $this->client->request($method, $method === 'GET' ? '/api/requests/mine' : '/api/requests/'.$request->getId());
            self::assertResponseStatusCodeSame(403);
        }
    }

    public function testProposalReferencesBlockRequestsEvenAfterRejection(): void
    {
        [$alice, $request, $decision] = $this->swipe(SwipeDecision::DIRECTION_RIGHT);
        $proposal = new Proposal('test-pair');
        $proposal->setStatus(Proposal::STATUS_REJECTED);
        $this->em->persist($proposal);
        $decision->setProposal($proposal);
        $this->em->flush();
        $this->as($alice);

        $this->client->jsonRequest('PATCH', '/api/requests/'.$request->getId(), ['description' => 'Changed']);
        self::assertResponseStatusCodeSame(409);
        $this->client->jsonRequest('PATCH', '/api/requests/'.$request->getId(), ['isRemote' => true]);
        self::assertResponseStatusCodeSame(409);
        self::assertFalse($request->isRemote());
        $this->client->jsonRequest('PATCH', '/api/requests/'.$request->getId(), ['location' => 'Rome']);
        self::assertResponseStatusCodeSame(409);
        self::assertNull($request->getLocation());
        $this->client->jsonRequest('PATCH', '/api/requests/'.$request->getId(), ['isSuspended' => true]);
        self::assertResponseStatusCodeSame(409);
        self::assertFalse($request->isSuspended());
        $this->client->request('DELETE', '/api/requests/'.$request->getId());
        self::assertResponseStatusCodeSame(409);
        self::assertSame('Original description.', $request->getDescription());
        self::assertNull($this->em->getConnection()->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$request->getId()]));
        self::assertNotNull($this->em->find(Proposal::class, $proposal->getId()));
    }

    public function testSwipeWithoutProposalAllowsUpdatingAndDeletingRequest(): void
    {
        [$alice, $request] = $this->swipe(SwipeDecision::DIRECTION_LEFT);
        $this->as($alice);
        $id = $request->getId();
        $this->client->jsonRequest('PATCH', '/api/requests/'.$id, ['description' => 'New description']);
        self::assertResponseIsSuccessful();
        $this->client->request('DELETE', '/api/requests/'.$id);
        self::assertResponseStatusCodeSame(204);
        self::assertSame('', $this->client->getResponse()->getContent());
        $this->em->clear();
        $saved = $this->em->find(Service::class, $id);
        self::assertTrue($saved->isDeleted());
        self::assertCount(1, $saved->getCategories());
        self::assertSame(1, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM swipe_decisions WHERE actor_request_id = ?', [$id]));
        $this->client->request('GET', '/api/requests/mine');
        self::assertSame([], $this->data()['requests']);
        $this->client->jsonRequest('PATCH', '/api/requests/'.$id, ['description' => 'Changed']);
        self::assertResponseStatusCodeSame(404);
        $this->client->request('DELETE', '/api/requests/'.$id);
        self::assertResponseStatusCodeSame(404);
    }

    private function swipe(string $direction): array
    {
        $alice = $this->user('alice');
        $bob = $this->user('bob');
        $request = $this->service($alice, Service::TYPE_REQUEST);
        $decision = new SwipeDecision($alice, $bob, $this->service($alice, Service::TYPE_OFFER), $request, $this->service($bob, Service::TYPE_OFFER), $this->service($bob, Service::TYPE_REQUEST), $direction);
        $this->em->persist($decision);
        $this->em->flush();
        return [$alice, $request, $decision];
    }

    private function user(string $username): User
    {
        $user = new User('Test', 'User', $username, $username.'@example.test');
        $user->setPassword('unused-password-hash');
        $this->em->persist($user);
        $this->em->flush();
        return $user;
    }

    private function service(User $user, string $type): Service
    {
        $category = new Category('Category '.uniqid());
        $this->em->persist($category);
        $service = new Service($user, $type, 'Original description.');
        $service->addCategory($category);
        $this->em->persist($service);
        $this->em->flush();
        return $service;
    }

    private function as(User $user): void
    {
        $jwt = static::getContainer()->get(JWTTokenManagerInterface::class);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$jwt->create($user));
    }

    private function data(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
