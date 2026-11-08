<?php

namespace App\Controller;

use App\Message\QueueId;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Messenger\MessageBusInterface;

#[Route('/api')]
final class QueueController extends AbstractController
{
    private MessageBusInterface $messageBus;
    public function __construct(MessageBusInterface $messageBus)
    {
        $this->messageBus = $messageBus;
    }

    #[Route('/create-queue', name: 'create_queue')]
    public function createQueue(): JsonResponse
    {
        $this->messageBus->dispatch(new QueueId('12345'));
        return new JsonResponse(['status' => 'Queue created and message dispatched.']);
    }
}
