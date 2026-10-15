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

    public function testSuspensionHidesEachSideOfAMatchAndRejectsStaleSwipes(): void
    {
        [$alice, $bob, $ids] = $this->createReciprocalCombination();
        foreach ($ids as $name => $id) {
            $owner = str_starts_with($name, 'actor') ? $alice : $bob;
            $resource = str_contains($name, 'Offer') ? 'offers' : 'requests';
            $path = '/api/'.$resource.'/'.$id;
            $this->authenticate($owner === $alice ? $bob : $alice);
            $this->client->jsonRequest('PATCH', $path, ['isSuspended' => true]);
            self::assertResponseStatusCodeSame(404);
            $this->authenticate($owner);
            $this->client->jsonRequest('PATCH', $path, ['isSuspended' => true]);
            self::assertResponseIsSuccessful();

            $this->authenticate($alice);
            $this->client->request('GET', '/api/swipes');
            self::assertSame([], $this->data()['candidates']);
            foreach (['LEFT', 'RIGHT'] as $direction) {
                $this->client->jsonRequest('POST', '/api/swipes', [...$ids, 'direction' => $direction]);
                self::assertResponseStatusCodeSame(409);
            }
            self::assertSame(0, $this->entityManager->getRepository(Proposal::class)->count([]));
            self::assertSame(0, $this->entityManager->getRepository(\App\Entity\SwipeDecision::class)->count([]));
            if ($name === 'candidateOfferServiceId') {
                $this->client->request('GET', '/api/services');
                self::assertSame(0, $this->data()['pagination']['totalItems']);
            }

            $this->authenticate($owner);
            $this->client->jsonRequest('PATCH', $path, ['isSuspended' => false]);
            self::assertResponseIsSuccessful();
            $this->authenticate($alice);
            $this->client->request('GET', '/api/swipes');
            self::assertCount(1, $this->data()['candidates']);
            self::assertFalse($this->data()['candidates'][0]['actorOfferService']['isSuspended']);
            $this->client->request('GET', '/api/services');
            self::assertSame(1, $this->data()['pagination']['totalItems']);
            self::assertFalse($this->data()['offers'][0]['isSuspended']);
        }

        $this->client->jsonRequest('POST', '/api/swipes', [...$ids, 'direction' => 'RIGHT']);
        self::assertResponseStatusCodeSame(201);
        foreach ($ids as $name => $id) {
            $this->authenticate(str_starts_with($name, 'actor') ? $alice : $bob);
            $resource = str_contains($name, 'Offer') ? 'offers' : 'requests';
            $this->client->jsonRequest('PATCH', '/api/'.$resource.'/'.$id, ['isSuspended' => true]);
            self::assertResponseStatusCodeSame(409);
            self::assertFalse($this->entityManager->find(Service::class, $id)->isSuspended());
        }
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

    public function testOfferCannotBeChangedOrDeletedAfterItIsAddedToAProposal(): void
    {
        $alice = $this->createUser('alice');
        $category = $this->createCategory('Cooking');
        $offer = $this->createService($alice, Service::TYPE_OFFER, 'I cook.', $category);
        $proposal = new Proposal('1:2');
        $proposal->addParticipant(new ProposalParticipant($proposal, $alice, $offer));
        $this->entityManager->persist($proposal);
        $this->entityManager->flush();
        $this->authenticate($alice);

        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['description' => 'Changed']);
        self::assertResponseStatusCodeSame(409);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['isRemote' => true]);
        self::assertResponseStatusCodeSame(409);
        self::assertFalse($this->entityManager->find(Service::class, $offer->getId())->isRemote());
        $this->client->jsonRequest('PATCH', '/api/offers/'.$offer->getId(), ['isSuspended' => true]);
        self::assertResponseStatusCodeSame(409);
        self::assertFalse($this->entityManager->find(Service::class, $offer->getId())->isSuspended());
        $this->client->request('DELETE', '/api/offers/'.$offer->getId());
        self::assertResponseStatusCodeSame(409);
        self::assertSame('I cook.', $this->entityManager->find(Service::class, $offer->getId())->getDescription());
    }

    public function testOfferReservedByAChainCannotBeDeleted(): void
    {
        $alice = $this->createUser('alice');
        $offer = $this->createService($alice, Service::TYPE_OFFER, 'I cook.', $this->createCategory('Cooking'));
        $connection = $this->entityManager->getConnection();
        $connection->executeStatement('CREATE TABLE chain_service_reservations (service_id INTEGER PRIMARY KEY, group_id INTEGER NOT NULL)');
        $connection->insert('chain_service_reservations', ['service_id' => $offer->getId(), 'group_id' => 1]);
        $this->authenticate($alice);
        try {
            $this->client->request('DELETE', '/api/offers/'.$offer->getId());
            self::assertResponseStatusCodeSame(409);
        } finally {
            // This extra table is not mapped by Doctrine, so SchemaTool will not remove it.
            $connection->executeStatement('DROP TABLE chain_service_reservations');
        }
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
        self::assertNull($this->entityManager->find(Service::class, $id));
    }

    public function testRightSwipeCreatesPendingProposalAndRecipientCanAccept(): void
    {
        [$alice, $bob, $ids] = $this->createReciprocalCombination();
        $this->entityManager->find(Service::class, $ids['actorOfferServiceId'])->setIsRemote(true);
        $this->entityManager->find(Service::class, $ids['candidateRequestServiceId'])->setIsRemote(true);
        $bob->setBio('I enjoy gardening.');
        $bob->setProfileImageUrl('https://example.test/bob.jpg');
        $this->entityManager->flush();
        $this->authenticate($alice);

        $this->client->request('GET', '/api/swipes');
        self::assertResponseIsSuccessful();
        self::assertCount(0, $this->data()['pendingProposals']);
        self::assertCount(1, $this->data()['candidates']);
        self::assertTrue($this->data()['candidates'][0]['actorOfferService']['isRemote']);
        self::assertTrue($this->data()['candidates'][0]['candidateRequestService']['isRemote']);
        self::assertFalse($this->data()['candidates'][0]['actorRequestService']['isRemote']);
        self::assertSame('I enjoy gardening.', $this->data()['candidates'][0]['candidate']['bio']);
        self::assertSame('https://example.test/bob.jpg', $this->data()['candidates'][0]['candidate']['profileImageUrl']);
        self::assertArrayNotHasKey('email', $this->data()['candidates'][0]['candidate']);
        self::assertArrayNotHasKey('roles', $this->data()['candidates'][0]['candidate']);

        $this->client->jsonRequest('POST', '/api/swipes', [...$ids, 'direction' => 'RIGHT']);
        self::assertResponseStatusCodeSame(201);
        $proposalId = $this->data()['proposalId'];
        self::assertIsInt($proposalId);

        // Retrying the same client request is safe and returns the original proposal.
        $this->client->jsonRequest('POST', '/api/swipes', [...$ids, 'direction' => 'RIGHT']);
        self::assertResponseStatusCodeSame(200);
        self::assertSame($proposalId, $this->data()['proposalId']);

        $this->authenticate($bob);
        $this->client->request('GET', '/api/swipes');
        self::assertCount(1, $this->data()['pendingProposals']);
        self::assertSame($proposalId, $this->data()['pendingProposals'][0]['id']);
        self::assertTrue($this->data()['pendingProposals'][0]['participants'][0]['service']['isRemote']);
        self::assertSame('I enjoy gardening.', $this->data()['pendingProposals'][0]['participants'][1]['user']['bio']);
        self::assertArrayNotHasKey('email', $this->data()['pendingProposals'][0]['participants'][1]['user']);

        $this->client->jsonRequest('POST', '/api/proposals/'.$proposalId.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseIsSuccessful();
        self::assertTrue($this->data()['matched']);
        self::assertSame('ACCEPTED', $this->data()['proposal']['status']);
        self::assertTrue($this->data()['proposal']['participants'][0]['service']['isRemote']);
    }

    public function testLeftSwipeHidesExactCombinationAndInvalidOwnershipIsRejected(): void
    {
        [$alice, $bob, $ids] = $this->createReciprocalCombination();
        $this->authenticate($alice);

        $this->client->jsonRequest('POST', '/api/swipes', [...$ids, 'direction' => 'LEFT']);
        self::assertResponseStatusCodeSame(201);
        self::assertNull($this->data()['proposalId']);

        $this->client->request('GET', '/api/swipes');
        self::assertCount(0, $this->data()['candidates']);

        $ids['actorOfferServiceId'] = $ids['candidateOfferServiceId'];
        $this->client->jsonRequest('POST', '/api/swipes', [...$ids, 'direction' => 'RIGHT']);
        self::assertResponseStatusCodeSame(400);
    }

    public function testInactiveUsersCannotPublishAndRecipientCanRejectOnce(): void
    {
        $inactive = $this->createUser('inactive');
        $inactive->setAccountStatus(User::STATUS_INACTIVE);
        $category = $this->createCategory('Repairs');
        $this->entityManager->flush();
        $this->authenticate($inactive);
        $this->client->jsonRequest('POST', '/api/services', ['type' => 'OFFER', 'description' => 'I repair bikes.', 'categoryIds' => [$category->getId()]]);
        self::assertResponseStatusCodeSame(403);

        [$alice, $bob, $ids] = $this->createReciprocalCombination();
        $this->authenticate($alice);
        $this->client->jsonRequest('POST', '/api/swipes', [...$ids, 'direction' => 'RIGHT']);
        $proposalId = $this->data()['proposalId'];
        $this->authenticate($bob);
        $this->client->jsonRequest('POST', '/api/proposals/'.$proposalId.'/decision', ['decision' => 'REJECT']);
        self::assertResponseIsSuccessful();
        self::assertFalse($this->data()['matched']);
        self::assertSame('REJECTED', $this->data()['proposal']['status']);

        $this->client->jsonRequest('POST', '/api/proposals/'.$proposalId.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseStatusCodeSame(409);
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
        $inactiveOffer = $this->createService($inactiveOwner, Service::TYPE_OFFER, 'I repair clocks.', $repairs);
        $this->entityManager->flush();

        $this->authenticate($viewer);
        $this->client->request('GET', '/api/services');

        self::assertResponseIsSuccessful();
        self::assertSame(1, $this->data()['pagination']['totalItems']);
        self::assertSame($pasta->getId(), $this->data()['offers'][0]['id']);
        self::assertTrue($this->data()['offers'][0]['isRemote']);
        self::assertSame('Rome', $this->data()['offers'][0]['owner']['location']);
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
        $this->entityManager->flush();
        $second = $this->createService($milanOwner, Service::TYPE_OFFER, 'I repair bicycles.', $repairs);
        $third = $this->createService($romeOwner, Service::TYPE_OFFER, 'I maintain gardens.', $gardening);

        $this->authenticate($viewer);
        $this->client->request('GET', '/api/services?q=PASTA&location=rOmE');
        self::assertResponseIsSuccessful();
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

    public function testHomepageCatalogRejectsInvalidFilters(): void
    {
        $viewer = $this->createUser('viewer');
        $this->authenticate($viewer);

        foreach (['?page=0', '?limit=51', '?sort=popular', '?categoryIds=1,nope', '?categoryIds='] as $query) {
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
