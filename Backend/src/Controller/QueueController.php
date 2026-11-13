<?php

namespace App\Controller;

use App\Entity\User;
use App\Message\QueueId;

use App\Manager\UserManager;
use App\Manager\ServiceQueueManager;

use App\Exception\NotEnoughCreditsException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class QueueController extends AbstractController
{
    private ServiceQueueManager $serviceQueueManager;
    private UserManager $userManager;
    public function __construct(ServiceQueueManager $serviceQueueManager, UserManager $userManager)
    {
        $this->serviceQueueManager = $serviceQueueManager;
        $this->userManager = $userManager;
    }

    #[Route('/create-service-queue', name: 'create_queue', methods: ['POST'])]
    public function createQueue(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }

        try{
            $data = json_decode($this->getRequest()->getContent(), true);
            if(!is_array($data)) {
                return $this->json(['error' => 'Request data must be a JSON object'], 400);
            }
            if(!isset($data['queueType'])){
                return $this->json(['error' => 'Missing parameter: queueType'], 400);
            }
            $this->serviceQueueManager->createServiceQueue($user, $data['queueType']);
            return $this->json(['message' => 'Service queue created successfully'], 201);

        }catch(NotEnoughCreditsException){
            return $this->json(['error' => 'Not enough credits'], 400);
        }
        catch(Exception $e){
            return $this->json(['error' => 'Internal server error: ' . $e->getMessage()], 500);
        }
    }
}
