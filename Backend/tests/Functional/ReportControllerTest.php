<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Entity\UserReport;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ReportControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private User $author;
    private User $target;

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        // Never reset the database used by the local application.
        $parameters = $this->em->getConnection()->getParams();
        $database = $parameters['path'] ?? $parameters['dbname'] ?? '';
        if (!str_contains($database, 'barattolo_test')) {
            throw new \RuntimeException('Reports tests require the isolated barattolo_test database.');
        }
        $tool = new SchemaTool($this->em);
        $metadata = $this->em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($metadata);
        $tool->createSchema($metadata);
        $this->author = $this->createUser('author');
        $this->target = $this->createUser('target');
        $this->authenticate($this->author);
    }

    public function testReportIsSavedWithTheAuthenticatedAuthor(): void
    {
        $this->client->jsonRequest('POST', '/api/reports', $this->payload('  Repeated harassment.  '));
        self::assertResponseStatusCodeSame(201);
        $report = $this->data()['report'];
        self::assertIsInt($report['id']);
        self::assertSame($this->target->getId(), $report['reportedUserId']);
        self::assertSame('Repeated harassment.', $report['reason']);
        self::assertSame($report['createdAt'], (new \DateTimeImmutable($report['createdAt']))->format(DATE_ATOM));
        self::assertSame(['id', 'reportedUserId', 'reason', 'createdAt'], array_keys($report));
        $this->em->clear();
        $saved = $this->em->find(UserReport::class, $report['id']);
        self::assertSame($this->author->getId(), $saved->getReporter()->getId());
        self::assertSame($report, $saved->toApiArray());
    }

    public function testDuplicateIsRejectedAndReversePairIsIndependent(): void
    {
        $this->client->jsonRequest('POST', '/api/reports', $this->payload());
        self::assertResponseStatusCodeSame(201);
        $original = $this->data()['report'];
        $this->client->jsonRequest('POST', '/api/reports', $this->payload('Changed reason'));
        self::assertResponseStatusCodeSame(409);
        self::assertArrayHasKey('error', $this->data());
        $this->em->clear();
        self::assertSame($original, $this->em->find(UserReport::class, $original['id'])->toApiArray());
        self::assertSame(1, $this->em->getRepository(UserReport::class)->count([]));
        $this->authenticate($this->target);
        $this->client->jsonRequest('POST', '/api/reports', ['reportedUserId' => $this->author->getId(), 'reason' => 'Another report']);
        self::assertResponseStatusCodeSame(201);
    }

    public function testInvalidInputCannotCreateReports(): void
    {
        foreach ([
            [], ['reason' => 'Problem'], ['reportedUserId' => $this->target->getId()],
            $this->payload(''), $this->payload('   '), $this->payload(str_repeat('a', 2001)),
            ['reportedUserId' => 0, 'reason' => 'Problem'],
            ['reportedUserId' => -1, 'reason' => 'Problem'],
            ['reportedUserId' => (string) $this->target->getId(), 'reason' => 'Problem'],
            ['reportedUserId' => 1.5, 'reason' => 'Problem'],
            ['reportedUserId' => true, 'reason' => 'Problem'],
            ['reportedUserId' => $this->target->getId(), 'reason' => null],
            ['reportedUserId' => $this->target->getId(), 'reason' => ['Problem']],
            $this->payload() + ['reporterId' => $this->target->getId()],
            $this->payload() + ['extra' => 'value'],
            ['reportedUserId' => $this->author->getId(), 'reason' => 'Self'],
        ] as $payload) {
            $this->client->jsonRequest('POST', '/api/reports', $payload);
            self::assertResponseStatusCodeSame(400);
        }
        foreach (['{invalid', 'null', '"text"', '[1,2]'] as $body) {
            $this->client->request('POST', '/api/reports', [], [], ['CONTENT_TYPE' => 'application/json'], $body);
            self::assertResponseStatusCodeSame(400);
            self::assertSame(['error'], array_keys($this->data()));
        }
        self::assertSame(0, $this->em->getRepository(UserReport::class)->count([]));
    }

    public function testMissingTargetAndInactiveTarget(): void
    {
        $this->target->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        $this->client->jsonRequest('POST', '/api/reports', ['reportedUserId' => 2147483647, 'reason' => 'Problem']);
        self::assertResponseStatusCodeSame(404);
        $this->client->jsonRequest('POST', '/api/reports', $this->payload(str_repeat('é', 2000)));
        self::assertResponseStatusCodeSame(201);
    }

    public function testActiveAuthenticationIsRequired(): void
    {
        $this->author->setAccountStatus(User::STATUS_INACTIVE);
        $this->em->flush();
        $this->client->setServerParameter('HTTP_AUTHORIZATION', '');
        $this->client->jsonRequest('POST', '/api/reports', $this->payload());
        self::assertResponseStatusCodeSame(401);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer invalid-token');
        $this->client->jsonRequest('POST', '/api/reports', $this->payload());
        self::assertResponseStatusCodeSame(401);
        $this->authenticate($this->author);
        $this->client->jsonRequest('POST', '/api/reports', $this->payload());
        self::assertResponseStatusCodeSame(403);
        self::assertSame(0, $this->em->getRepository(UserReport::class)->count([]));
    }

    public function testDatabaseAlsoRejectsDuplicatesWithoutTheControllerCheck(): void
    {
        $this->em->persist(new UserReport($this->author, $this->target, 'First report'));
        $this->em->flush();
        // Bypass the controller to prove the constraint protects concurrent inserts too.
        $this->expectException(UniqueConstraintViolationException::class);
        $this->em->getConnection()->insert('user_reports', [
            'reporter_id' => $this->author->getId(), 'reported_user_id' => $this->target->getId(),
            'reason' => 'Duplicate', 'creation_date' => '2026-10-13 12:00:00',
        ]);
    }

    private function createUser(string $username): User
    {
        $user = new User('Test', 'User', $username, $username.'@example.test');
        $user->setPassword('unused-test-hash');
        $this->em->persist($user);
        $this->em->flush();
        return $user;
    }

    private function authenticate(User $user): void
    {
        $jwt = static::getContainer()->get(JWTTokenManagerInterface::class);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$jwt->create($user));
    }

    private function payload(string $reason = 'Problem with this user'): array
    {
        return ['reportedUserId' => $this->target->getId(), 'reason' => $reason];
    }

    private function data(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
