<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Entity\UserReport;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Process\Process;

/** Real row locks are tested only in a disposable MySQL staff_check_*_test database. */
final class StaffControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private User $staff;
    private User $author;
    private User $target;
    private User $inactive;
    private array $oldDatabase;
    private string $url;

    protected function setUp(): void
    {
        $url = $_SERVER['STAFF_TEST_DATABASE_URL'] ?? $_ENV['STAFF_TEST_DATABASE_URL'] ?? getenv('STAFF_TEST_DATABASE_URL');
        if (!$url) { self::markTestSkipped('Set STAFF_TEST_DATABASE_URL to an isolated MySQL staff_check_* database (without the _test suffix).'); }
        $this->url = $url;
        $this->oldDatabase = [$_SERVER['DATABASE_URL'] ?? null, $_ENV['DATABASE_URL'] ?? null];
        $_SERVER['DATABASE_URL'] = $_ENV['DATABASE_URL'] = $url;
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        if (!str_starts_with((string) $db->getDatabase(), 'staff_check_') || !str_ends_with((string) $db->getDatabase(), '_test')) {
            throw new \RuntimeException('Refusing to reset a database outside staff_check_*_test.');
        }
        $db->executeStatement('SET FOREIGN_KEY_CHECKS = 0');
        foreach ($db->createSchemaManager()->listTableNames() as $table) { $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table)); }
        $db->executeStatement('SET FOREIGN_KEY_CHECKS = 1');
        (new SchemaTool($this->em))->createSchema($this->em->getMetadataFactory()->getAllMetadata());
        $this->staff = $this->createUser('staff', [User::ROLE_STAFF]);
        $this->author = $this->createUser('author');
        $this->target = $this->createUser('target', [User::ROLE_USER, 'ROLE_HELPER']);
        $this->inactive = $this->createUser('inactive', [User::ROLE_USER], User::STATUS_INACTIVE);
        $this->authenticate($this->staff);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        if (isset($this->oldDatabase)) {
            [$_SERVER['DATABASE_URL'], $_ENV['DATABASE_URL']] = $this->oldDatabase;
        }
    }

    public function testEveryStaffEndpointRequiresActiveStaff(): void
    {
        $inactiveStaff = $this->createUser('inactive_staff', [User::ROLE_STAFF], User::STATUS_INACTIVE);
        $paths = [
            ['GET', '/api/staff/users', null], ['GET', '/api/staff/users/1', null],
            ['POST', '/api/staff/users/1/promote', null], ['PATCH', '/api/staff/users/1/status', ['accountStatus' => 'INACTIVE']],
            ['GET', '/api/staff/reports', null], ['GET', '/api/staff/reports/1', null],
            ['PATCH', '/api/staff/reports/1/review', ['status' => 'CONFIRMED', 'reviewNote' => 'Explanation']],
        ];
        foreach ([null, $this->author, $inactiveStaff] as $user) {
            $this->authenticate($user);
            foreach ($paths as [$method, $path, $body]) {
                $this->send($method, $path, $body);
                self::assertResponseStatusCodeSame($user === null ? 401 : 403);
            }
        }
    }

    public function testStaffCanListAndReadUsersWithPaginationAndFilters(): void
    {
        $this->send('GET', '/api/staff/users?limit=2');
        self::assertResponseIsSuccessful();
        self::assertSame(['page' => 1, 'limit' => 2, 'totalItems' => 4, 'totalPages' => 2], $this->data()['pagination']);
        self::assertSame([$this->staff->getId(), $this->author->getId()], array_column($this->data()['users'], 'id'));
        self::assertStringNotContainsString('password', $this->client->getResponse()->getContent());
        $this->send('GET', '/api/staff/users?q=TARGET&accountStatus=ACTIVE');
        self::assertSame([$this->target->getId()], array_column($this->data()['users'], 'id'));
        $this->send('GET', '/api/staff/users?accountStatus=INACTIVE');
        self::assertSame([$this->inactive->getId()], array_column($this->data()['users'], 'id'));
        $this->send('GET', '/api/staff/users?page=99');
        self::assertSame([], $this->data()['users']);
        self::assertSame(4, $this->data()['pagination']['totalItems']);
        $this->send('GET', '/api/staff/users/'.$this->target->getId());
        self::assertSame('target@example.test', $this->data()['user']['email']);
        self::assertSame('ACTIVE', $this->data()['user']['accountStatus']);
        foreach (['/api/staff/users/2147483647', '/api/staff/reports/2147483647'] as $path) {
            $this->send('GET', $path);
            self::assertResponseStatusCodeSame(404);
        }
    }

    public function testPromotionPreservesRolesAndChangesAccessWithAnExistingJwt(): void
    {
        $targetToken = $this->token($this->target);
        $this->send('POST', '/api/staff/users/'.$this->target->getId().'/promote');
        self::assertResponseIsSuccessful();
        self::assertSame(['ROLE_USER', 'ROLE_HELPER', 'ROLE_STAFF'], $this->data()['user']['roles']);
        $first = $this->data();
        $this->send('POST', '/api/staff/users/'.$this->target->getId().'/promote');
        self::assertSame($first, $this->data());
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$targetToken);
        $this->send('GET', '/api/staff/users');
        self::assertResponseIsSuccessful();
        $this->send('PATCH', '/api/staff/users/'.$this->staff->getId().'/status', ['accountStatus' => 'INACTIVE']);
        self::assertResponseStatusCodeSame(403);
        $this->send('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'INACTIVE']);
        self::assertResponseStatusCodeSame(403);
        $this->send('POST', '/api/staff/users/'.$this->inactive->getId().'/promote');
        self::assertResponseStatusCodeSame(409);
        $this->send('POST', '/api/staff/users/2147483647/promote');
        self::assertResponseStatusCodeSame(404);
    }

    public function testDeactivationBlocksOldTokensAcrossProtectedApisAndReactivationWorks(): void
    {
        $targetToken = $this->token($this->target);
        $this->send('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'INACTIVE']);
        self::assertResponseIsSuccessful();
        self::assertSame('INACTIVE', $this->data()['user']['accountStatus']);
        $this->send('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'INACTIVE']);
        self::assertResponseIsSuccessful();
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$targetToken);
        foreach (['/api/profile', '/api/chats/1', '/api/services'] as $path) {
            $this->send('GET', $path);
            self::assertResponseStatusCodeSame(403);
            self::assertSame(['error' => 'This account is inactive.'], $this->data());
        }
        $this->send('GET', '/api/categories');
        self::assertResponseIsSuccessful();
        $this->send('OPTIONS', '/api/staff/users');
        self::assertResponseStatusCodeSame(204);
        $this->authenticate($this->staff);
        $this->send('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'ACTIVE']);
        self::assertResponseIsSuccessful();
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$targetToken);
        $this->send('GET', '/api/profile');
        self::assertResponseIsSuccessful();
    }

    public function testReportListsAndDefinitiveReviewsPreserveTheSubmissionApi(): void
    {
        $report = new UserReport($this->author, $this->target, 'Original reason');
        $reverse = new UserReport($this->target, $this->author, 'Another reason');
        $this->em->persist($report);
        $this->em->persist($reverse);
        $this->em->flush();
        $reportId = $report->toApiArray()['id'];
        $reverseId = $reverse->toApiArray()['id'];
        $this->send('GET', '/api/staff/reports?limit=1');
        self::assertSame(2, $this->data()['pagination']['totalItems']);
        self::assertSame($reverseId, $this->data()['reports'][0]['id']);
        self::assertSame('PENDING', $this->data()['reports'][0]['status']);
        self::assertNull($this->data()['reports'][0]['reviewedBy']);
        $this->send('GET', '/api/staff/reports?reporterId='.$this->author->getId().'&reportedUserId='.$this->target->getId());
        self::assertSame([$reportId], array_column($this->data()['reports'], 'id'));
        $this->send('PATCH', '/api/staff/reports/'.$reportId.'/review', ['status' => 'CONFIRMED', 'reviewNote' => '  Evidence checked.  ']);
        self::assertResponseIsSuccessful();
        $closed = $this->data()['report'];
        self::assertSame('CONFIRMED', $closed['status']);
        self::assertSame('Evidence checked.', $closed['reviewNote']);
        self::assertSame($this->staff->getId(), $closed['reviewedBy']['id']);
        self::assertSame(['id', 'username', 'name', 'surname'], array_keys($closed['reporter']));
        self::assertNotNull($closed['reviewedAt']);
        $this->send('PATCH', '/api/staff/reports/'.$reportId.'/review', ['status' => 'REJECTED', 'reviewNote' => 'Replace']);
        self::assertResponseStatusCodeSame(409);
        $this->send('GET', '/api/staff/reports/'.$reportId);
        self::assertSame($closed, $this->data()['report']);
        $this->send('PATCH', '/api/staff/reports/'.$reverseId.'/review', ['status' => 'REJECTED', 'reviewNote' => str_repeat('é', 2000)]);
        self::assertResponseIsSuccessful();
        $this->send('GET', '/api/staff/reports?status=REJECTED');
        self::assertSame([$reverseId], array_column($this->data()['reports'], 'id'));
        $this->send('GET', '/api/staff/reports?status=PENDING');
        self::assertSame([], $this->data()['reports']);
        $this->send('GET', '/api/staff/users/'.$this->target->getId());
        self::assertSame('ACTIVE', $this->data()['user']['accountStatus']);
        $this->authenticate($this->author);
        $this->send('POST', '/api/reports', ['reportedUserId' => $this->target->getId(), 'reason' => 'Again']);
        self::assertResponseStatusCodeSame(409);
        $this->send('POST', '/api/reports', ['reportedUserId' => $this->inactive->getId(), 'reason' => 'New']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['id', 'reportedUserId', 'reason', 'createdAt'], array_keys($this->data()['report']));
    }

    public function testInvalidQueriesAndBodiesAreRejected(): void
    {
        foreach (['page=0', 'page=-1', 'limit=51', 'limit=0', 'page[]=1', 'q[]=x', 'accountStatus=OTHER', 'unknown=1'] as $query) {
            $this->send('GET', '/api/staff/users?'.$query);
            self::assertResponseStatusCodeSame(400);
        }
        foreach (['status=OTHER', 'reporterId=0', 'reportedUserId[]=1', 'limit=51', 'unknown=1'] as $query) {
            $this->send('GET', '/api/staff/reports?'.$query);
            self::assertResponseStatusCodeSame(400);
        }
        foreach ([[], ['accountStatus' => true], ['accountStatus' => 'inactive'], ['accountStatus' => 'ACTIVE', 'roles' => ['ROLE_STAFF']]] as $body) {
            $this->send('PATCH', '/api/staff/users/'.$this->target->getId().'/status', $body);
            self::assertResponseStatusCodeSame(400);
        }
        foreach ([[], ['status' => 'PENDING', 'reviewNote' => 'Note'], ['status' => 'CONFIRMED'], ['status' => 'CONFIRMED', 'reviewNote' => '  '], ['status' => 'CONFIRMED', 'reviewNote' => str_repeat('a', 2001)], ['status' => 'CONFIRMED', 'reviewNote' => null], ['status' => 'CONFIRMED', 'reviewNote' => 'Note', 'reviewedBy' => 1]] as $body) {
            $this->send('PATCH', '/api/staff/reports/1/review', $body);
            self::assertResponseStatusCodeSame(400);
        }
        $this->send('POST', '/api/staff/users/'.$this->target->getId().'/promote', ['roles' => ['ROLE_STAFF']]);
        self::assertResponseStatusCodeSame(400);
        foreach (['{invalid', 'null', '"text"'] as $body) {
            $this->client->request('PATCH', '/api/staff/users/'.$this->target->getId().'/status', [], [], ['CONTENT_TYPE' => 'application/json'], $body);
            self::assertResponseStatusCodeSame(400);
            self::assertSame(['error'], array_keys($this->data()));
        }
        $this->send('PATCH', '/api/staff/reports/2147483647/review', ['status' => 'CONFIRMED', 'reviewNote' => 'Note']);
        self::assertResponseStatusCodeSame(404);
    }

    public function testConcurrentReviewsCloseTheReportOnlyOnce(): void
    {
        $report = new UserReport($this->author, $this->target, 'Reason');
        $this->em->persist($report);
        $this->em->flush();
        $id = $report->toApiArray()['id'];
        $results = $this->race('user_reports', $id, [
            ['method' => 'PATCH', 'path' => '/api/staff/reports/'.$id.'/review', 'body' => ['status' => 'CONFIRMED', 'reviewNote' => 'First']],
            ['method' => 'PATCH', 'path' => '/api/staff/reports/'.$id.'/review', 'body' => ['status' => 'REJECTED', 'reviewNote' => 'Second']],
        ]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        self::assertSame([200, 409], $statuses);
        $winner = $results[0]['status'] === 200 ? $results[0] : $results[1];
        $this->em->clear();
        self::assertSame($winner['data']['report'], $this->em->find(UserReport::class, $id)->toStaffApiArray());
    }

    public function testConcurrentPromotionAndDeactivationCannotProduceInactiveStaff(): void
    {
        $id = $this->target->getId();
        $results = $this->race('users', $id, [
            ['method' => 'POST', 'path' => '/api/staff/users/'.$id.'/promote'],
            ['method' => 'PATCH', 'path' => '/api/staff/users/'.$id.'/status', 'body' => ['accountStatus' => 'INACTIVE']],
        ]);
        self::assertSame(1, count(array_filter($results, static fn ($result) => $result['status'] === 200)));
        $this->em->clear();
        $user = $this->em->find(User::class, $id);
        self::assertFalse(!$user->isActive() && in_array(User::ROLE_STAFF, $user->getRoles(), true));
        self::assertContains($results[0]['status'], [200, 409]);
        self::assertContains($results[1]['status'], [200, 403]);
    }

    /** Hold the target row until both independent requests are ready to contend for it. */
    private function race(string $table, int $id, array $requests): array
    {
        $db = $this->em->getConnection();
        $db->beginTransaction();
        $db->fetchOne('SELECT id FROM '.$table.' WHERE id = ? FOR UPDATE', [$id]);
        $processes = [];
        $readyFiles = [];
        try {
            foreach ($requests as $request) {
                $ready = tempnam(sys_get_temp_dir(), 'staff_ready_');
                unlink($ready);
                $readyFiles[] = $ready;
                $process = new Process([PHP_BINARY, 'tests/Support/staff-worker.php', $ready], dirname(__DIR__, 2), ['APP_ENV' => 'test', 'DATABASE_URL' => $this->url, 'SYMFONY_DOTENV_VARS' => false]);
                $process->setInput(json_encode($request + ['token' => $this->token($this->staff)], JSON_THROW_ON_ERROR));
                $process->setTimeout(30);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 20;
            while (count(array_filter($readyFiles, 'is_file')) !== count($readyFiles)) {
                if (microtime(true) > $deadline) { self::fail('Concurrent workers did not become ready.'); }
                usleep(50000);
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
            foreach ($readyFiles as $ready) { if (is_file($ready)) { unlink($ready); } }
        }
    }

    private function createUser(string $username, array $roles = [User::ROLE_USER], string $status = User::STATUS_ACTIVE): User
    {
        $user = new User('Test', 'User', $username, $username.'@example.test');
        $user->setPassword('unused-test-hash');
        $user->setRoles($roles);
        $user->setAccountStatus($status);
        $this->em->persist($user);
        $this->em->flush();
        return $user;
    }

    private function token(User $user): string
    {
        return static::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
    }

    private function authenticate(?User $user): void
    {
        $this->client->setServerParameter('HTTP_AUTHORIZATION', $user === null ? '' : 'Bearer '.$this->token($user));
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
