<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Entity\UserReport;
use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Tests staff notifications against the selected dump, using only isolated SQLite. */
final class StaffNotificationTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private User $staff;
    private User $reporter;
    private User $target;
    private int $reportId;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->client->disableReboot();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        self::assertInstanceOf(\Doctrine\DBAL\Platforms\SQLitePlatform::class, $this->em->getConnection()->getDatabasePlatform());
        $this->dropTables();
        ReferenceDatabaseSchema::create($this->em->getConnection());
        $this->em->getConnection()->executeStatement('PRAGMA foreign_keys = ON');
        $this->staff = $this->user('staff', [User::ROLE_STAFF]);
        $this->reporter = $this->user('reporter');
        $this->target = $this->user('target');
        $report = new UserReport($this->reporter, $this->target, 'Private original reason');
        $this->em->persist($report);
        $this->em->flush();
        $this->reportId = $report->toApiArray()['id'];
        $this->authenticate($this->staff);
    }

    protected function tearDown(): void
    {
        if (isset($this->em)) { $this->dropTables(); }
        parent::tearDown();
    }

    private function dropTables(): void
    {
        $db = $this->em->getConnection();
        $db->executeStatement('PRAGMA foreign_keys = OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) {
            $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
        }
    }

    public function testUserChangesNotifyOnlyWhenTheStateChanges(): void
    {
        $id = $this->target->getId();
        foreach (['ACTIVE', 'INACTIVE', 'INACTIVE', 'ACTIVE'] as $status) {
            $this->client->jsonRequest('PATCH', '/api/staff/users/'.$id.'/status', ['accountStatus' => $status]);
            self::assertResponseIsSuccessful();
        }
        foreach ([1, 2] as $attempt) {
            $this->client->request('POST', '/api/staff/users/'.$id.'/promote');
            self::assertResponseIsSuccessful();
        }
        $this->assertNotifications([
            [$id, 'USER_STATUS_CHANGED', 'Your account has been deactivated.', ['userId' => $id, 'accountStatus' => 'INACTIVE']],
            [$id, 'USER_STATUS_CHANGED', 'Your account has been reactivated.', ['userId' => $id, 'accountStatus' => 'ACTIVE']],
            [$id, 'USER_PROMOTED', 'Your account has been promoted to staff.', ['userId' => $id]],
        ]);
        self::assertSame(3, (int) $this->em->getConnection()->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
    }

    public static function outcomes(): iterable
    {
        yield 'confirmed' => ['CONFIRMED', 'Your report has been reviewed and confirmed.'];
        yield 'rejected' => ['REJECTED', 'Your report has been reviewed and rejected.'];
    }

    #[DataProvider('outcomes')]
    public function testClaimAndReviewNotifyOnlyTheReporter(string $status, string $message): void
    {
        $path = '/api/staff/reports/'.$this->reportId;
        $this->client->request('POST', $path.'/claim');
        self::assertResponseIsSuccessful();
        $this->client->request('POST', $path.'/claim');
        self::assertResponseStatusCodeSame(409);
        $this->client->jsonRequest('PATCH', $path.'/review', ['status' => $status, 'reviewNote' => 'Private staff note']);
        self::assertResponseIsSuccessful();
        $this->client->jsonRequest('PATCH', $path.'/review', ['status' => $status, 'reviewNote' => 'Repeated']);
        self::assertResponseStatusCodeSame(409);
        $this->assertNotifications([
            [$this->reporter->getId(), 'REPORT_CLAIMED', 'Your report is now being reviewed.', ['reportId' => $this->reportId, 'status' => 'IN_REVIEW']],
            [$this->reporter->getId(), 'REPORT_REVIEWED', $message, ['reportId' => $this->reportId, 'status' => $status]],
        ]);
    }

    public function testRejectedRequestsAndReadingStaffPagesDoNotNotify(): void
    {
        foreach (['/api/staff/users', '/api/staff/reports', '/api/staff/operations'] as $path) {
            $this->client->request('GET', $path);
            self::assertResponseIsSuccessful();
        }
        $this->client->jsonRequest('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'INVALID']);
        self::assertResponseStatusCodeSame(400);
        $this->client->request('POST', '/api/staff/users/999999/promote');
        self::assertResponseStatusCodeSame(404);
        $otherStaff = $this->user('otherstaff', [User::ROLE_STAFF]);
        $report = $this->em->find(UserReport::class, $this->reportId);
        $report->claim($otherStaff);
        $this->em->flush();
        $this->client->jsonRequest('PATCH', '/api/staff/reports/'.$this->reportId.'/review', ['status' => 'CONFIRMED', 'reviewNote' => 'Not assigned']);
        self::assertResponseStatusCodeSame(403);
        $this->authenticate($this->reporter);
        $this->client->request('POST', '/api/staff/users/'.$this->target->getId().'/promote');
        self::assertResponseStatusCodeSame(403);
        $this->authenticate(null);
        $this->client->request('POST', '/api/staff/reports/'.$this->reportId.'/claim');
        self::assertResponseStatusCodeSame(401);
        $this->assertNotifications([]);
    }

    public static function failingOperations(): iterable
    {
        yield 'promotion' => ['promote'];
        yield 'status' => ['status'];
        yield 'claim' => ['claim'];
        yield 'review' => ['review'];
    }

    #[DataProvider('failingOperations')]
    public function testNotificationFailureRollsBackOperationAndHistory(string $operation): void
    {
        $db = $this->em->getConnection();
        $beforeUser = $db->fetchAssociative('SELECT roles, account_status FROM users WHERE id = ?', [$this->target->getId()]);
        $beforeReport = $db->fetchAssociative('SELECT * FROM user_reports WHERE id = ?', [$this->reportId]);
        // Fail at the database boundary, after the operation and its history were written.
        $db->executeStatement("CREATE TRIGGER reject_notification BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'Test notification failure'); END");
        if ($operation === 'promote') {
            $this->client->request('POST', '/api/staff/users/'.$this->target->getId().'/promote');
        } elseif ($operation === 'status') {
            $this->client->jsonRequest('PATCH', '/api/staff/users/'.$this->target->getId().'/status', ['accountStatus' => 'INACTIVE']);
        } elseif ($operation === 'claim') {
            $this->client->request('POST', '/api/staff/reports/'.$this->reportId.'/claim');
        } else {
            $this->client->jsonRequest('PATCH', '/api/staff/reports/'.$this->reportId.'/review', ['status' => 'CONFIRMED', 'reviewNote' => 'Private note']);
        }
        self::assertResponseStatusCodeSame(500);
        self::assertSame($beforeUser, $db->fetchAssociative('SELECT roles, account_status FROM users WHERE id = ?', [$this->target->getId()]));
        self::assertSame($beforeReport, $db->fetchAssociative('SELECT * FROM user_reports WHERE id = ?', [$this->reportId]));
        self::assertSame(0, (int) $db->fetchOne('SELECT COUNT(*) FROM staff_operation_logs'));
        $this->assertNotifications([]);
    }

    private function assertNotifications(array $expected): void
    {
        $rows = $this->em->getConnection()->fetchAllAssociative('SELECT * FROM notifications ORDER BY id');
        $actual = [];
        foreach ($rows as $row) {
            self::assertNull($row['read_at']);
            self::assertNotEmpty($row['created_at']);
            $actual[] = [(int) $row['user_id'], $row['type'], $row['message'], json_decode($row['data'], true, flags: JSON_THROW_ON_ERROR)];
        }
        self::assertSame($expected, $actual);
    }

    private function user(string $username, array $roles = [User::ROLE_USER]): User
    {
        $user = new User('Test', 'User', $username, $username.'@example.test');
        $user->setPassword('unused');
        $user->setRoles($roles);
        $this->em->persist($user);
        return $user;
    }

    private function authenticate(?User $user): void
    {
        $token = $user === null ? '' : static::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', $user === null ? '' : 'Bearer '.$token);
    }
}
