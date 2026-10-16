<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Category;
use App\Entity\Service;
use App\Entity\SwipeDecision;
use App\Entity\User;
use App\Repository\ChainSchema;
use App\Service\ChainClock;
use App\Service\ChainService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Process\Process;

/** These tests drop tables ONLY in an explicitly named chain_check_* test database. */
final class ChainControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private ChainClock $clock;
    private array $oldDatabase;

    protected function setUp(): void
    {
        $url = $_SERVER['CHAIN_TEST_DATABASE_URL'] ?? $_ENV['CHAIN_TEST_DATABASE_URL'] ?? getenv('CHAIN_TEST_DATABASE_URL');
        if (!$url) { self::markTestSkipped('Set CHAIN_TEST_DATABASE_URL to an isolated MySQL/MariaDB database.'); }
        $this->oldDatabase = [$_SERVER['DATABASE_URL'] ?? null, $_ENV['DATABASE_URL'] ?? null];
        $_SERVER['DATABASE_URL'] = $_ENV['DATABASE_URL'] = $url;
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        $name = $db->getDatabase();
        if (!str_starts_with($name, 'chain_check_') || !str_ends_with($name, '_test')) {
            throw new \RuntimeException('Refusing to reset a database outside the isolated chain_check_*_test namespace.');
        }
        $db->executeStatement('SET FOREIGN_KEY_CHECKS = 0');
        foreach ($db->createSchemaManager()->listTableNames() as $table) { $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table)); }
        $db->executeStatement('SET FOREIGN_KEY_CHECKS = 1');
        (new SchemaTool($this->em))->createSchema($this->em->getMetadataFactory()->getAllMetadata());
        foreach (ChainSchema::statements($db) as $sql) { $db->executeStatement($sql); }
        $this->clock = new class extends ChainClock {
            public \DateTimeImmutable $time;
            public function __construct() { $this->time = new \DateTimeImmutable('2026-10-03T12:00:00Z'); }
            public function now(): \DateTimeImmutable { return $this->time; }
        };
        static::getContainer()->set(ChainClock::class, $this->clock);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        if (isset($this->oldDatabase)) {
            [$_SERVER['DATABASE_URL'], $_ENV['DATABASE_URL']] = $this->oldDatabase;
        }
    }

    public function testThreePersonCycleRequiresEveryConfirmationAndCompletesInAnyOrder(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        self::assertSame('AWAITING_CONFIRMATIONS', $chain['status']);
        self::assertCount(3, $chain['participants']);
        self::assertSame($members[2]['offer']->getId(), $chain['participants'][0]['expectedIncomingServiceId']);
        self::assertArrayNotHasKey('email', $chain['participants'][1]['user']);
        self::assertSame($chain['id'], $this->start($members[0])['id']);
        $this->confirm($chain['id'], $members);
        $provisions = $this->agreements($chain['id'], $members);
        foreach (array_reverse($provisions) as $provision) {
            $this->as($provision['recipient']);
            $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/provisions/'.$provision['id'].'/receipt');
            self::assertResponseIsSuccessful();
        }
        self::assertSame('COMPLETED', $this->data()['chain']['status']);
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM chain_service_reservations'));
        $this->as($members[2]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/provisions/'.$provisions[0]['id'].'/receipt');
        self::assertResponseStatusCodeSame(403); // Wrong recipient cannot replay somebody else's receipt.
        $this->as($provisions[0]['recipient']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/provisions/'.$provisions[0]['id'].'/receipt');
        self::assertResponseIsSuccessful();
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/cancel', ['reason' => 'Too late']);
        self::assertResponseStatusCodeSame(409);
    }

    public function testFourPersonCycleAndMissingClosingEdge(): void
    {
        $members = $this->cycle(4);
        self::assertCount(4, $this->start($members[0])['participants']);
        $this->as($members[0]['user']);
        $this->client->jsonRequest('POST', '/api/chains/1/cancel', ['reason' => 'Reset']);
        $db = $this->em->getConnection();
        $db->delete('service_categories', ['service_id' => $members[0]['request']->getId()]);
        $this->em->clear();
        $chain = $this->start($members[0]);
        self::assertSame('SEARCHING', $chain['status']);
        self::assertCount(0, $chain['participants']);
    }

    public function testThreePersonCycleWinsOverEarlierFourPersonCycle(): void
    {
        $members = $this->cycle(4);
        $thirdOffer = $this->em->find(Service::class, $members[2]['offer']->getId());
        $closingCategory = $members[0]['request']->getCategories()->first();
        $thirdOffer->addCategory($closingCategory);
        $this->em->flush();
        $chain = $this->start($members[0]);
        self::assertCount(3, $chain['participants']);
        self::assertSame(array_map(static fn (array $m) => $m['user']->getId(), array_slice($members, 0, 3)), array_column(array_column($chain['participants'], 'user'), 'id'));
    }

    public function testLeftSwipesDoNotExcludeChainEdgesAndReservedServicesBlockDirectSwipes(): void
    {
        $members = $this->cycle(3);
        $decision = new SwipeDecision($members[0]['user'], $members[1]['user'], $members[0]['offer'], $members[0]['request'], $members[1]['offer'], $members[1]['request'], 'LEFT');
        $this->em->persist($decision);
        $this->em->flush();
        $chain = $this->start($members[0]);
        self::assertCount(3, $chain['participants']);
        // Make a new direct candidate after reservation; even this fresh combination must be rejected.
        $newUser = $this->user('newcomer');
        $offer = $this->service($newUser, 'OFFER', $members[0]['request']->getCategories()->first());
        $request = $this->service($newUser, 'REQUEST', $members[0]['offer']->getCategories()->first());
        $this->as($members[0]['user']);
        $this->client->request('GET', '/api/swipes');
        self::assertCount(0, $this->data()['candidates']);
        $this->client->jsonRequest('POST', '/api/swipes', ['direction' => 'RIGHT', 'actorOfferServiceId' => $members[0]['offer']->getId(), 'actorRequestServiceId' => $members[0]['request']->getId(), 'candidateOfferServiceId' => $offer->getId(), 'candidateRequestServiceId' => $request->getId()]);
        self::assertResponseStatusCodeSame(409);
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM proposals'));
    }

    public function testDirectCandidateAndPendingProposalPreventStart(): void
    {
        $members = $this->cycle(3);
        $other = $this->user('direct');
        $offer = $this->service($other, 'OFFER', $members[0]['request']->getCategories()->first());
        $request = $this->service($other, 'REQUEST', $members[0]['offer']->getCategories()->first());
        $this->as($members[0]['user']);
        $payload = ['offeredServiceId' => $members[0]['offer']->getId(), 'requestedServiceId' => $members[0]['request']->getId()];
        $this->client->jsonRequest('POST', '/api/chains', $payload);
        self::assertResponseStatusCodeSame(409);
        $this->client->jsonRequest('POST', '/api/swipes', ['direction' => 'RIGHT', 'actorOfferServiceId' => $payload['offeredServiceId'], 'actorRequestServiceId' => $payload['requestedServiceId'], 'candidateOfferServiceId' => $offer->getId(), 'candidateRequestServiceId' => $request->getId()]);
        self::assertResponseStatusCodeSame(201);
        $this->client->jsonRequest('POST', '/api/chains', $payload);
        self::assertResponseStatusCodeSame(409);
    }

    public function testDeadlinesAreEnforcedWithoutSchedulerAndIssueNoTokens(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $this->clock->time = $this->clock->time->modify('+24 hours');
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseStatusCodeSame(409);
        $this->client->request('GET', '/api/chains/'.$chain['id']);
        self::assertSame('CONFIRMATION_EXPIRED', $this->data()['chain']['cancellationReason']);
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM tokens'));
        $this->em->getConnection()->delete('service_categories', ['service_id' => $members[0]['request']->getId()]);
        $this->em->clear();
        $chain = $this->start($members[0]);
        self::assertSame('SEARCHING', $chain['status']);
        $this->clock->time = $this->clock->time->modify('+3 hours');
        static::getContainer()->get(ChainService::class)->processDue();
        $this->client->request('GET', '/api/chains/'.$chain['id']);
        self::assertSame('SEARCH_EXPIRED', $this->data()['chain']['cancellationReason']);
    }

    public function testCancellationCompensatesOnlyOtherRecipientsWhoHaveNotReceived(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $this->confirm($chain['id'], $members);
        $provisions = $this->agreements($chain['id'], $members);
        $this->as($members[1]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/provisions/'.$provisions[0]['id'].'/receipt');
        self::assertResponseIsSuccessful();
        $this->as($members[0]['user']);
        foreach ([1, 2] as $retry) {
            $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/cancel', ['reason' => 'Cannot continue', 'cancelledByUserId' => $members[2]['user']->getId()]);
            self::assertResponseIsSuccessful();
        }
        $tokens = $this->em->getConnection()->fetchAllAssociative('SELECT * FROM tokens');
        self::assertCount(1, $tokens);
        self::assertSame($members[2]['user']->getId(), (int) $tokens[0]['user_id']);
        self::assertSame('2026-11-02 12:00:00', $tokens[0]['expiration_date']);
        self::assertSame($members[0]['user']->getId(), $this->data()['chain']['cancelledByUserId']);
        $this->as($members[2]['user']);
        $this->client->request('GET', '/api/tokens');
        self::assertCount(1, $this->data()['tokens']);
        self::assertFalse($this->data()['tokens'][0]['expired']);
        $this->clock->time = $this->clock->time->modify('+30 days');
        $this->client->request('GET', '/api/tokens');
        self::assertTrue($this->data()['tokens'][0]['expired']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/provisions/'.$provisions[1]['id'].'/receipt');
        self::assertResponseStatusCodeSame(409);
    }

    public function testCancellationWithoutReceiptsAndGroupRejection(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $this->confirm($chain['id'], $members);
        $this->as($members[0]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/cancel', ['reason' => 'Stop']);
        self::assertResponseIsSuccessful();
        self::assertSame(2, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM tokens'));
        $chain = $this->start($members[0]);
        $this->as($members[1]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/decision', ['decision' => 'REJECT']);
        self::assertSame('CANCELLED', $this->data()['chain']['status']);
        self::assertSame(2, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM tokens'));
    }

    public function testAgreementRejectionAllowsReplacementAndAuthorizationIsEnforced(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $this->confirm($chain['id'], $members);
        $terms = ['recipientUserId' => $members[1]['user']->getId(), 'location' => 'Library', 'startAt' => '2026-10-04T12:00:00Z'];
        $this->as($members[0]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/agreements', $terms);
        $agreement = $this->data()['agreement']['id'];
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/agreements/'.$agreement.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseStatusCodeSame(403);
        $this->as($members[1]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/agreements/'.$agreement.'/decision', ['decision' => 'REJECT']);
        self::assertResponseIsSuccessful();
        $this->as($members[0]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/agreements', $terms);
        self::assertSame($agreement, $this->data()['agreement']['id']);
        self::assertSame('REJECTED', $this->data()['agreement']['status']);
        $terms['location'] = 'Park';
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/agreements', $terms);
        self::assertResponseStatusCodeSame(201);
        self::assertNotSame($agreement, $this->data()['agreement']['id']);
        $outsider = $this->user('outsider');
        $this->as($outsider);
        $this->client->request('GET', '/api/chains/'.$chain['id']);
        self::assertResponseStatusCodeSame(403);
        $this->client->request('GET', '/api/chains');
        self::assertCount(0, $this->data()['chains']);
    }

    public function testInactiveUsersOwnershipAndInvalidInputs(): void
    {
        $members = $this->cycle(3);
        $this->as($members[0]['user']);
        $this->client->jsonRequest('POST', '/api/chains', ['offeredServiceId' => $members[1]['offer']->getId(), 'requestedServiceId' => $members[0]['request']->getId()]);
        self::assertResponseStatusCodeSame(400);
        $this->client->request('POST', '/api/chains', content: '{bad');
        self::assertResponseStatusCodeSame(400);
        $this->em->getConnection()->update('users', ['account_status' => 'INACTIVE'], ['id' => $members[1]['user']->getId()]);
        $this->em->clear();
        self::assertSame('SEARCHING', $this->start($members[0])['status']);
        $this->as($members[1]['user']);
        $this->client->request('GET', '/api/chains');
        self::assertResponseStatusCodeSame(403);
    }

    public function testConcurrentStartsAndCancellationsProduceOneChainAndOneTokenPerRecipient(): void
    {
        $members = $this->cycle(3);
        $payload = ['action' => 'start', 'userId' => $members[0]['user']->getId(), 'offerId' => $members[0]['offer']->getId(), 'requestId' => $members[0]['request']->getId()];
        $results = $this->workers([$payload, $payload]);
        self::assertSame($results[0]['id'], $results[1]['id']);
        $db = $this->em->getConnection();
        self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM proposal_groups'));
        self::assertSame(3, (int) $db->fetchOne('SELECT COUNT(*) FROM group_participants'));
        self::assertSame(6, (int) $db->fetchOne('SELECT COUNT(*) FROM chain_service_reservations'));
        $this->confirm($results[0]['id'], $members);
        $payload = ['action' => 'cancel', 'userId' => $members[0]['user']->getId(), 'chainId' => $results[0]['id']];
        $results = $this->workers([$payload, $payload]);
        self::assertSame('CANCELLED', $results[0]['status']);
        self::assertSame('CANCELLED', $results[1]['status']);
        self::assertSame(2, (int) $db->fetchOne('SELECT COUNT(*) FROM tokens'));
    }

    public function testConcurrentReceiptAndCancellationKeepCompensationConsistent(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $this->confirm($chain['id'], $members);
        $provisions = $this->agreements($chain['id'], $members);
        $this->workers([
            ['action' => 'receipt', 'userId' => $members[1]['user']->getId(), 'chainId' => $chain['id'], 'provisionId' => $provisions[0]['id']],
            ['action' => 'cancel', 'userId' => $members[0]['user']->getId(), 'chainId' => $chain['id']],
        ]);
        $db = $this->em->getConnection();
        $received = $db->fetchOne('SELECT received_at FROM service_provision WHERE id = ?', [$provisions[0]['id']]);
        $tokenForRecipient = (int) $db->fetchOne('SELECT COUNT(*) FROM tokens WHERE user_id = ?', [$members[1]['user']->getId()]);
        self::assertSame($received === null ? 1 : 0, $tokenForRecipient);
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM tokens WHERE user_id = ?', [$members[0]['user']->getId()]));
        self::assertSame('CANCELLED', $db->fetchOne('SELECT application_status FROM proposal_groups WHERE id = ?', [$chain['id']]));
    }

    public function testConcurrentDirectSwipeAndChainCannotReserveTheSameServices(): void
    {
        $members = $this->cycle(3);
        $other = $this->user('racingdirect');
        $offer = $this->service($other, 'OFFER', $members[0]['request']->getCategories()->first());
        $request = $this->service($other, 'REQUEST', $members[0]['offer']->getCategories()->first());
        // Alice rejected this direct combination. The other person can still initiate its reverse.
        $left = new SwipeDecision($members[0]['user'], $other, $members[0]['offer'], $members[0]['request'], $offer, $request, 'LEFT');
        $this->em->persist($left);
        $this->em->flush();
        $results = $this->workers([
            ['action' => 'start', 'userId' => $members[0]['user']->getId(), 'offerId' => $members[0]['offer']->getId(), 'requestId' => $members[0]['request']->getId()],
            ['action' => 'swipe', 'userId' => $other->getId(), 'payload' => ['direction' => 'RIGHT', 'actorOfferServiceId' => $offer->getId(), 'actorRequestServiceId' => $request->getId(), 'candidateOfferServiceId' => $members[0]['offer']->getId(), 'candidateRequestServiceId' => $members[0]['request']->getId()]],
        ]);
        self::assertContains($results[1]['statusCode'], [201, 409]);
        $db = $this->em->getConnection();
        $proposals = (int) $db->fetchOne('SELECT COUNT(*) FROM proposals');
        $reserved = (int) $db->fetchOne('SELECT COUNT(*) FROM chain_service_reservations');
        self::assertTrue($proposals === 0 || $reserved === 0, 'A direct proposal and chain must never hold the same service.');
    }

    public function testScheduledSearchCancelsWhenADirectCandidateAppears(): void
    {
        $members = $this->cycle(3);
        $db = $this->em->getConnection();
        $db->delete('service_categories', ['service_id' => $members[0]['request']->getId()]);
        $this->em->clear();
        $chain = $this->start($members[0]);
        self::assertSame('SEARCHING', $chain['status']);
        $offer = $this->em->find(Service::class, $members[0]['offer']->getId());
        $request = $this->em->find(Service::class, $members[0]['request']->getId());
        $closingCategory = $this->em->find(Category::class, $members[2]['offer']->getCategories()->first()->getId());
        $request->addCategory($closingCategory);
        $newUser = $this->user('newdirect');
        $this->service($newUser, 'OFFER', $closingCategory);
        $this->service($newUser, 'REQUEST', $offer->getCategories()->first());
        $this->em->flush();
        $this->clock->time = $this->clock->time->modify('+1 minute');
        static::getContainer()->get(ChainService::class)->processDue();
        $this->client->request('GET', '/api/chains/'.$chain['id']);
        self::assertSame('DIRECT_PATH_AVAILABLE', $this->data()['chain']['cancellationReason']);
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM chain_service_reservations'));
    }

    public function testConfirmedChainDoesNotExpireAndConflictingDecisionsFail(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $this->confirm($chain['id'], $members);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseIsSuccessful();
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/decision', ['decision' => 'REJECT']);
        self::assertResponseStatusCodeSame(409);
        $this->clock->time = $this->clock->time->modify('+40 days');
        static::getContainer()->get(ChainService::class)->processDue();
        $this->client->request('GET', '/api/chains/'.$chain['id']);
        self::assertSame('CONFIRMED', $this->data()['chain']['status']);
        self::assertSame(6, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM chain_service_reservations'));
    }

    private function workers(array $payloads): array
    {
        $gate = dirname(__DIR__, 2).'/var/chain-gate-'.bin2hex(random_bytes(8));
        $url = $_SERVER['CHAIN_TEST_DATABASE_URL'] ?? $_ENV['CHAIN_TEST_DATABASE_URL'];
        $processes = [];
        foreach ($payloads as $payload) {
            $payload['gate'] = $gate;
            $process = new Process([PHP_BINARY, 'tests/Support/chain-worker.php', json_encode($payload)], dirname(__DIR__, 2), ['DATABASE_URL' => $url, 'APP_ENV' => 'test', 'SYMFONY_DOTENV_VARS' => false]);
            $process->start();
            $processes[] = $process;
        }
        touch($gate);
        try {
            $results = [];
            foreach ($processes as $process) {
                $process->wait();
                self::assertTrue($process->isSuccessful(), $process->getErrorOutput());
                $results[] = json_decode(trim($process->getOutput()), true, flags: JSON_THROW_ON_ERROR);
            }
            return $results;
        } finally { unlink($gate); }
    }

    public function testRequestsInAChainCannotBeChangedOrDeletedEvenAfterCancellation(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $requestId = $members[0]['request']->getId();
        $this->as($members[0]['user']);

        $this->client->jsonRequest('PATCH', '/api/requests/'.$requestId, ['description' => 'Changed']);
        self::assertResponseStatusCodeSame(409);
        $this->client->request('DELETE', '/api/requests/'.$requestId);
        self::assertResponseStatusCodeSame(409);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/cancel', ['reason' => 'Test cancellation']);
        self::assertResponseIsSuccessful();
        $this->client->jsonRequest('PATCH', '/api/requests/'.$requestId, ['description' => 'Still blocked']);
        self::assertResponseStatusCodeSame(409);
        $this->client->request('DELETE', '/api/requests/'.$requestId);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('REQUEST service', $this->em->find(Service::class, $requestId)->getDescription());
    }

    public function testStaffCanManageManualTokensAndPersonalListsStayPrivate(): void
    {
        $owner = $this->user('token-owner');
        $staff = $this->user('token-staff');
        $staff->setRoles([User::ROLE_STAFF]);
        $this->em->flush();
        $this->as($staff);
        $this->client->jsonRequest('POST', '/api/staff/tokens', ['userId' => $owner->getId()]);
        self::assertResponseStatusCodeSame(201);
        $token = $this->data()['token'];
        self::assertSame($owner->getId(), $token['userId']);
        self::assertNull($token['chainId']);
        self::assertSame('2026-10-03T12:00:00+00:00', $token['issuedAt']);
        self::assertSame('2026-11-02T12:00:00+00:00', $token['expiresAt']);
        self::assertFalse($token['expired']);
        $path = '/api/staff/tokens/'.$token['id'];

        $this->client->jsonRequest('PUT', $path, ['expiresAt' => '2026-11-10T14:30:00+02:00']);
        self::assertResponseStatusCodeSame(200);
        self::assertSame('2026-11-10T12:30:00+00:00', $this->data()['token']['expiresAt']);
        $this->client->jsonRequest('PATCH', $path, ['expiresAt' => '2026-10-03T12:00:00Z']);
        self::assertResponseStatusCodeSame(200);
        self::assertTrue($this->data()['token']['expired']);
        $this->client->jsonRequest('PATCH', $path, ['expiresAt' => '2026-10-01T00:00:00Z']);
        self::assertResponseStatusCodeSame(200);
        self::assertTrue($this->data()['token']['expired']);
        self::assertSame($token['issuedAt'], $this->data()['token']['issuedAt']);

        $this->client->request('GET', '/api/tokens');
        self::assertSame([], $this->data()['tokens']);
        $this->as($owner);
        $this->client->request('GET', '/api/tokens');
        self::assertCount(1, $this->data()['tokens']);
        self::assertSame($token['id'], $this->data()['tokens'][0]['id']);
        self::assertTrue($this->data()['tokens'][0]['expired']);
        self::assertArrayNotHasKey('userId', $this->data()['tokens'][0]);

        $this->as($staff);
        $this->client->request('DELETE', $path);
        self::assertResponseStatusCodeSame(204);
        self::assertSame('', $this->client->getResponse()->getContent());
        foreach (['PUT', 'PATCH', 'DELETE'] as $method) {
            $this->client->jsonRequest($method, $path, ['expiresAt' => '2026-11-01T00:00:00Z']);
            self::assertResponseStatusCodeSame(404);
        }
        $this->as($owner);
        $this->client->request('GET', '/api/tokens');
        self::assertSame([], $this->data()['tokens']);
    }

    public function testManualTokensAcceptExistingChainsAndInactiveRecipientsButRejectDuplicates(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $staff = $this->user('manual-staff');
        $staff->setRoles([User::ROLE_STAFF]);
        $members[1]['user']->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        $this->as($staff);
        $payload = ['userId' => $members[1]['user']->getId(), 'chainId' => $chain['id']];
        // Manual assignment does not require a cancelled or confirmed chain.
        $this->client->jsonRequest('POST', '/api/staff/tokens', $payload);
        self::assertResponseStatusCodeSame(201);
        self::assertSame($chain['id'], $this->data()['token']['chainId']);
        $this->client->jsonRequest('POST', '/api/staff/tokens', $payload);
        self::assertResponseStatusCodeSame(409);
        foreach ([1, 2] as $attempt) {
            $this->client->jsonRequest('POST', '/api/staff/tokens', ['userId' => $members[1]['user']->getId(), 'chainId' => null]);
            self::assertResponseStatusCodeSame(201);
        }
        $this->client->jsonRequest('POST', '/api/staff/tokens', ['userId' => 999999]);
        self::assertResponseStatusCodeSame(404);
        $this->client->jsonRequest('POST', '/api/staff/tokens', ['userId' => $staff->getId(), 'chainId' => 999999]);
        self::assertResponseStatusCodeSame(404);
    }

    public function testManualTokenDoesNotBlockAutomaticCompensationOnCancellation(): void
    {
        $members = $this->cycle(3);
        $chain = $this->start($members[0]);
        $this->confirm($chain['id'], $members);
        $staff = $this->user('compensation-staff');
        $staff->setRoles([User::ROLE_STAFF]);
        $this->em->flush();
        $this->as($staff);
        $this->client->jsonRequest('POST', '/api/staff/tokens', ['userId' => $members[1]['user']->getId(), 'chainId' => $chain['id']]);
        self::assertResponseStatusCodeSame(201);
        $manual = $this->data()['token'];
        $this->as($members[0]['user']);
        $this->client->jsonRequest('POST', '/api/chains/'.$chain['id'].'/cancel', ['reason' => 'Cannot continue']);
        self::assertResponseStatusCodeSame(200);
        self::assertSame('CANCELLED', $this->data()['chain']['status']);
        self::assertSame(2, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM tokens WHERE group_id = ?', [$chain['id']]));
        $this->as($members[1]['user']);
        $this->client->request('GET', '/api/tokens');
        self::assertCount(1, $this->data()['tokens']);
        self::assertSame($manual['id'], $this->data()['tokens'][0]['id']);
        self::assertSame($manual['expiresAt'], $this->data()['tokens'][0]['expiresAt']);
    }

    public function testStaffTokenValidationRejectsInvalidBodiesAndImmutableFields(): void
    {
        $staff = $this->user('validation-staff');
        $staff->setRoles([User::ROLE_STAFF]);
        $this->em->flush();
        $this->as($staff);
        foreach ([[], ['userId' => '1'], ['userId' => 0], ['userId' => true], ['userId' => $staff->getId(), 'chainId' => '1'], ['userId' => $staff->getId(), 'expiresAt' => '2026-11-01T00:00:00Z']] as $body) {
            $this->client->jsonRequest('POST', '/api/staff/tokens', $body);
            self::assertResponseStatusCodeSame(400);
        }
        $this->client->jsonRequest('POST', '/api/staff/tokens', ['userId' => $staff->getId()]);
        self::assertResponseStatusCodeSame(201);
        $original = $this->data()['token'];
        $path = '/api/staff/tokens/'.$original['id'];
        foreach (['PUT', 'PATCH'] as $method) {
            foreach ([[], ['userId' => $staff->getId()], ['chainId' => null], ['issuedAt' => '2026-10-01T00:00:00Z'], ['expiresAt' => null], ['expiresAt' => '2026-02-30T12:00:00Z'], ['expiresAt' => '2026-11-01T12:00:00'], ['expiresAt' => '2026-11-01T12:00:00+25:00']] as $body) {
                $this->client->jsonRequest($method, $path, $body);
                self::assertResponseStatusCodeSame(400);
            }
            foreach (['{', 'null', '[]', '"text"'] as $body) {
                $this->client->request($method, $path, server: ['CONTENT_TYPE' => 'application/json'], content: $body);
                self::assertResponseStatusCodeSame(400);
            }
        }
        $this->client->request('GET', '/api/tokens');
        self::assertSame($original['expiresAt'], $this->data()['tokens'][0]['expiresAt']);
        foreach (['0000-01-01T00:00:00Z', '1000-01-01T00:00:00+01:00', '9999-12-31T23:59:59-01:00'] as $date) {
            $this->client->jsonRequest('PATCH', $path, ['expiresAt' => $date]);
            self::assertResponseStatusCodeSame(400);
        }
    }

    public function testTokenWritesRequireAnActiveStaffAccount(): void
    {
        $user = $this->user('permissions-user');
        $staff = $this->user('inactive-token-staff');
        $staff->setRoles([User::ROLE_STAFF]);
        $staff->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        foreach ([null, $user, $staff] as $actor) {
            $this->client->setServerParameter('HTTP_AUTHORIZATION', '');
            if ($actor !== null) { $this->as($actor); }
            foreach (['POST', 'PUT', 'PATCH', 'DELETE'] as $method) {
                $path = '/api/staff/tokens'.($method === 'POST' ? '' : '/999999');
                $this->client->jsonRequest($method, $path, ['userId' => $user->getId()]);
                self::assertResponseStatusCodeSame($actor === null ? 401 : 403);
            }
        }
    }

    public function testSuspensionBlocksChainStartsAndCandidatesUntilReactivation(): void
    {
        $members = $this->cycle(3);
        foreach (['offer' => 'offers', 'request' => 'requests'] as $key => $resource) {
            $this->as($members[0]['user']);
            $path = '/api/'.$resource.'/'.$members[0][$key]->getId();
            $this->client->jsonRequest('PATCH', $path, ['isSuspended' => true]);
            self::assertResponseIsSuccessful();
            $this->client->jsonRequest('POST', '/api/chains', ['offeredServiceId' => $members[0]['offer']->getId(), 'requestedServiceId' => $members[0]['request']->getId()]);
            self::assertResponseStatusCodeSame(409);
            $this->client->jsonRequest('PATCH', $path, ['isSuspended' => false]);
            self::assertResponseIsSuccessful();
        }
        self::assertSame(0, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM proposal_groups'));

        $this->as($members[1]['user']);
        foreach (['offer' => 'offers', 'request' => 'requests'] as $key => $resource) {
            $this->client->jsonRequest('PATCH', '/api/'.$resource.'/'.$members[1][$key]->getId(), ['isSuspended' => true]);
            self::assertResponseIsSuccessful();
        }
        $chain = $this->start($members[0]);
        self::assertSame('SEARCHING', $chain['status']);
        $this->client->jsonRequest('PATCH', '/api/offers/'.$members[0]['offer']->getId(), ['isSuspended' => true]);
        self::assertResponseStatusCodeSame(409);
        foreach (['offer' => 'offers', 'request' => 'requests'] as $key => $resource) {
            $this->as($members[1]['user']);
            $this->client->jsonRequest('PATCH', '/api/'.$resource.'/'.$members[1][$key]->getId(), ['isSuspended' => false]);
            self::assertResponseIsSuccessful();
            $this->clock->time = $this->clock->time->modify('+10 minutes');
            static::getContainer()->get(ChainService::class)->process($chain['id']);
            // Only the initiator can inspect a search before its candidates become participants.
            $this->as($members[0]['user']);
            $this->client->request('GET', '/api/chains/'.$chain['id']);
            self::assertResponseIsSuccessful();
            self::assertSame($key === 'offer' ? 'SEARCHING' : 'AWAITING_CONFIRMATIONS', $this->data()['chain']['status']);
        }
        $this->as($members[1]['user']);
        $this->client->jsonRequest('PATCH', '/api/requests/'.$members[1]['request']->getId(), ['isSuspended' => true]);
        self::assertResponseStatusCodeSame(409);
    }

    public function testMatchingReadsSuspensionFromDatabaseEvenWithLoadedEntities(): void
    {
        $members = $this->cycle(3);
        $matcher = static::getContainer()->get(\App\Service\ChainMatcher::class);
        $db = $this->em->getConnection();
        self::assertCount(3, $matcher->find($members[0]['offer'], $members[0]['request']));
        foreach ($members as $member) {
            foreach (['offer', 'request'] as $key) {
                $id = $member[$key]->getId();
                $db->update('services', ['is_suspended' => 1], ['id' => $id]);
                self::assertSame([], $matcher->find($members[0]['offer'], $members[0]['request']));
                $db->update('services', ['is_suspended' => 0], ['id' => $id]);
            }
        }
        $direct = $this->user('direct');
        $offer = $this->service($direct, 'OFFER', $members[0]['request']->getCategories()->first());
        $request = $this->service($direct, 'REQUEST', $members[0]['offer']->getCategories()->first());
        foreach ([$members[0]['offer'], $members[0]['request'], $offer, $request] as $service) {
            self::assertTrue($matcher->directAvailable($members[0]['offer'], $members[0]['request']));
            $db->update('services', ['is_suspended' => 1], ['id' => $service->getId()]);
            self::assertFalse($matcher->directAvailable($members[0]['offer'], $members[0]['request']));
            $db->update('services', ['is_suspended' => 0], ['id' => $service->getId()]);
        }
    }

    public static function suspensionTargets(): array
    {
        return [[0, 'offer', 'offers'], [0, 'request', 'requests'], [1, 'offer', 'offers'], [1, 'request', 'requests']];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('suspensionTargets')]
    public function testConcurrentSuspensionAndChainNeverReserveSuspendedServices(int $index, string $key, string $resource): void
    {
        $members = $this->cycle(3);
        $results = $this->workers([
            ['action' => 'start', 'userId' => $members[0]['user']->getId(), 'offerId' => $members[0]['offer']->getId(), 'requestId' => $members[0]['request']->getId()],
            ['action' => 'suspend', 'userId' => $members[$index]['user']->getId(), 'serviceId' => $members[$index][$key]->getId(), 'resource' => $resource, 'payload' => ['isSuspended' => true]],
        ]);
        self::assertContains($results[1]['statusCode'], [200, 409]);
        $db = $this->em->getConnection();
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM chain_service_reservations r JOIN services s ON s.id = r.service_id WHERE s.is_suspended = 1'));
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM proposal_groups g JOIN services s ON s.id IN (g.offered_service_id, g.requested_service_id) WHERE s.is_suspended = 1'));
        if ($index === 0 && $results[1]['statusCode'] === 200) {
            self::assertSame(409, $results[0]['statusCode']);
        } else {
            self::assertArrayHasKey('id', $results[0]);
        }
    }

    public function testConcurrentSuspensionAndDirectSwipeCannotCreateAProposalForASuspendedService(): void
    {
        $members = $this->cycle(2);
        $results = $this->workers([
            ['action' => 'swipe', 'userId' => $members[0]['user']->getId(), 'payload' => [
                'direction' => 'RIGHT', 'actorOfferServiceId' => $members[0]['offer']->getId(), 'actorRequestServiceId' => $members[0]['request']->getId(),
                'candidateOfferServiceId' => $members[1]['offer']->getId(), 'candidateRequestServiceId' => $members[1]['request']->getId(),
            ]],
            ['action' => 'suspend', 'userId' => $members[1]['user']->getId(), 'serviceId' => $members[1]['request']->getId(), 'resource' => 'requests', 'payload' => ['isSuspended' => true]],
        ]);
        self::assertContains($results[0]['statusCode'], [201, 409]);
        self::assertContains($results[1]['statusCode'], [200, 409]);
        self::assertTrue($results[0]['statusCode'] === 409 || $results[1]['statusCode'] === 409);
        $db = $this->em->getConnection();
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM swipe_decisions d JOIN services s ON s.id IN (d.actor_offer_id, d.actor_request_id, d.candidate_offer_id, d.candidate_request_id) WHERE d.proposal_id IS NOT NULL AND s.is_suspended = 1'));
    }

    private function cycle(int $length): array
    {
        $categories = [];
        for ($i = 0; $i < $length; ++$i) { $categories[] = new Category('Category '.$i); $this->em->persist($categories[$i]); }
        $this->em->flush();
        $members = [];
        for ($i = 0; $i < $length; ++$i) {
            $user = $this->user('member'.$i);
            $members[] = ['user' => $user, 'offer' => $this->service($user, 'OFFER', $categories[$i]), 'request' => $this->service($user, 'REQUEST', $categories[($i + $length - 1) % $length])];
        }
        return $members;
    }
    private function user(string $username): User
    {
        $user = new User('Test', 'User', $username, $username.'@example.test');
        $user->setPassword('unused-password-hash');
        $this->em->persist($user); $this->em->flush();
        return $user;
    }
    private function service(User $user, string $type, Category $category): Service
    {
        $service = new Service($user, $type, $type.' service');
        $service->addCategory($category); $this->em->persist($service); $this->em->flush();
        return $service;
    }
    private function as(User $user): void
    {
        $jwt = static::getContainer()->get(JWTTokenManagerInterface::class);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$jwt->create($user));
    }
    private function start(array $member): array
    {
        $this->as($member['user']);
        $this->client->jsonRequest('POST', '/api/chains', ['offeredServiceId' => $member['offer']->getId(), 'requestedServiceId' => $member['request']->getId()]);
        self::assertResponseStatusCodeSame(201);
        return $this->data()['chain'];
    }
    private function confirm(int $id, array $members): void
    {
        foreach ($members as $position => $member) {
            $this->as($member['user']);
            $this->client->jsonRequest('POST', '/api/chains/'.$id.'/decision', ['decision' => 'ACCEPT']);
            self::assertResponseIsSuccessful();
            self::assertSame($position === count($members) - 1 ? 'CONFIRMED' : 'AWAITING_CONFIRMATIONS', $this->data()['chain']['status']);
        }
    }
    private function agreements(int $id, array $members): array
    {
        $provisions = [];
        foreach ($members as $position => $member) {
            $recipient = $members[($position + 1) % count($members)]['user'];
            $this->as($member['user']);
            $terms = ['recipientUserId' => $recipient->getId(), 'location' => 'Library', 'startAt' => '2026-10-04T12:00:00Z'];
            $this->client->jsonRequest('POST', '/api/chains/'.$id.'/agreements', $terms);
            self::assertResponseStatusCodeSame(201);
            $agreement = $this->data()['agreement']['id'];
            $this->client->jsonRequest('POST', '/api/chains/'.$id.'/agreements', $terms);
            self::assertSame($agreement, $this->data()['agreement']['id']);
            $this->as($recipient);
            foreach ([1, 2] as $retry) {
                $this->client->jsonRequest('POST', '/api/chains/'.$id.'/agreements/'.$agreement.'/decision', ['decision' => 'ACCEPT']);
                self::assertResponseIsSuccessful();
            }
            $this->client->request('GET', '/api/chains/'.$id);
            $created = array_values(array_filter($this->data()['chain']['provisions'], static fn (array $p) => $p['agreementId'] === $agreement));
            self::assertCount(1, $created);
            $provisions[] = ['id' => $created[0]['id'], 'recipient' => $recipient];
        }
        return $provisions;
    }
    private function data(): array { return json_decode($this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR); }
}
