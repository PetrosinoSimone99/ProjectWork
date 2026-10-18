<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\Request;

#[Route('/api')]
final class ExchangeMutualController extends AbstractController
{
    private ExchangeMutualManager $exchangeMutualManager;

    public function __construct(ExchangeMutualManager $exchangeMutualManager)
    {
        $this->exchangeMutualManager = $exchangeMutualManager;
    }

    #[Route('/exchange-mutual/{proposalId}', name: 'create_exchange_mutual', methods: ['POST'])]
    public function createExchangeMutualFromProposalId(Request $request, int $proposalId): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User) {
            return $this->json(['error' => 'User not authenticated'], 401);
        }

        try{
            $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if(!is_array($data)) {
                return $this->json(['error' => 'Invalid JSON'], 400);
            }

            $this->exchangeMutualManager->createExchangeMutual($proposalId);


        }
        catch(\JsonException) {
            return $this->json(['error' => 'Invalid JSON'], 400);
        }
        catch(\InvalidArgumentException $e) {
            return $this->json(['error' => 'Invalid exchange'], 400);
        }
        catch(\Exception){
            return $this->json(['error' => 'An unexpected error occurred'], 500);
        }
    }
}
