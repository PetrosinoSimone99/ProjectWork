<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\NotificationEventStream;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The only push-shaped route of the API: one request per client, kept open.
 *
 * JWT and active-account checks are shared with the other protected APIs, so
 * this controller only validates the cursor and then hands the response to the
 * stream. Whatever it sends goes through `CorsSubscriber` like every `/api`
 * response.
 */
#[Route('/api/stream')]
final class StreamController extends AbstractController
{
    public function __construct(private readonly NotificationEventStream $stream) {}

    #[Route('', name: 'api_stream', methods: ['GET'])]
    public function __invoke(Request $request): Response
    {
        $filters = $request->query->all();
        if (array_diff(array_keys($filters), ['after']) !== []) {
            return $this->json(['error' => 'The request contains an unknown query parameter.'], 400);
        }
        // `after` is a cursor, not an id to fetch: absent means "start at now",
        // zero means "replay my whole inbox", and both are valid answers.
        $cursor = null;
        if (array_key_exists('after', $filters)) {
            $cursor = $this->cursor($filters['after']);
            if ($cursor === null) {
                return $this->json(['error' => 'The after parameter must be a non-negative integer.'], 400);
            }
        }

        /** @var User $user */
        $user = $this->getUser();

        $response = new StreamedResponse(function () use ($user, $cursor): void {
            foreach ($this->stream->frames($user, $cursor) as $frame) {
                echo $frame;
                // Leave the buffers alone and only push what is there: closing
                // them here would also close the ones a test or an outer
                // caller owns.
                if (ob_get_level() > 0) {
                    @ob_flush();
                }
                flush();
                // A client that walked away must not keep a worker busy.
                if (connection_aborted()) {
                    return;
                }
            }
        });
        $response->headers->set('Content-Type', 'text/event-stream; charset=utf-8');
        $response->headers->set('Cache-Control', 'no-cache, no-store, no-transform');
        // Proxies buffer by default; both sides of the dev stack say otherwise.
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }

    private function cursor(mixed $value): ?int
    {
        if (!is_string($value) || !ctype_digit($value)) {
            return null;
        }

        $cursor = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);

        return $cursor === false ? null : $cursor;
    }
}
