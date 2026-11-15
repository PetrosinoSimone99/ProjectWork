<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Category;
use App\Entity\Proposal;
use App\Entity\ProposalParticipant;
use App\Entity\Service;
use App\Entity\User;
use App\Repository\ProposalRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class MarketplaceControllerTest extends WebTestCase
{
    private EntityManagerInterface $entityManager;
    private KernelBrowser $client;

    public function testUserServicesReturnsOnlyPublishedServicesAndPublicProfile(): void
    {
        $viewer = $this->createUser('viewer');
        $owner = $this->createUser('owner', 'Rome');
        $owner->setBio('I enjoy sharing skills.');
        $owner->setProfileImageUrl('https://example.test/avatar.png');
        $firstCategory = $this->createCategory('Tutoring');
        $secondCategory = $this->createCategory('Languages');
        $expected = ['offers' => [], 'requests' => []];

        foreach ([Service::TYPE_OFFER => 'offers', Service::TYPE_REQUEST => 'requests'] as $type => $key) {
            // The oldest service gets the highest ID, proving date takes priority over ID.
            foreach (['2026-11-14', '2026-11-14', '2026-11-01'] as $date) {
                $service = $this->createService($owner, $type, 'Published '.$type, $firstCategory);
                $service->addCategory($secondCategory);
                $service->setLocation('Milan');
                $service->setIsRemote(true);
                (new \ReflectionProperty(Service::class, 'createdAt'))->setValue($service, new \DateTimeImmutable($date));
                $expected[$key][] = $service;
            }
            $suspended = $this->createService($owner, $type, 'Suspended', $firstCategory);
            $suspended->setIsSuspended(true);
            $deleted = $this->createService($owner, $type, 'Deleted', $firstCategory);
            $deleted->markDeleted();
            $this->createService($viewer, $type, 'Another owner', $firstCategory);
        }
        $this->entityManager->flush();
        $this->authenticate($viewer);
        // Catalog filters must not narrow the selected person's services.
        $this->client->request('GET', '/api/users/'.$owner->getId().'/services?q=absent&limit=1&isRemote=false');

        self::assertResponseIsSuccessful();
        $data = $this->data();
        self::assertSame(['user', 'offers', 'requests'], array_keys($data));
        self::assertSame($owner->toPublicApiArray(), $data['user']);
        self::assertSame(
            ['id', 'name', 'surname', 'username', 'location', 'bio', 'profileImageUrl'],
            array_keys($data['user']),
        );
        foreach ($expected as $key => $services) {
            $ordered = [$services[1], $services[0], $services[2]];
            self::assertSame(array_map(static fn (Service $service): int => $service->getId(), $ordered), array_column($data[$key], 'id'));
            foreach ($ordered as $index => $service) {
                self::assertEquals($service->toOwnedServiceApiArray(), $data[$key][$index]);
                self::assertCount(2, $data[$key][$index]['categories']);
            }
        }
    }

    public function testUserServicesReturnsEmptyListsOrNotFound(): void
    {
        $viewer = $this->createUser('viewer');
        $owner = $this->createUser('owner');
        $this->authenticate($viewer);
        $this->client->request('GET', '/api/users/'.$owner->getId().'/services');
        self::assertResponseIsSuccessful();
        self::assertSame([], $this->data()['offers']);
        self::assertSame([], $this->data()['requests']);

        $this->client->request('GET', '/api/users/999999/services');
        self::assertResponseStatusCodeSame(404);
        self::assertSame(['error' => 'User not found.'], $this->data());

        // Reload after browser requests, which can reboot the application kernel.
        $owner = $this->entityManager->find(User::class, $owner->getId());
        $owner->setAccountStatus(User::STATUS_INACTIVE);
        $this->entityManager->flush();
        $this->client->request('GET', '/api/users/'.$owner->getId().'/services');
        self::assertResponseStatusCodeSame(404);
        self::assertSame(['error' => 'User not found.'], $this->data());
    }

    public function testUserServicesRequiresAnActiveAuthenticatedViewer(): void
    {
        $owner = $this->createUser('owner');
        $path = '/api/users/'.$owner->getId().'/services';
        $this->client->request('GET', $path);
        self::assertResponseStatusCodeSame(401);

        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer invalid-token');
        $this->client->request('GET', $path);
        self::assertResponseStatusCodeSame(401);

        $viewer = $this->createUser('inactive-viewer');
        $viewer->setAccountStatus(User::STATUS_INACTIVE);
        $this->entityManager->flush();
        $this->authenticate($viewer);
        $this->client->request('GET', $path);
        self::assertResponseStatusCodeSame(403);
    }

    public function testServiceLocationCanBeCreatedEditedClearedAndRead(): void
    {
        $owner = $this->createUser('owner', 'Profile city');
        $other = $this->createUser('other');
        $category = $this->createCategory('Tutoring');
        $this->authenticate($owner);

        foreach (['OFFER' => 'offers', 'REQUEST' => 'requests'] as $type => $resource) {
            foreach ([[], ['location' => null], ['location' => '  '], ['location' => '  Rome  '], ['location' => str_repeat('é', 255)]] as $fields) {
                $this->client->jsonRequest('POST', '/api/services', [
                    'type' => $type, 'description' => 'Tutoring.', 'categoryIds' => [$category->getId()], ...$fields,
                ]);
                self::assertResponseStatusCodeSame(201);
                $service = $this->data()['service'];
                $expected = isset($fields['location']) ? trim($fields['location']) : null;
                self::assertSame($expected === '' ? null : $expected, $service['location']);
            }
            $path = '/api/'.$resource.'/'.$service['id'];
            $key = $type === 'OFFER' ? 'offer' : 'request';
            $this->client->jsonRequest('PATCH', $path, ['location' => '  Milan  ']);
            self::assertResponseIsSuccessful();
            self::assertSame('Milan', $this->data()[$key]['location']);
            $this->client->jsonRequest('PATCH', $path, ['description' => 'Updated tutoring.']);
            self::assertResponseIsSuccessful();
            self::assertSame('Milan', $this->data()[$key]['location']);

            foreach ([false, 42, [], new \stdClass(), str_repeat('é', 256)] as $invalid) {
                $this->client->jsonRequest('PATCH', $path, ['description' => 'Must not save.', 'location' => $invalid]);
                self::assertResponseStatusCodeSame(400);
                $before = $this->entityManager->getRepository(Service::class)->count([]);
                $this->client->jsonRequest('POST', '/api/services', [
                    'type' => $type, 'description' => 'Invalid.', 'categoryIds' => [$category->getId()], 'location' => $invalid,
                ]);
                self::assertResponseStatusCodeSame(400);
                self::assertSame($before, $this->entityManager->getRepository(Service::class)->count([]));
            }
            $this->client->request('GET', '/api/'.$resource.'/mine');
            $saved = array_values(array_filter($this->data()[$resource], static fn (array $row) => $row['id'] === $service['id']))[0];
            self::assertSame('Milan', $saved['location']);
            self::assertSame('Updated tutoring.', $saved['description']);

            $this->authenticate($other);
            $this->client->jsonRequest('PATCH', $path, ['location' => 'Unauthorized']);
            self::assertResponseStatusCodeSame(404);
            $this->authenticate($owner);
            foreach ([null, '', '   '] as $empty) {
                $this->client->jsonRequest('PATCH', $path, ['location' => 'Rome']);
                self::assertResponseIsSuccessful();
                $this->client->jsonRequest('PATCH', $path, ['location' => $empty]);
                self::assertResponseIsSuccessful();
                self::assertNull($this->data()[$key]['location']);
                $this->entityManager->clear();
                self::assertNull($this->entityManager->find(Service::class, $service['id'])->getLocation());
            }
        }
        self::assertSame('Profile city', $this->entityManager->find(User::class, $owner->getId())->getLocation());
    }

    /** Both flags accept only JSON booleans and support partial updates. */
    public static function booleanFields(): array
    {
        return [['isRemote'], ['isSuspended']];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('booleanFields')]
    public function testBooleanServiceFlagsCanBePublishedEditedAndReadForBothServiceTypes(string $field): void
    {
        $alice = $this->createUser('alice');
        $category = $this->createCategory('Tutoring');
        $this->authenticate($alice);

        foreach (['OFFER' => 'offers', 'REQUEST' => 'requests'] as $type => $resource) {
            foreach ([[], [$field => false], [$field => true]] as $flags) {
                $this->client->jsonRequest('POST', '/api/services', [
                    'type' => $type, 'description' => 'Online tutoring.', 'categoryIds' => [$category->getId()], ...$flags,
                ]);
                self::assertResponseStatusCodeSame(201);
                $service = $this->data()['service'];
                self::assertSame($flags[$field] ?? false, $service[$field]);
                $path = '/api/'.$resource.'/'.$service['id'];
                $key = $type === 'OFFER' ? 'offer' : 'request';

                $this->client->jsonRequest('PATCH', $path, [$field => true]);
                self::assertResponseIsSuccessful();
                self::assertTrue($this->data()[$key][$field]);
                $this->client->jsonRequest('PATCH', $path, ['description' => 'Updated tutoring.']);
                self::assertResponseIsSuccessful();
                self::assertTrue($this->data()[$key][$field]);

                foreach ([null, 'true', 0, 1, [], new \stdClass()] as $invalid) {
                    $this->client->jsonRequest('PATCH', $path, ['description' => 'Must not save.', $field => $invalid]);
                    self::assertResponseStatusCodeSame(400);
                }
                $this->client->request('GET', '/api/'.$resource.'/mine');
                self::assertResponseIsSuccessful();
                $saved = array_values(array_filter($this->data()[$resource], static fn (array $row) => $row['id'] === $service['id']))[0];
                self::assertTrue($saved[$field]);
                self::assertSame('Updated tutoring.', $saved['description']);

                $this->client->jsonRequest('PATCH', $path, [$field => false]);
                self::assertResponseIsSuccessful();
                self::assertFalse($this->data()[$key][$field]);
                $this->entityManager->clear();
                self::assertFalse($this->entityManager->find(Service::class, $service['id'])->$field());
            }
            $before = $this->entityManager->getRepository(Service::class)->count([]);
            foreach ([null, 'false', 0, 1, [], new \stdClass()] as $invalid) {
                $this->client->jsonRequest('POST', '/api/services', [
                    'type' => $type, 'description' => 'Invalid boolean value.', 'categoryIds' => [$category->getId()], $field => $invalid,
                ]);
                self::assertResponseStatusCodeSame(400);
            }
            self::assertSame($before, $this->entityManager->getRepository(Service::class)->count([]));
        }
    }

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        // Remove the unmapped reservation fixture left by interrupted earlier runs.
        $this->entityManager->getConnection()->executeStatement('DROP TABLE IF EXISTS chain_service_reservations');
        $tool = new SchemaTool($this->entityManager);
        $metadata = $this->entityManager->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($metadata);
        $tool->createSchema($metadata);
    }

    public function testCategoriesAndServicePublishingRequireValidAuthenticatedInput(): void
    {
        $alice = $this->createUser('alice');
        $cooking = $this->createCategory('Cooking');
        $this->authenticate($alice);

        $this->client->request('GET', '/api/categories');
        self::assertResponseIsSuccessful();
        self::assertSame('Cooking', $this->data()['categories'][0]['description']);

        $this->client->jsonRequest('POST', '/api/services', ['type' => 'OFFER', 'description' => 'I can cook pasta.', 'categoryIds' => [$cooking->getId()]]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('OFFER', $this->data()['service']['type']);
        self::assertSame('Cooking', $this->data()['service']['categories'][0]['description']);

        $this->client->jsonRequest('POST', '/api/services', ['type' => 'OFFER', 'description' => 'x', 'categoryIds' => [999]]);
        self::assertResponseStatusCodeSame(404);
        self::assertArrayHasKey('error', $this->data());
    }

    public function testUserCanListOnlyTheirOffersAndUpdateDescriptionAndCategories(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $firstCategory = $this->createCategory('Cooking');
        $secondCategory = $this->createCategory('Repairs');
        $olderOffer = $this->createService($alice, Service::TYPE_OFFER, 'I cook.', $firstCategory);
        $newerOffer = $this->createService($alice, Service::TYPE_OFFER, 'I bake.', $firstCategory);
        $this->createService($bob, Service::TYPE_OFFER, 'Bob cooks.', $firstCategory);
        $this->createService($alice, Service::TYPE_REQUEST, 'I need repairs.', $secondCategory);
        $this->authenticate($alice);

        $this->client->request('GET', '/api/offers/mine');
        self::assertResponseIsSuccessful();
        self::assertSame([$newerOffer->getId(), $olderOffer->getId()], array_column($this->data()['offers'], 'id'));

        $this->client->jsonRequest('PATCH', '/api/offers/'.$olderOffer->getId(), ['description' => '  I cook fresh pasta.  ', 'categoryIds' => [$secondCategory->getId()]]);
        self::assertResponseIsSuccessful();
        self::assertSame('I cook fresh pasta.', $this->data()['offer']['description']);
        self::assertSame('Repairs', $this->data()['offer']['categories'][0]['description']);

        $this->client->jsonRequest('PATCH', '/api/offers/'.$olderOffer->getId(), ['description' => 'Updated only.']);
        self::assertResponseIsSuccessful();
        self::assertSame('Repairs', $this->data()['offer']['categories'][0]['description']);
    }

    public function testOfferManagementRejectsInvalidInputAndOtherUsersServices(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $category = $this->createCategory('Cooking');
        $offer = $this->createService($alice, Service::TYPE_OFFER, 'I cook.', $category);
        $request = $this->createService($alice, Service::TYPE_REQUEST, 'I need food.', $category);
        $this->authenticate($bob);

        $this->client->request('GET', '/api/offers/mine');
        self::assertResponseIsSuccessful();
        self::assertSame([], $this->data()['offers']);

        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['description' => 'Hijack']);
        self::assertResponseStatusCodeSame(404);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['isRemote' => true]);
        self::assertResponseStatusCodeSame(404);
        $this->client->request('DELETE', '/api/offers/'.$offer->getId());
        self::assertResponseStatusCodeSame(404);

        $this->authenticate($alice);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$request->getId(), ['description' => 'Change request']);
        self::assertResponseStatusCodeSame(404);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['description' => '   ']);
        self::assertResponseStatusCodeSame(400);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['categoryIds' => [$category->getId(), $category->getId()]]);
        self::assertResponseStatusCodeSame(400);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['unknown' => true]);
        self::assertResponseStatusCodeSame(400);
    }

    public function testUserCanDeleteAnUnusedOffer(): void
    {
        $alice = $this->createUser('alice');
        $offer = $this->createService($alice, Service::TYPE_OFFER, 'I cook.', $this->createCategory('Cooking'));
        $this->authenticate($alice);

        $id = $offer->getId();
        $this->client->request('DELETE', '/api/offers/'.$id);
        self::assertResponseStatusCodeSame(204);
        $this->entityManager->clear();
        $saved = $this->entityManager->find(Service::class, $id);
        self::assertTrue($saved->isDeleted());
        self::assertCount(1, $saved->getCategories());
        self::assertNotNull($this->entityManager->getConnection()->fetchOne('SELECT deleted_at FROM services WHERE id = ?', [$id]));
        $this->client->request('GET', '/api/offers/mine');
        self::assertSame([], $this->data()['offers']);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$id, ['description' => 'Changed']);
        self::assertResponseStatusCodeSame(404);
        $this->client->request('DELETE', '/api/offers/'.$id);
        self::assertResponseStatusCodeSame(404);
    }

    public function testDeletedServicesDisappearFromCatalog(): void
    {
        [$alice, $bob, $ids] = $this->createReciprocalCombination();
        $this->authenticate($bob);
        $this->client->request('DELETE', '/api/offers/'.$ids['candidateOfferServiceId']);
        self::assertResponseStatusCodeSame(204);
        $this->authenticate($alice);
        $this->client->request('GET', '/api/services');
        self::assertSame([], $this->data()['offers']);
    }

    public function testInactiveUsersCannotPublish(): void
    {
        $inactive = $this->createUser('inactive');
        $inactive->setAccountStatus(User::STATUS_INACTIVE);
        $category = $this->createCategory('Repairs');
        $this->entityManager->flush();
        $this->authenticate($inactive);
        $this->client->jsonRequest('POST', '/api/services', ['type' => 'OFFER', 'description' => 'I repair bikes.', 'categoryIds' => [$category->getId()]]);
        self::assertResponseStatusCodeSame(403);
    }

    public function testHomepageCatalogShowsOnlyOtherActiveOffersWithSafeOwnerData(): void
    {
        $viewer = $this->createUser('viewer');
        $romeOwner = $this->createUser('rome-owner', 'Rome');
        $inactiveOwner = $this->createUser('inactive-owner', 'Milan');
        $inactiveOwner->setAccountStatus(User::STATUS_INACTIVE);
        $cooking = $this->createCategory('Cooking');
        $repairs = $this->createCategory('Repairs');

        $this->createService($viewer, Service::TYPE_OFFER, 'My private offer.', $cooking);
        $this->createService($romeOwner, Service::TYPE_REQUEST, 'I need a meal.', $cooking);
        $pasta = $this->createService($romeOwner, Service::TYPE_OFFER, 'I can cook pasta.', $cooking);
        $pasta->setIsRemote(true);
        $pasta->setLocation('Milan');
        $inactiveOffer = $this->createService($inactiveOwner, Service::TYPE_OFFER, 'I repair clocks.', $repairs);
        $this->entityManager->flush();

        $this->authenticate($viewer);
        $this->client->request('GET', '/api/services');

        self::assertResponseIsSuccessful();
        self::assertSame(1, $this->data()['pagination']['totalItems']);
        self::assertSame($pasta->getId(), $this->data()['offers'][0]['id']);
        self::assertTrue($this->data()['offers'][0]['isRemote']);
        self::assertSame('Rome', $this->data()['offers'][0]['owner']['location']);
        self::assertSame('Milan', $this->data()['offers'][0]['location']);
        self::assertArrayNotHasKey('email', $this->data()['offers'][0]['owner']);
        self::assertArrayNotHasKey('roles', $this->data()['offers'][0]['owner']);
        self::assertNotSame($inactiveOffer->getId(), $this->data()['offers'][0]['id']);
    }

    public function testHomepageCatalogSupportsTextLocationCategorySortingAndPaginationFilters(): void
    {
        $viewer = $this->createUser('viewer');
        $romeOwner = $this->createUser('rome-owner', 'Rome');
        $milanOwner = $this->createUser('milan-owner', 'Milan');
        $cooking = $this->createCategory('Cooking');
        $gardening = $this->createCategory('Gardening');
        $repairs = $this->createCategory('Repairs');

        $first = $this->createService($romeOwner, Service::TYPE_OFFER, 'I can cook pasta.', $cooking);
        $first->addCategory($gardening);
        $first->setLocation('Rome city centre');
        $this->entityManager->flush();
        $second = $this->createService($milanOwner, Service::TYPE_OFFER, 'I repair bicycles.', $repairs);
        $third = $this->createService($romeOwner, Service::TYPE_OFFER, 'I maintain gardens.', $gardening);
        $third->setLocation('Milan');
        $this->entityManager->flush();

        $this->authenticate($viewer);
        $this->client->request('GET', '/api/services?q=PASTA&location=rOmE');
        self::assertResponseIsSuccessful();
        self::assertSame([$first->getId()], array_column($this->data()['offers'], 'id'));

        $this->client->request('GET', '/api/services?location=MILAN');
        self::assertSame([$third->getId()], array_column($this->data()['offers'], 'id'));
        $this->client->request('GET', '/api/services?location=rome&categoryIds='.$cooking->getId());
        self::assertSame([$first->getId()], array_column($this->data()['offers'], 'id'));

        // One offer belonging to two requested categories appears only once.
        $this->client->request('GET', '/api/services?categoryIds='.$cooking->getId().','.$gardening->getId());
        self::assertResponseIsSuccessful();
        self::assertSame(2, $this->data()['pagination']['totalItems']);
        self::assertCount(1, array_keys(array_filter(
            $this->data()['offers'],
            static fn (array $offer): bool => $offer['id'] === $first->getId(),
        )));

        $this->client->request('GET', '/api/services?sort=oldest&limit=1&page=1');
        self::assertResponseIsSuccessful();
        self::assertSame($first->getId(), $this->data()['offers'][0]['id']);
        self::assertSame(3, $this->data()['pagination']['totalItems']);
        self::assertSame(3, $this->data()['pagination']['totalPages']);

        $this->client->request('GET', '/api/services?sort=newest&limit=1&page=1');
        self::assertResponseIsSuccessful();
        self::assertSame($third->getId(), $this->data()['offers'][0]['id']);

        $this->client->request('GET', '/api/services?limit=1&page=9');
        self::assertResponseIsSuccessful();
        self::assertSame([], $this->data()['offers']);
        self::assertSame(3, $this->data()['pagination']['totalItems']);
        self::assertSame(3, $this->data()['pagination']['totalPages']);

        self::assertNotSame($second->getId(), $third->getId());
    }

    public function testHomepagePrioritizesDesiredCategoriesAcrossPagesWithoutDuplicates(): void
    {
        $viewer = $this->createUser('viewer');
        $owner = $this->createUser('owner');
        $desired = $this->createCategory('Languages');
        $other = $this->createCategory('Repairs');
        $this->createService($viewer, Service::TYPE_REQUEST, 'I need lessons.', $desired);
        $this->createService($viewer, Service::TYPE_REQUEST, 'More lessons.', $desired);

        $first = $this->createService($owner, Service::TYPE_OFFER, 'First preferred.', $desired);
        $first->addCategory($other);
        $second = $this->createService($owner, Service::TYPE_OFFER, 'Second preferred.', $desired);
        $third = $this->createService($owner, Service::TYPE_OFFER, 'First remaining.', $other);
        $fourth = $this->createService($owner, Service::TYPE_OFFER, 'Second remaining.', $other);
        // Give each group equal timestamps to check the ID tie-breaker too.
        foreach ([$first, $second, $third, $fourth] as $index => $service) {
            $this->entityManager->getConnection()->executeStatement(
                'UPDATE services SET creation_date = ? WHERE id = ?',
                [$index < 2 ? '2026-01-01 10:00:00' : '2026-02-01 10:00:00', $service->getId()],
            );
        }
        $this->entityManager->flush();
        $this->entityManager->clear();
        $this->authenticate($viewer);

        $allIds = [];
        foreach ([1 => [$second->getId(), $first->getId(), $fourth->getId()], 2 => [$third->getId()], 3 => []] as $page => $expected) {
            $this->client->request('GET', '/api/services?limit=3&page='.$page);
            self::assertResponseIsSuccessful();
            $data = $this->data();
            self::assertSame($expected, array_column($data['offers'], 'id'));
            self::assertSame(['page' => $page, 'limit' => 3, 'totalItems' => 4, 'totalPages' => 2], $data['pagination']);
            if ($page === 1) {
                self::assertCount(2, $data['offers'][1]['categories']);
            }
            $allIds = [...$allIds, ...array_column($data['offers'], 'id')];
        }
        self::assertCount(4, array_unique($allIds));

        foreach ([$second, $first, $fourth, $third] as $index => $offer) {
            $this->client->request('GET', '/api/services?limit=1&page='.($index + 1));
            self::assertResponseIsSuccessful();
            self::assertSame([$offer->getId()], array_column($this->data()['offers'], 'id'));
        }

        $this->client->request('GET', '/api/services?sort=oldest');
        self::assertResponseIsSuccessful();
        self::assertSame([$first->getId(), $second->getId(), $third->getId(), $fourth->getId()], array_column($this->data()['offers'], 'id'));

        // A category filter restricts both groups without replacing the viewer's preferences.
        $this->client->request('GET', '/api/services?categoryIds='.$other->getId());
        self::assertResponseIsSuccessful();
        self::assertSame([$first->getId(), $fourth->getId(), $third->getId()], array_column($this->data()['offers'], 'id'));
        self::assertCount(2, $this->data()['offers'][0]['categories']);
    }

    public function testHomepagePreferencesFollowChangesToOwnActiveRequests(): void
    {
        $viewer = $this->createUser('viewer');
        $owner = $this->createUser('owner');
        $firstCategory = $this->createCategory('Languages');
        $secondCategory = $this->createCategory('Repairs');
        $request = $this->createService($viewer, Service::TYPE_REQUEST, 'I need lessons.', $firstCategory);
        $first = $this->createService($owner, Service::TYPE_OFFER, 'Lessons.', $firstCategory);
        $second = $this->createService($owner, Service::TYPE_OFFER, 'Repairs.', $secondCategory);
        // Offers and another user's requests must not define the viewer's preferences.
        $this->createService($viewer, Service::TYPE_OFFER, 'My repairs.', $secondCategory);
        $this->createService($owner, Service::TYPE_REQUEST, 'Other request.', $secondCategory);
        $this->authenticate($viewer);
        $this->client->request('GET', '/api/services');
        self::assertResponseIsSuccessful();
        self::assertSame([$first->getId(), $second->getId()], array_column($this->data()['offers'], 'id'));

        foreach ([
            ['categoryIds' => [$secondCategory->getId()]],
            ['categoryIds' => [$firstCategory->getId()]],
            ['isSuspended' => true],
            ['isSuspended' => false],
        ] as $index => $update) {
            $this->client->jsonRequest('PATCH', '/api/requests/'.$request->getId(), $update);
            self::assertResponseIsSuccessful();
            $this->client->request('GET', '/api/services');
            self::assertResponseIsSuccessful();
            $expected = in_array($index, [0, 2], true) ? [$second->getId(), $first->getId()] : [$first->getId(), $second->getId()];
            self::assertSame($expected, array_column($this->data()['offers'], 'id'));
        }
        $this->client->request('DELETE', '/api/requests/'.$request->getId());
        self::assertResponseStatusCodeSame(204);
        $this->client->request('GET', '/api/services');
        self::assertResponseIsSuccessful();
        self::assertSame([$second->getId(), $first->getId()], array_column($this->data()['offers'], 'id'));
        $this->client->request('POST', '/api/requests/'.$request->getId().'/restore');
        self::assertResponseIsSuccessful();
        $this->client->request('GET', '/api/services');
        self::assertResponseIsSuccessful();
        self::assertSame([$first->getId(), $second->getId()], array_column($this->data()['offers'], 'id'));
    }

    public function testRegistrationRequestsImmediatelyPersonalizeTheHomepage(): void
    {
        $owner = $this->createUser('owner');
        $desired = $this->createCategory('Languages');
        $other = $this->createCategory('Repairs');
        $preferred = $this->createService($owner, Service::TYPE_OFFER, 'Lessons.', $desired);
        $remaining = $this->createService($owner, Service::TYPE_OFFER, 'Repairs.', $other);

        $this->client->jsonRequest('POST', '/api/auth/register', [
            'name' => 'New', 'surname' => 'User', 'username' => 'new-user',
            'email' => 'new-user@example.test', 'password' => 'correct-password', 'location' => 'Rome',
            'offers' => [['description' => 'I offer repairs.', 'categoryIds' => [$other->getId()]]],
            'requests' => [['description' => 'I want lessons.', 'categoryIds' => [$desired->getId()]]],
        ]);
        self::assertResponseStatusCodeSame(201);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$this->data()['token']);
        $this->client->request('GET', '/api/services');
        self::assertResponseIsSuccessful();
        self::assertSame([$preferred->getId(), $remaining->getId()], array_column($this->data()['offers'], 'id'));
    }

    public function testHomepageRemoteFilterCombinesWithPreferencesAndOtherFilters(): void
    {
        $viewer = $this->createUser('viewer');
        $owner = $this->createUser('owner');
        $desired = $this->createCategory('Languages');
        $other = $this->createCategory('Repairs');
        $this->createService($viewer, Service::TYPE_REQUEST, 'Lessons wanted.', $desired);
        $preferred = $this->createService($owner, Service::TYPE_OFFER, 'Remote help.', $desired);
        $inPerson = $this->createService($owner, Service::TYPE_OFFER, 'In-person help.', $desired);
        $remaining = $this->createService($owner, Service::TYPE_OFFER, 'Remote help.', $other);
        foreach ([$preferred, $remaining] as $service) {
            $service->setIsRemote(true);
            $service->setLocation('Rome');
        }
        $uncategorized = new Service($owner, Service::TYPE_OFFER, 'Existing uncategorized offer.');
        $this->entityManager->persist($uncategorized);
        $this->entityManager->flush();
        $this->authenticate($viewer);

        foreach ([
            '' => [$inPerson->getId(), $preferred->getId(), $uncategorized->getId(), $remaining->getId()],
            '?isRemote=true' => [$preferred->getId(), $remaining->getId()],
            '?isRemote=false' => [$inPerson->getId(), $uncategorized->getId()],
            '?isRemote=true&q=HELP&location=rome' => [$preferred->getId(), $remaining->getId()],
            '?isRemote=true&categoryIds='.$other->getId() => [$remaining->getId()],
            '?isRemote=false&location=Rome' => [],
        ] as $query => $expected) {
            $this->client->request('GET', '/api/services'.$query);
            self::assertResponseIsSuccessful();
            self::assertSame($expected, array_column($this->data()['offers'], 'id'));
            self::assertSame(count($expected), $this->data()['pagination']['totalItems']);
        }
    }

    public function testHomepageCatalogRejectsInvalidFilters(): void
    {
        $viewer = $this->createUser('viewer');
        $this->authenticate($viewer);

        foreach (['?page=0', '?limit=51', '?sort=popular', '?categoryIds=1,nope', '?categoryIds=', '?isRemote=', '?isRemote=1', '?isRemote=0', '?isRemote=TRUE', '?isRemote=null', '?isRemote[]=true'] as $query) {
            $this->client->request('GET', '/api/services'.$query);
            self::assertResponseStatusCodeSame(400);
            self::assertArrayHasKey('error', $this->data());
        }

    }

    public function testHomepageCatalogRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/services');
        self::assertResponseStatusCodeSame(401);
    }

    public function testInactiveAccountCannotReadHomepageCatalog(): void
    {
        $inactiveUser = $this->createUser('inactive-viewer');
        $inactiveUser->setAccountStatus(User::STATUS_INACTIVE);
        $this->entityManager->flush();

        $this->authenticate($inactiveUser);
        $this->client->request('GET', '/api/services');

        self::assertResponseStatusCodeSame(403);
    }

    public function testProposalRepositoryReturnsUniqueMembersInStableOrder(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $aliceOffer = $this->createService($alice, Service::TYPE_OFFER, 'First offer.', $this->createCategory('First'));
        $aliceSecondOffer = $this->createService($alice, Service::TYPE_OFFER, 'Second offer.', $this->createCategory('Second'));
        $bobOffer = $this->createService($bob, Service::TYPE_OFFER, 'Bob offer.', $this->createCategory('Third'));
        $proposal = new Proposal('1:2');
        $proposal->addParticipant(new ProposalParticipant($proposal, $alice, $aliceOffer));
        $proposal->addParticipant(new ProposalParticipant($proposal, $alice, $aliceSecondOffer));
        $proposal->addParticipant(new ProposalParticipant($proposal, $bob, $bobOffer));
        $this->entityManager->persist($proposal);
        $this->entityManager->flush();

        $members = static::getContainer()->get(ProposalRepository::class)->findMembersByProposalId($proposal->getId());

        self::assertSame([$alice->getId(), $bob->getId()], array_map(static fn (User $user): int => $user->getId(), $members));
    }

    public function testProposalRepositoryReturnsEmptyListForUnknownProposal(): void
    {
        $members = static::getContainer()->get(ProposalRepository::class)->findMembersByProposalId(999999);

        self::assertSame([], $members);
    }

    /** @return array{User, User, array{actorOfferServiceId: int, actorRequestServiceId: int, candidateOfferServiceId: int, candidateRequestServiceId: int}} */
    private function createReciprocalCombination(): array
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $cooking = $this->createCategory('Cooking');
        $gardening = $this->createCategory('Gardening');
        $aliceOffer = $this->createService($alice, Service::TYPE_OFFER, 'I cook.', $cooking);
        $aliceRequest = $this->createService($alice, Service::TYPE_REQUEST, 'I need garden help.', $gardening);
        $bobOffer = $this->createService($bob, Service::TYPE_OFFER, 'I garden.', $gardening);
        $bobRequest = $this->createService($bob, Service::TYPE_REQUEST, 'I need food.', $cooking);

        return [$alice, $bob, [
            'actorOfferServiceId' => $aliceOffer->getId(),
            'actorRequestServiceId' => $aliceRequest->getId(),
            'candidateOfferServiceId' => $bobOffer->getId(),
            'candidateRequestServiceId' => $bobRequest->getId(),
        ]];
    }

    private function createUser(string $username, ?string $location = null): User
    {
        $user = new User('Test', 'User', $username, $username.'@example.test');
        $user->setLocation($location);
        $hasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        $user->setPassword($hasher->hashPassword($user, 'correct-password'));
        $this->entityManager->persist($user);
        $this->entityManager->flush();
        return $user;
    }

    private function createCategory(string $description): Category
    {
        $category = new Category($description);
        $this->entityManager->persist($category);
        $this->entityManager->flush();
        return $category;
    }

    private function createService(User $user, string $type, string $description, Category $category): Service
    {
        $service = new Service($user, $type, $description);
        $service->addCategory($category);
        $this->entityManager->persist($service);
        $this->entityManager->flush();
        return $service;
    }

    private function authenticate(User $user): void
    {
        $jwt = static::getContainer()->get(JWTTokenManagerInterface::class);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$jwt->create($user));
    }

    /** @return array<string, mixed> */
    private function data(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
