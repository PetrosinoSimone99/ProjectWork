<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Category;
use App\Entity\Proposal;
use App\Entity\ProposalParticipant;
use App\Entity\Service;
use App\Entity\User;
use App\Repository\ChainRepository;
use App\Repository\ChainSchema;
use App\Service\ChainClock;
use App\Tests\Support\TokenRedemptionTestSchema;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Process\Process;

/** Real transactions and locks are tested only in a disposable token_check_*_test database. */
final class TokenRedemptionControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;
    private ChainClock $clock;
    private User $recipient;
    private User $provider;
    private User $other;
    private Service $offer;
    private int $tokenId;
    private string $url;
    private array $oldDatabase;

    protected function setUp(): void
    {
        $url = $_SERVER['TOKEN_TEST_DATABASE_URL'] ?? $_ENV['TOKEN_TEST_DATABASE_URL'] ?? getenv('TOKEN_TEST_DATABASE_URL');
        if (!$url) { self::markTestSkipped('Set TOKEN_TEST_DATABASE_URL to an isolated MySQL token_check_* database (without the _test suffix).'); }
        $this->url = $url;
        $this->oldDatabase = [$_SERVER['DATABASE_URL'] ?? null, $_ENV['DATABASE_URL'] ?? null];
        $_SERVER['DATABASE_URL'] = $_ENV['DATABASE_URL'] = $url;
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        $name = (string) $db->getDatabase();
        if (!str_starts_with($name, 'token_check_') || !str_ends_with($name, '_test')) {
            throw new \RuntimeException('Refusing to reset a database outside token_check_*_test.');
        }
        $db->executeStatement('SET FOREIGN_KEY_CHECKS = 0');
        foreach ($db->createSchemaManager()->listTableNames() as $table) { $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table)); }
        $db->executeStatement('SET FOREIGN_KEY_CHECKS = 1');
        (new SchemaTool($this->em))->createSchema($this->em->getMetadataFactory()->getAllMetadata());
        foreach (ChainSchema::statements($db) as $sql) { $db->executeStatement($sql); }
        $db->executeStatement('ALTER TABLE tokens ADD deleted_at DATETIME DEFAULT NULL');
        TokenRedemptionTestSchema::apply($db);
        $this->clock = new class extends ChainClock {
            public \DateTimeImmutable $time;
            public function __construct() { $this->time = new \DateTimeImmutable('2026-10-18T12:00:00Z'); }
            public function now(): \DateTimeImmutable { return $this->time; }
        };
        static::getContainer()->set(ChainClock::class, $this->clock);
        $this->recipient = $this->user('recipient');
        $this->provider = $this->user('provider');
        $this->other = $this->user('other');
        $this->offer = $this->service($this->provider);
        $this->tokenId = $this->token($this->recipient);
        $this->as($this->recipient);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        if (isset($this->oldDatabase)) { [$_SERVER['DATABASE_URL'], $_ENV['DATABASE_URL']] = $this->oldDatabase; }
    }

    public function testCompleteLifecycleAndRetries(): void
    {
        $id = $this->reserve();
        self::assertSame('RESERVED', $this->data()['token']['status']);
        self::assertSame('PENDING', $this->data()['redemption']['status']);
        self::assertSame($this->offer->getId(), $this->data()['token']['serviceId']);
        $this->send('POST', '/api/token-redemptions/'.$id.'/receipt');
        self::assertResponseStatusCodeSame(409);
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseIsSuccessful();
        $accepted = $this->data();
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        self::assertSame($accepted, $this->data());
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/receipt');
        self::assertResponseIsSuccessful();
        $completed = $this->data();
        self::assertSame('SPENT', $completed['token']['status']);
        self::assertSame('COMPLETED', $completed['redemption']['status']);
        self::assertSame('2026-10-18T12:00:00+00:00', $completed['token']['spentAt']);
        $this->send('POST', '/api/token-redemptions/'.$id.'/receipt');
        self::assertSame($completed, $this->data());
        $this->send('POST', '/api/token-redemptions/'.$id.'/cancel');
        self::assertResponseStatusCodeSame(409);
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
        $this->send('GET', '/api/tokens');
        self::assertSame($completed['token'], $this->data()['tokens'][0]);
        self::assertFalse(static::getContainer()->get(ChainRepository::class)->reserved($this->offer->getId()));
        $this->as($this->provider);
        $this->send('PATCH', '/api/offers/'.$this->offer->getId(), ['description' => 'Available again']);
        self::assertResponseIsSuccessful();
    }

    public function testRejectionCancellationAndHistoryAfterReuse(): void
    {
        $first = $this->reserve();
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$first.'/decision', ['decision' => 'REJECT']);
        self::assertSame('AVAILABLE', $this->data()['token']['status']);
        self::assertNull($this->data()['token']['serviceId']);
        self::assertNull($this->data()['token']['redemptionId']);
        $this->send('POST', '/api/token-redemptions/'.$first.'/decision', ['decision' => 'REJECT']);
        self::assertResponseIsSuccessful();
        $this->as($this->recipient);
        $second = $this->reserve();
        self::assertNotSame($first, $second);
        // Retrying an old rejection must not release the new reservation.
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$first.'/decision', ['decision' => 'REJECT']);
        self::assertSame('RESERVED', $this->data()['token']['status']);
        self::assertSame($second, $this->data()['token']['redemptionId']);
        $this->send('POST', '/api/token-redemptions/'.$second.'/decision', ['decision' => 'ACCEPT']);
        $this->send('POST', '/api/token-redemptions/'.$second.'/cancel');
        self::assertSame('AVAILABLE', $this->data()['token']['status']);
        $this->send('POST', '/api/token-redemptions/'.$second.'/cancel');
        self::assertResponseIsSuccessful();
        $this->as($this->recipient);
        $third = $this->reserve();
        $this->send('POST', '/api/token-redemptions/'.$third.'/cancel');
        self::assertSame('AVAILABLE', $this->data()['token']['status']);
        foreach ([$this->recipient, $this->provider] as $user) {
            $this->as($user);
            $this->send('GET', '/api/token-redemptions');
            self::assertSame(['CANCELLED', 'CANCELLED', 'REJECTED'], array_column($this->data()['redemptions'], 'status'));
            $this->send('GET', '/api/token-redemptions/'.$first);
            self::assertSame('REJECTED', $this->data()['redemption']['status']);
        }
        $this->as($this->other);
        $this->send('GET', '/api/token-redemptions');
        self::assertSame([], $this->data()['redemptions']);
    }

    public function testExpirationDoesNotInterruptReservedService(): void
    {
        $id = $this->reserve();
        $this->clock->time = new \DateTimeImmutable('2026-12-01T12:00:00Z');
        $this->send('GET', '/api/tokens');
        self::assertTrue($this->data()['tokens'][0]['expired']);
        self::assertSame('RESERVED', $this->data()['tokens'][0]['status']);
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseIsSuccessful();
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/receipt');
        self::assertSame('SPENT', $this->data()['token']['status']);
        $another = $this->token($this->recipient);
        $this->clock->time = new \DateTimeImmutable('2026-10-18T12:00:00Z');
        $id = $this->reserve($another);
        $this->clock->time = new \DateTimeImmutable('2026-12-01T12:00:00Z');
        $this->send('POST', '/api/token-redemptions/'.$id.'/cancel');
        self::assertSame('EXPIRED', $this->data()['token']['status']);
        self::assertSame('AVAILABLE', $this->em->getConnection()->fetchOne('SELECT status FROM tokens WHERE id = ?', [$another]));
        $this->send('POST', '/api/tokens/'.$another.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
    }

    public function testPermissionsValidationAndInactiveAccounts(): void
    {
        $id = $this->reserve();
        $paths = [
            ['GET', '/api/token-redemptions', null], ['GET', '/api/token-redemptions/'.$id, null],
            ['POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]],
            ['POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']],
            ['POST', '/api/token-redemptions/'.$id.'/receipt', null], ['POST', '/api/token-redemptions/'.$id.'/cancel', null],
        ];
        $this->as(null);
        foreach ($paths as [$method, $path, $body]) {
            $this->send($method, $path, $body);
            self::assertResponseStatusCodeSame(401);
        }
        $this->as($this->other);
        foreach (array_slice($paths, 1) as [$method, $path, $body]) {
            $this->send($method, $path, $body);
            self::assertResponseStatusCodeSame(403);
        }
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseStatusCodeSame(403);
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$id.'/receipt');
        self::assertResponseStatusCodeSame(403);
        $this->setStatus($this->provider, 'INACTIVE');
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseStatusCodeSame(403);
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/cancel');
        self::assertResponseIsSuccessful();
        foreach ([[], ['serviceId' => 0], ['serviceId' => '1'], ['serviceId' => 1, 'userId' => 1]] as $body) {
            $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', $body);
            self::assertResponseStatusCodeSame(400);
        }
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'INVALID']);
        self::assertResponseStatusCodeSame(400);
        $this->send('POST', '/api/token-redemptions/'.$id.'/cancel', ['userId' => 1]);
        self::assertResponseStatusCodeSame(400);
        $this->client->request('POST', '/api/tokens/'.$this->tokenId.'/reserve', server: ['CONTENT_TYPE' => 'application/json'], content: '{');
        self::assertResponseStatusCodeSame(400);
        $this->send('GET', '/api/token-redemptions/999999');
        self::assertResponseStatusCodeSame(404);
    }

    public function testInactiveCounterpartCanBeRejectedAndReceiptStillWorks(): void
    {
        $first = $this->reserve();
        $this->setStatus($this->recipient, 'INACTIVE');
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$first.'/decision', ['decision' => 'ACCEPT']);
        self::assertResponseStatusCodeSame(409);
        $this->send('POST', '/api/token-redemptions/'.$first.'/decision', ['decision' => 'REJECT']);
        self::assertResponseIsSuccessful();
        $this->setStatus($this->recipient, 'ACTIVE');
        $this->as($this->recipient);
        $id = $this->reserve();
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        $this->setStatus($this->provider, 'INACTIVE');
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/receipt');
        self::assertResponseIsSuccessful();
        self::assertSame('SPENT', $this->data()['token']['status']);
    }

    public function testUnavailableTokensAndOffersCannotBeReserved(): void
    {
        $db = $this->em->getConnection();
        foreach (['RESERVED', 'SPENT'] as $status) {
            $db->update('tokens', ['status' => $status], ['id' => $this->tokenId]);
            $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
            self::assertResponseStatusCodeSame(409);
        }
        $db->update('tokens', ['status' => 'AVAILABLE', 'expiration_date' => '2026-10-18 12:00:00'], ['id' => $this->tokenId]);
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
        $db->update('tokens', ['expiration_date' => '2026-11-18 12:00:00', 'deleted_at' => '2026-10-18 12:00:00'], ['id' => $this->tokenId]);
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(404);
        $db->update('tokens', ['deleted_at' => null], ['id' => $this->tokenId]);
        foreach ([$this->service($this->recipient), $this->service($this->provider, Service::TYPE_REQUEST)] as $invalid) {
            $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $invalid->getId()]);
            self::assertResponseStatusCodeSame(400);
        }
        $db->update('services', ['is_suspended' => 1], ['id' => $this->offer->getId()]);
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
        $db->update('services', ['is_suspended' => 0], ['id' => $this->offer->getId()]);
        $this->setStatus($this->provider, 'INACTIVE');
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
        $this->setStatus($this->provider, 'ACTIVE');
        $db->update('services', ['deleted_at' => '2026-10-18 12:00:00'], ['id' => $this->offer->getId()]);
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(404);
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM token_redemptions'));
    }

    public function testReservationBlocksEditsStaffDeletionAndOtherTokens(): void
    {
        $id = $this->reserve();
        $secondToken = $this->token($this->other);
        $this->as($this->other);
        $this->send('POST', '/api/tokens/'.$secondToken.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
        $this->as($this->provider);
        foreach ([['PATCH', ['description' => 'Changed']], ['PATCH', ['isSuspended' => true]], ['DELETE', null]] as [$method, $body]) {
            $this->send($method, '/api/offers/'.$this->offer->getId(), $body);
            self::assertResponseStatusCodeSame(409);
        }
        $this->em->getConnection()->update('users', ['roles' => json_encode([User::ROLE_STAFF])], ['id' => $this->other->getId()]);
        $this->em->clear();
        $this->as($this->other);
        $this->send('DELETE', '/api/staff/tokens/'.$this->tokenId);
        self::assertResponseStatusCodeSame(409);
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/cancel');
        $this->as($this->provider);
        $this->send('PATCH', '/api/offers/'.$this->offer->getId(), ['description' => 'Available again']);
        self::assertResponseIsSuccessful();
        $this->send('DELETE', '/api/offers/'.$this->offer->getId());
        self::assertResponseStatusCodeSame(204);
        $this->as($this->recipient);
        $this->send('GET', '/api/token-redemptions/'.$id);
        self::assertSame('CANCELLED', $this->data()['redemption']['status']);
    }

    public function testStaffExpirationChangeDoesNotReactivateSpentToken(): void
    {
        $id = $this->reserve();
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/receipt');
        $this->em->getConnection()->update('users', ['roles' => json_encode([User::ROLE_STAFF])], ['id' => $this->other->getId()]);
        $this->em->clear();
        $this->as($this->other);
        $this->send('PATCH', '/api/staff/tokens/'.$this->tokenId, ['expiresAt' => '2030-01-01T00:00:00Z']);
        self::assertResponseIsSuccessful();
        $this->as($this->recipient);
        $this->send('GET', '/api/tokens');
        self::assertSame('SPENT', $this->data()['tokens'][0]['status']);
    }

    public function testChainAndDirectProposalConflicts(): void
    {
        $db = $this->em->getConnection();
        $db->insert('proposal_groups', ['creation_date' => '2026-10-18 12:00:00']);
        $groupId = (int) $db->lastInsertId();
        $db->insert('chain_service_reservations', ['service_id' => $this->offer->getId(), 'group_id' => $groupId]);
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
        $db->delete('chain_service_reservations', ['service_id' => $this->offer->getId()]);
        $proposal = new Proposal('token-test');
        $proposal->addParticipant(new ProposalParticipant($proposal, $this->em->find(User::class, $this->provider->getId()), $this->em->find(Service::class, $this->offer->getId())));
        $this->em->persist($proposal);
        $this->em->flush();
        $this->send('POST', '/api/tokens/'.$this->tokenId.'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(409);
    }

    public function testReservedOfferCannotStartChainsOrReceiveNewProposals(): void
    {
        $request = $this->service($this->provider, Service::TYPE_REQUEST);
        $otherOffer = $this->service($this->other);
        $otherRequest = $this->service($this->other, Service::TYPE_REQUEST);
        $category = new Category('Shared category');
        $this->em->persist($category);
        foreach ([$this->offer, $request, $otherOffer, $otherRequest] as $service) {
            $service->addCategory($category);
        }
        $this->em->flush();
        $id = $this->reserve();
        $this->as($this->provider);
        $this->send('POST', '/api/chains', ['offeredServiceId' => $this->offer->getId(), 'requestedServiceId' => $request->getId()]);
        self::assertResponseStatusCodeSame(409);
        $swipe = [
            'direction' => 'RIGHT', 'actorOfferServiceId' => $this->offer->getId(),
            'actorRequestServiceId' => $request->getId(), 'candidateOfferServiceId' => $otherOffer->getId(),
            'candidateRequestServiceId' => $otherRequest->getId(),
        ];
        $this->send('POST', '/api/swipes', $swipe);
        self::assertResponseStatusCodeSame(409);
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$id.'/cancel');
        $this->as($this->provider);
        $this->send('POST', '/api/swipes', $swipe);
        self::assertResponseStatusCodeSame(201);
    }

    public function testConcurrentReservationsOfSameTokenAndSameOffer(): void
    {
        $otherOffer = $this->service($this->other);
        $results = $this->race([
            $this->reservationInput($this->recipient, $this->tokenId, $this->offer->getId()),
            $this->reservationInput($this->recipient, $this->tokenId, $otherOffer->getId()),
        ], [$this->offer->getId(), $otherOffer->getId()]);
        $statuses = array_column($results, 'status'); sort($statuses);
        self::assertSame([201, 409], $statuses);
        $winner = array_values(array_filter($results, fn ($r) => $r['status'] === 201))[0];
        $this->as($this->recipient);
        $this->send('POST', '/api/token-redemptions/'.$winner['body']['redemption']['id'].'/cancel');
        $otherToken = $this->token($this->other);
        $results = $this->race([
            $this->reservationInput($this->recipient, $this->tokenId, $this->offer->getId()),
            $this->reservationInput($this->other, $otherToken, $this->offer->getId()),
        ], [$this->offer->getId()]);
        $statuses = array_column($results, 'status'); sort($statuses);
        self::assertSame([201, 409], $statuses);
        self::assertSame(1, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM token_redemptions WHERE reserved_service_id IS NOT NULL'));
    }

    public function testConcurrentReceiptAndCancellationCannotBothWin(): void
    {
        $id = $this->reserve();
        $this->as($this->provider);
        $this->send('POST', '/api/token-redemptions/'.$id.'/decision', ['decision' => 'ACCEPT']);
        $results = $this->race([
            ['userId' => $this->recipient->getId(), 'path' => '/api/token-redemptions/'.$id.'/receipt'],
            ['userId' => $this->provider->getId(), 'path' => '/api/token-redemptions/'.$id.'/cancel'],
        ], [$this->offer->getId()]);
        $statuses = array_column($results, 'status'); sort($statuses);
        self::assertSame([200, 409], $statuses);
        $db = $this->em->getConnection();
        $row = $db->fetchAssociative('SELECT * FROM token_redemptions WHERE id = ?', [$id]);
        self::assertNull($row['reserved_service_id']);
        self::assertSame($row['status'] === 'COMPLETED' ? 'SPENT' : 'AVAILABLE', $db->fetchOne('SELECT status FROM tokens WHERE id = ?', [$this->tokenId]));
    }

    private function reservationInput(User $user, int $token, int $service): array
    {
        return ['userId' => $user->getId(), 'path' => '/api/tokens/'.$token.'/reserve', 'body' => ['serviceId' => $service]];
    }

    private function race(array $inputs, array $serviceIds): array
    {
        $db = $this->em->getConnection();
        $processes = []; $files = [];
        $db->beginTransaction();
        static::getContainer()->get(ChainRepository::class)->lockServices($serviceIds);
        try {
            foreach ($inputs as $input) {
                $file = tempnam(sys_get_temp_dir(), 'token_ready_');
                unlink($file);
                $files[] = $file;
                $input['ready'] = $file;
                $process = new Process([PHP_BINARY, 'tests/Support/token-worker.php', json_encode($input)], dirname(__DIR__, 2), ['DATABASE_URL' => $this->url, 'APP_ENV' => 'test', 'SYMFONY_DOTENV_VARS' => false]);
                $process->setTimeout(40);
                $process->start(); $processes[] = $process;
            }
            $deadline = microtime(true) + 20;
            while (count(array_filter($files, 'is_file')) !== count($files)) {
                if (microtime(true) > $deadline) { self::fail('Concurrent workers did not become ready.'); }
                usleep(20000);
            }
            $db->commit();
            $results = [];
            foreach ($processes as $process) {
                $process->wait();
                self::assertTrue($process->isSuccessful(), $process->getErrorOutput());
                $results[] = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
            }
            return $results;
        } finally {
            if ($db->isTransactionActive()) { $db->rollBack(); }
            foreach ($processes as $process) { if ($process->isRunning()) { $process->stop(); } }
            foreach ($files as $file) { if (is_file($file)) { unlink($file); } }
        }
    }

    private function user(string $name): User
    {
        $user = new User('Test', 'User', $name, $name.'@example.test');
        $user->setPassword('unused-test-hash');
        $this->em->persist($user); $this->em->flush();
        return $user;
    }

    private function service(User $owner, string $type = Service::TYPE_OFFER): Service
    {
        $service = new Service($this->em->find(User::class, $owner->getId()), $type, 'A test service');
        $this->em->persist($service); $this->em->flush();
        return $service;
    }

    private function setStatus(User $user, string $status): void
    {
        // HTTP requests can clear the entity manager; update fixtures through the database.
        $this->em->getConnection()->update('users', ['account_status' => $status], ['id' => $user->getId()]);
        $this->em->clear();
    }

    private function token(User $owner): int
    {
        $db = $this->em->getConnection();
        $db->insert('tokens', ['user_id' => $owner->getId(), 'issued_at' => '2026-10-18 12:00:00', 'expiration_date' => '2026-11-18 12:00:00']);
        return (int) $db->lastInsertId();
    }

    private function reserve(?int $tokenId = null): int
    {
        $this->send('POST', '/api/tokens/'.($tokenId ?? $this->tokenId).'/reserve', ['serviceId' => $this->offer->getId()]);
        self::assertResponseStatusCodeSame(201);
        return $this->data()['redemption']['id'];
    }

    private function as(?User $user): void
    {
        $jwt = $user === null ? '' : 'Bearer '.static::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', $jwt);
    }

    private function send(string $method, string $path, ?array $body = null): void
    {
        if ($body === null) { $this->client->request($method, $path); }
        else { $this->client->jsonRequest($method, $path, $body); }
    }

    private function data(): array
    {
        return json_decode($this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
