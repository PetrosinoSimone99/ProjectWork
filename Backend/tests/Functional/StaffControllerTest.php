<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Entity\UserReport;
use App\Repository\ChainSchema;
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
        foreach (ChainSchema::statements($db) as $sql) { $db->executeStatement($sql); }
        $db->executeStatement('ALTER TABLE tokens ADD deleted_at DATETIME DEFAULT NULL');
        \App\Tests\Support\TokenRedemptionTestSchema::apply($db);
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
            ['POST', '/api/staff/reports/1/claim', null],
            ['GET', '/api/staff/operations', null], ['GET', '/api/staff/operations/1', null],
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
        foreach (['/api/profile', '/api/chats/mutual-proposal/1', '/api/services'] as $path) {
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
        self::assertNull($this->data()['reports'][0]['assignedTo']);
        self::assertNull($this->data()['reports'][0]['assignedAt']);
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
        self::assertNull($closed['assignedTo']);
        self::assertNull($closed['assignedAt']);
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
        self::assertSame(1, (int) $this->em->getConnection()->fetchOne("SELECT COUNT(*) FROM staff_operation_logs WHERE action = 'REPORT_REVIEWED'"));
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
        self::assertSame(1, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
    }

    public function testUserAndReportHistoryContainsOnlyEffectiveChanges(): void
    {
        $report = new UserReport($this->author, $this->target, 'Private original reason');
        $this->em->persist($report);
        $this->em->flush();
        $reportId = $report->toApiArray()['id'];
        $id = $this->target->getId();
        $statusPath = '/api/staff/users/'.$id.'/status';
        foreach (['INACTIVE', 'INACTIVE', 'ACTIVE'] as $status) {
            $this->send('PATCH', $statusPath, ['accountStatus' => $status]);
            self::assertResponseIsSuccessful();
        }
        $this->send('POST', '/api/staff/users/'.$id.'/promote');
        self::assertResponseIsSuccessful();
        $this->send('POST', '/api/staff/users/'.$id.'/promote');
        self::assertResponseIsSuccessful();
        $this->send('PATCH', $statusPath, ['accountStatus' => 'INACTIVE']);
        self::assertResponseStatusCodeSame(403);
        $this->send('PATCH', '/api/staff/reports/'.$reportId.'/review', ['status' => 'CONFIRMED', 'reviewNote' => 'Checked.']);
        self::assertResponseIsSuccessful();
        $this->send('PATCH', '/api/staff/reports/'.$reportId.'/review', ['status' => 'REJECTED', 'reviewNote' => 'Again']);
        self::assertResponseStatusCodeSame(409);
        $this->send('GET', '/api/staff/operations');
        self::assertResponseIsSuccessful();
        $logs = $this->data()['operations'];
        self::assertSame(4, $this->data()['pagination']['totalItems']);
        self::assertSame(['REPORT_REVIEWED', 'USER_PROMOTED', 'USER_STATUS_CHANGED', 'USER_STATUS_CHANGED'], array_column($logs, 'action'));
        self::assertEquals(['status' => 'PENDING', 'assignedToId' => null, 'assignedAt' => null, 'reviewNote' => null, 'reviewedById' => null, 'reviewedAt' => null], $logs[0]['before']);
        self::assertSame('CONFIRMED', $logs[0]['after']['status']);
        self::assertSame('Checked.', $logs[0]['after']['reviewNote']);
        self::assertSame($this->staff->getId(), $logs[0]['after']['reviewedById']);
        self::assertStringEndsWith('+00:00', $logs[0]['after']['reviewedAt']);
        self::assertSame(['roles' => ['ROLE_USER', 'ROLE_HELPER']], $logs[1]['before']);
        self::assertSame(['roles' => ['ROLE_USER', 'ROLE_HELPER', 'ROLE_STAFF']], $logs[1]['after']);
        self::assertSame(['accountStatus' => 'INACTIVE'], $logs[2]['before']);
        self::assertSame(['accountStatus' => 'ACTIVE'], $logs[2]['after']);
        foreach ($logs as $log) {
            self::assertSame(['id' => $this->staff->getId(), 'username' => 'staff'], $log['actor']);
            self::assertStringEndsWith('+00:00', $log['createdAt']);
        }
        self::assertStringNotContainsString('Private original reason', $this->client->getResponse()->getContent());
        self::assertStringNotContainsString('password', $this->client->getResponse()->getContent());
        $this->send('GET', '/api/staff/operations/'.$logs[0]['id']);
        self::assertSame($logs[0], $this->data()['operation']);
    }

    public function testTokenHistorySurvivesSoftDeletionAndSkipsUnchangedExpiration(): void
    {
        $this->send('POST', '/api/staff/tokens', ['userId' => $this->target->getId()]);
        self::assertResponseStatusCodeSame(201);
        $token = $this->data()['token'];
        $path = '/api/staff/tokens/'.$token['id'];
        $this->send('PATCH', $path, ['expiresAt' => $token['expiresAt']]);
        self::assertResponseIsSuccessful();
        $this->send('PUT', $path, ['expiresAt' => '2030-01-01T01:00:00+01:00']);
        self::assertResponseIsSuccessful();
        $this->send('DELETE', $path);
        self::assertResponseStatusCodeSame(204);
        $this->send('DELETE', $path);
        self::assertResponseStatusCodeSame(404);
        $this->send('GET', '/api/staff/operations?targetType=TOKEN&targetId='.$token['id']);
        self::assertResponseIsSuccessful();
        $logs = $this->data()['operations'];
        self::assertCount(3, $logs);
        self::assertSame(['TOKEN_DELETED', 'TOKEN_EXPIRATION_CHANGED', 'TOKEN_CREATED'], array_column($logs, 'action'));
        self::assertSame(['deletedAt' => null], $logs[0]['before']);
        self::assertStringEndsWith('+00:00', $logs[0]['after']['deletedAt']);
        self::assertSame(['expiresAt' => $token['expiresAt']], $logs[1]['before']);
        self::assertSame(['expiresAt' => '2030-01-01T00:00:00+00:00'], $logs[1]['after']);
        self::assertNull($logs[2]['before']);
        self::assertEquals(['userId' => $token['userId'], 'chainId' => null, 'issuedAt' => $token['issuedAt'], 'expiresAt' => $token['expiresAt']], $logs[2]['after']);
        $this->send('GET', '/api/staff/operations/'.$logs[2]['id']);
        self::assertSame($logs[2], $this->data()['operation']);
    }

    public function testHistoryFiltersPaginationSnapshotsAndReadOnlyRoutes(): void
    {
        $this->send('POST', '/api/staff/users/'.$this->target->getId().'/promote');
        $this->authenticate($this->target);
        $this->send('PATCH', '/api/staff/users/'.$this->author->getId().'/status', ['accountStatus' => 'INACTIVE']);
        self::assertResponseIsSuccessful();
        // Equal timestamps must still sort consistently by ID.
        $db = $this->em->getConnection();
        $db->executeStatement("UPDATE staff_operation_logs SET created_at = '2026-10-16 12:00:00'");
        $db->update('users', ['username' => 'renamed_staff'], ['id' => $this->staff->getId()]);
        $this->send('GET', '/api/staff/operations?limit=1');
        self::assertResponseIsSuccessful();
        self::assertSame(['page' => 1, 'limit' => 1, 'totalItems' => 2, 'totalPages' => 2], $this->data()['pagination']);
        self::assertSame('USER_STATUS_CHANGED', $this->data()['operations'][0]['action']);
        $this->send('GET', '/api/staff/operations?limit=1&page=2');
        $older = $this->data()['operations'][0];
        self::assertSame('staff', $older['actor']['username']);
        $db->delete('users', ['id' => $this->staff->getId()]);
        $this->send('GET', '/api/staff/operations?staffId='.$this->staff->getId().'&action=USER_PROMOTED&targetType=USER&targetId='.$this->target->getId());
        self::assertSame([$older], $this->data()['operations']);
        $this->send('GET', '/api/staff/operations?staffId=2147483647');
        self::assertSame([], $this->data()['operations']);
        $this->send('GET', '/api/staff/operations?page=99');
        self::assertSame([], $this->data()['operations']);
        $this->send('GET', '/api/staff/operations/2147483647');
        self::assertResponseStatusCodeSame(404);
        foreach (['page=0', 'page[]=1', 'limit=51', 'limit=0', 'staffId=0', 'staffId[]=1', 'targetId=1', 'targetType=OTHER', 'action=OTHER', 'action[]=USER_PROMOTED', 'targetId=-1&targetType=USER', 'unknown=1', 'page=9999999999999999999999999'] as $query) {
            $this->send('GET', '/api/staff/operations?'.$query);
            self::assertResponseStatusCodeSame(400);
        }
        foreach (['POST', 'PATCH', 'DELETE'] as $method) {
            $this->send($method, $method === 'POST' ? '/api/staff/operations' : '/api/staff/operations/'.$older['id'], ['action' => 'USER_PROMOTED']);
            self::assertResponseStatusCodeSame(405);
        }
        self::assertSame(2, (int) $db->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
    }

    public function testHistoryFailureRollsBackUserReportAndTokenChanges(): void
    {
        $report = new UserReport($this->author, $this->target, 'Reason');
        $this->em->persist($report);
        $this->em->flush();
        $reportId = $report->toApiArray()['id'];
        $db = $this->em->getConnection();
        $db->insert('tokens', ['user_id' => $this->target->getId(), 'expiration_date' => '2030-01-01 00:00:00']);
        $tokenId = $db->lastInsertId();
        // A real database failure verifies atomicity without changing production code.
        $db->executeStatement("CREATE TRIGGER reject_staff_log BEFORE INSERT ON staff_operation_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test history failure'");
        try {
            $this->send('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'INACTIVE']);
            self::assertResponseStatusCodeSame(500);
            self::assertSame('ACTIVE', $db->fetchOne('SELECT account_status FROM users WHERE id = ?', [$this->target->getId()]));
            $this->send('PATCH', '/api/staff/reports/'.$reportId.'/review', ['status' => 'CONFIRMED', 'reviewNote' => 'Checked']);
            self::assertResponseStatusCodeSame(500);
            self::assertSame('PENDING', $db->fetchOne('SELECT status FROM user_reports WHERE id = ?', [$reportId]));
            $this->send('POST', '/api/staff/reports/'.$reportId.'/claim');
            self::assertResponseStatusCodeSame(500);
            self::assertSame(['status' => 'PENDING', 'assigned_to_id' => null, 'assigned_at' => null], $db->fetchAssociative('SELECT status, assigned_to_id, assigned_at FROM user_reports WHERE id = ?', [$reportId]));
            $this->send('POST', '/api/staff/tokens', ['userId' => $this->target->getId()]);
            self::assertResponseStatusCodeSame(500);
            self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM tokens'));
            $this->send('PATCH', '/api/staff/tokens/'.$tokenId, ['expiresAt' => '2031-01-01T00:00:00Z']);
            self::assertResponseStatusCodeSame(500);
            self::assertSame('2030-01-01 00:00:00', $db->fetchOne('SELECT expiration_date FROM tokens WHERE id = ?', [$tokenId]));
            $this->send('DELETE', '/api/staff/tokens/'.$tokenId);
            self::assertResponseStatusCodeSame(500);
            self::assertNull($db->fetchOne('SELECT deleted_at FROM tokens WHERE id = ?', [$tokenId]));
            self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
        } finally {
            $db->executeStatement('DROP TRIGGER reject_staff_log');
        }
        $this->send('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'INACTIVE']);
        self::assertResponseIsSuccessful();
        self::assertSame(1, (int) $db->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
    }

    public function testClaimAssignsTheReportAndOnlyTheAssigneeCanCloseIt(): void
    {
        $otherStaff = $this->createUser('other_staff', [User::ROLE_STAFF]);
        $reports = [
            'CONFIRMED' => new UserReport($this->author, $this->target, 'Reason'),
            'REJECTED' => new UserReport($this->target, $this->author, 'Reverse reason'),
        ];
        foreach ($reports as $report) { $this->em->persist($report); }
        $this->em->flush();
        foreach ($reports as $outcome => $report) {
            $id = $report->toApiArray()['id'];
            $path = '/api/staff/reports/'.$id;
            $this->authenticate($this->staff);
            $this->send('POST', $path.'/claim');
            self::assertResponseIsSuccessful();
            $claimed = $this->data()['report'];
            self::assertSame('IN_REVIEW', $claimed['status']);
            self::assertSame($this->staff->getId(), $claimed['assignedTo']['id']);
            self::assertSame(['id', 'username', 'name', 'surname'], array_keys($claimed['assignedTo']));
            self::assertNotNull($claimed['assignedAt']);
            self::assertNull($claimed['reviewedBy']);
            self::assertNull($claimed['reviewedAt']);
            self::assertNull($claimed['reviewNote']);
            $this->send('GET', $path);
            self::assertSame($claimed, $this->data()['report']);
            $this->send('GET', '/api/staff/reports?status=IN_REVIEW');
            self::assertSame([$claimed], $this->data()['reports']);
            $this->send('POST', $path.'/claim');
            self::assertResponseStatusCodeSame(409);
            $this->authenticate($otherStaff);
            $this->send('POST', $path.'/claim');
            self::assertResponseStatusCodeSame(409);
            $this->send('PATCH', $path.'/review', ['status' => $outcome, 'reviewNote' => 'Checked']);
            self::assertResponseStatusCodeSame(403);
            $this->send('GET', $path);
            self::assertSame($claimed, $this->data()['report']);
            $this->authenticate($this->staff);
            $this->send('PATCH', $path.'/review', ['status' => $outcome, 'reviewNote' => 'Checked']);
            self::assertResponseIsSuccessful();
            $closed = $this->data()['report'];
            self::assertSame($outcome, $closed['status']);
            self::assertSame($claimed['assignedTo'], $closed['assignedTo']);
            self::assertSame($claimed['assignedAt'], $closed['assignedAt']);
            self::assertSame($this->staff->getId(), $closed['reviewedBy']['id']);
            self::assertNotNull($closed['reviewedAt']);
            $this->send('POST', $path.'/claim');
            self::assertResponseStatusCodeSame(409);
            $this->send('PATCH', $path.'/review', ['status' => $outcome, 'reviewNote' => 'Again']);
            self::assertResponseStatusCodeSame(409);
            $this->send('GET', '/api/staff/operations?targetType=REPORT&targetId='.$id);
            $logs = $this->data()['operations'];
            self::assertSame(['REPORT_REVIEWED', 'REPORT_CLAIMED'], array_column($logs, 'action'));
            self::assertSame('PENDING', $logs[1]['before']['status']);
            self::assertNull($logs[1]['before']['assignedToId']);
            self::assertSame('IN_REVIEW', $logs[1]['after']['status']);
            self::assertSame($this->staff->getId(), $logs[1]['after']['assignedToId']);
            self::assertSame($claimed['assignedAt'], $logs[1]['after']['assignedAt']);
            self::assertSame($logs[1]['after'], $logs[0]['before']);
        }
        $this->send('GET', '/api/staff/operations?action=REPORT_CLAIMED');
        self::assertResponseIsSuccessful();
        self::assertCount(2, $this->data()['operations']);
    }

    public function testClaimRejectsUnknownFieldsAndInvalidJson(): void
    {
        $path = '/api/staff/reports/2147483647/claim';
        $this->send('POST', $path);
        self::assertResponseStatusCodeSame(404);
        $this->send('POST', $path, []);
        self::assertResponseStatusCodeSame(404);
        foreach (['{"assignedTo":1}', '{"status":"IN_REVIEW"}', '{invalid', 'null', '"text"'] as $body) {
            $this->client->request('POST', $path, [], [], ['CONTENT_TYPE' => 'application/json'], $body);
            self::assertResponseStatusCodeSame(400);
        }
        $this->send('PATCH', '/api/staff/reports/1/review', ['status' => 'IN_REVIEW', 'reviewNote' => 'Note']);
        self::assertResponseStatusCodeSame(400);
    }

    public function testConcurrentClaimsAssignTheReportOnlyOnce(): void
    {
        $otherStaff = $this->createUser('other_staff', [User::ROLE_STAFF]);
        $report = new UserReport($this->author, $this->target, 'Reason');
        $this->em->persist($report);
        $this->em->flush();
        $id = $report->toApiArray()['id'];
        $results = $this->race('user_reports', $id, [
            ['method' => 'POST', 'path' => '/api/staff/reports/'.$id.'/claim'],
            ['method' => 'POST', 'path' => '/api/staff/reports/'.$id.'/claim', 'token' => $this->token($otherStaff)],
        ]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        self::assertSame([200, 409], $statuses);
        $winner = $results[0]['status'] === 200 ? $results[0] : $results[1];
        $this->em->clear();
        self::assertSame($winner['data']['report'], $this->em->find(UserReport::class, $id)->toStaffApiArray());
        self::assertSame(1, (int) $this->em->getConnection()->fetchOne("SELECT COUNT(*) FROM staff_operation_logs WHERE action = 'REPORT_CLAIMED'"));
    }

    public function testConcurrentClaimAndDirectReviewPreserveTheWinningOperation(): void
    {
        $otherStaff = $this->createUser('other_staff', [User::ROLE_STAFF]);
        $report = new UserReport($this->author, $this->target, 'Reason');
        $this->em->persist($report);
        $this->em->flush();
        $id = $report->toApiArray()['id'];
        $results = $this->race('user_reports', $id, [
            ['method' => 'POST', 'path' => '/api/staff/reports/'.$id.'/claim'],
            ['method' => 'PATCH', 'path' => '/api/staff/reports/'.$id.'/review', 'body' => ['status' => 'CONFIRMED', 'reviewNote' => 'Checked'], 'token' => $this->token($otherStaff)],
        ]);
        if ($results[0]['status'] === 200) {
            self::assertSame(403, $results[1]['status']);
            $winner = $results[0];
        } else {
            self::assertSame(409, $results[0]['status']);
            self::assertSame(200, $results[1]['status']);
            $winner = $results[1];
        }
        $this->em->clear();
        self::assertSame($winner['data']['report'], $this->em->find(UserReport::class, $id)->toStaffApiArray());
        self::assertSame(1, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
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
                $result = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
                self::assertLessThan(500, $result['status'], $process->getErrorOutput());
                $results[] = $result;
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
