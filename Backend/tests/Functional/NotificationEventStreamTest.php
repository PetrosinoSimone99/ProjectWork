<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Repository\NotificationRepository;
use App\Service\Clock;
use App\Service\NotificationEventStream;
use App\Service\NotificationService;
use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Frames of the live stream, read from the generator the controller sends.
 *
 * The clock advances ten seconds per reading and the budget is a hundred, so a
 * whole connection ends after a fixed number of ticks: the assertions are
 * deterministic and the test never sleeps (`pollMs` is zero).
 */
final class NotificationEventStreamTest extends WebTestCase
{
    private const BUDGET_SECONDS = 100;
    private const HEARTBEAT_MS = 15000;

    private EntityManagerInterface $em;
    private NotificationRepository $notifications;
    private NotificationService $notify;
    private NotificationEventStream $stream;
    private User $alice;
    private User $bob;

    protected function setUp(): void
    {
        static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $this->em->getConnection();
        $db->executeStatement('PRAGMA foreign_keys = OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) {
            $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
        }
        ReferenceDatabaseSchema::create($db);
        $db->executeStatement('PRAGMA foreign_keys = ON');
        $this->alice = $this->user('alice');
        $this->bob = $this->user('bob');
        $this->em->flush();
        $clock = new AdvancingClock();
        static::getContainer()->set(Clock::class, $clock);
        $this->notify = new NotificationService($this->em, $clock);
        $this->notifications = static::getContainer()->get(NotificationRepository::class);
        $this->stream = new NotificationEventStream($this->notifications, $clock, 0, self::HEARTBEAT_MS, self::BUDGET_SECONDS);
    }

    public function testNoCursorStartsAtTheNewestRowInsteadOfReplayingTheInbox(): void
    {
        $this->notify->notify($this->alice, 'EXAMPLE', 'Old news.');
        $this->notify->notify($this->alice, 'EXAMPLE', 'Older news.');

        $frames = $this->frames(null);

        self::assertStringContainsString('event: hello', $frames[0]);
        self::assertSame([], $this->events($frames, 'notification'));
        // The hello count still describes the whole inbox, and the cursor it
        // hands back is the newest row: the client starts at the live edge.
        self::assertSame(2, $this->payload($frames[0])['unreadCount']);
        self::assertSame($this->notifications->newestIdFor($this->alice), $this->payload($frames[0])['lastId']);
    }

    public function testOnlyRowsNewerThanTheCursorArriveAndOnlyForTheCaller(): void
    {
        $first = $this->notify->notify($this->alice, 'AGREEMENT_PROPOSAL', 'Uno.', ['agreementId' => 1]);
        $this->notify->notify($this->bob, 'EXAMPLE', 'Not mine.');
        $second = $this->notify->notify($this->alice, 'CHAT_MESSAGE', 'Due.', ['chatId' => 3, 'message' => 'ciao']);

        $frames = $this->frames(0);
        $events = $this->events($frames, 'notification');

        self::assertCount(2, $events);
        self::assertSame([$first->getId(), $second->getId()], array_map($this->frameId(...), $events));
        // A chat message is a notification: one stream, no second event type.
        self::assertSame('CHAT_MESSAGE', $this->payload($events[1])['notification']['type']);
        self::assertSame(3, $this->payload($events[1])['notification']['data']['chatId']);
        self::assertSame($second->getId(), $this->payload($events[1])['notification']['id']);
        self::assertSame(2, $this->payload($events[1])['unreadCount']);
        // A foreign row is never part of the stream.
        self::assertStringNotContainsString('Not mine.', implode('', $frames));
    }

    public function testARowWrittenWhileTheStreamIsOpenArrivesOnTheNextTick(): void
    {
        $generator = $this->stream->frames($this->alice, 0);
        $hello = $generator->current();
        // The first tick finds nothing and answers with a heartbeat.
        $generator->next();
        $silence = $generator->current();
        $late = $this->notify->notify($this->alice, 'MATCH_CREATED', 'Arrived while the stream was open.');
        $generator->next();

        self::assertStringContainsString('event: hello', $hello);
        self::assertSame(": ping\n\n", $silence);
        self::assertStringContainsString('event: notification', $generator->current());
        self::assertSame($late->getId(), $this->payload($generator->current())['notification']['id']);
    }

    public function testASilentStreamSendsHeartbeatsInsteadOfNothing(): void
    {
        $frames = $this->frames(null);

        self::assertStringContainsString('event: hello', $frames[0]);
        self::assertContains(": ping\n\n", $frames);
    }

    /** @return list<string> */
    private function frames(?int $afterId): array
    {
        return array_values(iterator_to_array($this->stream->frames($this->alice, $afterId), false));
    }

    /**
     * @param list<string> $frames
     * @return list<string>
     */
    private function events(array $frames, string $event): array
    {
        return array_values(array_filter(
            $frames,
            static fn (string $frame) => str_starts_with($frame, 'event: '.$event."\n"),
        ));
    }

    private function frameId(string $frame): int
    {
        self::assertSame(1, preg_match('/^id: (\d+)$/m', $frame, $match));

        return (int) $match[1];
    }

    private function payload(string $frame): array
    {
        self::assertSame(1, preg_match('/^data: (.+)$/m', $frame, $match));

        return json_decode($match[1], true, flags: JSON_THROW_ON_ERROR);
    }

    private function user(string $username): User
    {
        $user = new User(ucfirst($username), 'Test', $username, $username.'@example.test');
        $user->setPassword('not-used-for-jwt-tests');
        $this->em->persist($user);

        return $user;
    }
}

/** A clock that moves ten seconds forward every time it is read. */
final class AdvancingClock extends Clock
{
    private int $readings = 0;

    public function now(): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('2026-11-20T09:00:00+00:00'))
            ->modify(sprintf('+%d seconds', 10 * $this->readings++));
    }
}
