<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\NotificationRepository;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Turns "the notifications of one user" into Server-Sent Events frames.
 *
 * The backend has no message broker: writing a notification is a row in MySQL
 * and nothing else (see `docs/api.md`). This class is that row made push-shaped
 * — one request stays open and is told about every row that appears — without
 * adding a dependency: the events are plain `text/event-stream` bytes that a
 * client reads with `fetch` or `XMLHttpRequest`.
 *
 * Four properties the client depends on:
 *
 * 1. **The cursor belongs to the client.** A frame only ever carries a row whose
 *    id is greater than the one the request asked from, so a reconnect cannot
 *    replay what the client already applied and a slow tick cannot skip one.
 *    Without a cursor the stream starts at *now*: the first page the client
 *    reads backfills history, and the stream is only the live edge.
 * 2. **The connection has a deadline** (`maxSeconds`). A PHP worker serves one
 *    request at a time; an endless stream would eat the whole pool of the dev
 *    server. Closing and reconnecting with the last id is cheaper than a
 *    keep-alive that never ends.
 * 3. **Silence is not death.** A comment frame (`: ping`) goes out every
 *    `heartbeatMs`, so a client can tell a quiet minute from a dead socket.
 * 4. **A chat message is a notification.** Sending a message already writes a
 *    `CHAT_MESSAGE` row carrying `chatId` and the text, so the chat screen
 *    refreshes from the same single event type. There is no second stream.
 */
final class NotificationEventStream
{
    public function __construct(
        private readonly NotificationRepository $notifications,
        private readonly Clock $clock,
        #[Autowire('%app.stream.poll_ms%')] private readonly int $pollMs = 1000,
        #[Autowire('%app.stream.heartbeat_ms%')] private readonly int $heartbeatMs = 15000,
        #[Autowire('%app.stream.max_seconds%')] private readonly int $maxSeconds = 30,
    ) {}

    /**
     * The frames of one connection, in order, oldest notification first.
     *
     * `$afterId` is the client's cursor; `null` means "I have nothing yet", and
     * is answered by starting at the newest existing row instead of replaying
     * the whole inbox.
     *
     * @return \Generator<int, string>
     */
    public function frames(User $user, ?int $afterId): \Generator
    {
        $cursore = $afterId ?? $this->notifications->newestIdFor($user);

        yield $this->frame('hello', null, [
            'lastId' => $cursore,
            'unreadCount' => $this->notifications->countUnread($user),
        ]);

        $adesso = $this->clock->now();
        $scadenza = $adesso->modify(sprintf('+%d seconds', $this->maxSeconds));
        $ultimoBattito = $adesso;

        while (($adesso = $this->clock->now()) < $scadenza) {
            $nuove = $this->notifications->findNewerThan($user, $cursore);
            $nonLette = null;
            foreach ($nuove as $notification) {
                $cursore = (int) $notification->getId();
                // One count per batch, not one per row: the badge is the same
                // number for every frame of the tick that produced it.
                $nonLette ??= $this->notifications->countUnread($user);
                yield $this->frame('notification', $cursore, [
                    'notification' => $notification->toApiArray(),
                    'unreadCount' => $nonLette,
                ]);
            }
            if ($nuove !== []) {
                $ultimoBattito = $adesso;
            } elseif ($adesso->getTimestamp() - $ultimoBattito->getTimestamp() >= intdiv($this->heartbeatMs, 1000)) {
                $ultimoBattito = $adesso;
                yield ": ping\n\n";
            }
            $this->pausa();
        }
    }

    private function pausa(): void
    {
        if ($this->pollMs > 0) {
            usleep($this->pollMs * 1000);
        }
    }

    /** One SSE frame. `json_encode` escapes newlines, so `data:` stays on one line. */
    private function frame(string $event, ?int $id, array $data): string
    {
        $testo = 'event: '.$event."\n";
        if ($id !== null) {
            $testo .= 'id: '.$id."\n";
        }

        return $testo.'data: '.json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n\n";
    }
}
