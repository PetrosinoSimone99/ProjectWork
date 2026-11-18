<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Service\Clock;
use App\Service\NotificationService;
use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The HTTP contract of `GET /api/stream`.
 *
 * The content of the stream is covered by `NotificationEventStreamTest`; here
 * only the response itself is asserted, and `sendContent()` is never called so
 * no test waits on a connection that is meant to stay open.
 */
final class StreamControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private User $alice;
    private User $inactive;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        $db->executeStatement('PRAGMA foreign_keys = OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) {
            $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
        }
        ReferenceDatabaseSchema::create($db);
        $db->executeStatement('PRAGMA foreign_keys = ON');
        $this->alice = $this->user('alice');
        $this->inactive = $this->user('inactive');
        $this->inactive->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        static::getContainer()->set(Clock::class, new Clock());
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

    public function testStreamIsAnEventStreamAndOpensAtTheCursorItIsGiven(): void
    {
        foreach (['/api/stream', '/api/stream?after=0', '/api/stream?after=42'] as $path) {
            $this->client->request('GET', $path);
            self::assertResponseIsSuccessful();
            $response = $this->client->getResponse();
            self::assertInstanceOf(StreamedResponse::class, $response);
            self::assertSame('text/event-stream; charset=utf-8', $response->headers->get('Content-Type'));
            // Symfony's session listener appends `private` to the policy below.
            self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
            self::assertStringContainsString('no-transform', (string) $response->headers->get('Cache-Control'));
            self::assertSame('no', $response->headers->get('X-Accel-Buffering'));
            // The CORS policy is shared, not re-declared here.
            self::assertSame('*', $response->headers->get('Access-Control-Allow-Origin'));
        }
    }

    public function testBadCursorAndUnknownParametersAreRejected(): void
    {
        foreach (['unknown=1', 'after=1&unknown=1', 'limit=1'] as $query) {
            $this->client->request('GET', '/api/stream?'.$query);
            self::assertResponseStatusCodeSame(400);
            self::assertSame(
                ['error' => 'The request contains an unknown query parameter.'],
                $this->errorMessage(),
                $query,
            );
        }
        foreach (['after=-1', 'after=abc', 'after=1.5', 'after[]=1', 'after=999999999999999999999999'] as $query) {
            $this->client->request('GET', '/api/stream?'.$query);
            self::assertResponseStatusCodeSame(400);
            self::assertSame(['error' => 'The after parameter must be a non-negative integer.'], $this->errorMessage(), $query);
        }
    }

    public function testStreamNeedsTheTokenAndAnActiveAccount(): void
    {
        $this->authenticate(null);
        $this->client->request('GET', '/api/stream');
        self::assertResponseStatusCodeSame(401);

        $this->authenticate($this->inactive);
        $this->client->request('GET', '/api/stream');
        self::assertResponseStatusCodeSame(403);
    }

    public function testPreflightIsAnsweredWithoutAToken(): void
    {
        $this->authenticate(null);
        $this->client->request('OPTIONS', '/api/stream');
        self::assertResponseStatusCodeSame(204);
        self::assertStringContainsString('Authorization', (string) $this->client->getResponse()->headers->get('Access-Control-Allow-Headers'));
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

    private function errorMessage(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
