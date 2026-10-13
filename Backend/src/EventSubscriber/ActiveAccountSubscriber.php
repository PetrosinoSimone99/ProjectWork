<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\User;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/** Blocks inactive accounts even when they still hold a valid JWT. */
final class ActiveAccountSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly TokenStorageInterface $tokens) {}

    public static function getSubscribedEvents(): array
    {
        // The firewall runs first and reloads the user from the database.
        return [KernelEvents::REQUEST => ['onKernelRequest', 0]];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) { return; }
        $request = $event->getRequest();
        $path = $request->getPathInfo();
        // These exceptions match the public routes in security.yaml.
        if (!str_starts_with($path, '/api') || str_starts_with($path, '/api/auth')
            || (str_starts_with($path, '/api/categories') && $request->isMethod('GET'))
            || $request->isMethod('OPTIONS')) {
            return;
        }
        $user = $this->tokens->getToken()?->getUser();
        if ($user instanceof User && !$user->isActive()) {
            $event->setResponse(new JsonResponse(['error' => 'This account is inactive.'], 403));
        }
    }
}
