<?php
declare(strict_types=1);

namespace App\Controller;
use App\Manager\ChatManager;
use App\Entity\User;
use App\DTO\ChatMessageDTO;
use App\DTO\GroupParticipantDTO;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\Request;


#[Route('/api')]
class ChatController extends AbstractController
{
    private ChatManager $chatManager;

    public function __construct(ChatManager $chatManager)
    {
        $this->chatManager = $chatManager;
    }

    #[Route('/chats/mutual-proposal/{proposalId}', name: 'get_chat_by_proposal_id', methods: ['GET'])]
    public function getChatAndHistoryByProposalId(int $proposalId): JsonResponse
    {
        try{
            $chat = $this->chatManager->getOrCreateMutualProposalChat($proposalId);
            $chatMessageDTOs = $this->chatManager->getChatHistory($chat->getId());
            
            return $this->json(["chatId" => $chat->getId(),"messages" => $chatMessageDTOs]);

        }catch(\Exception $e){
            return $this->json(["error" => (string)$e], 400);
        }
        
    }

    #[Route('/chats/group-proposal/beneficiary/{groupProposalId}', name: 'get_chat_by_proposal_id', methods: ['GET'])]
    public function getChatAndHistoryByGroupProposalIdBeneficiary(int $groupProposalId): JsonResponse
    {
        $user = $this->getUser();

        try{
            
            $chat = $this->chatManager->getOrCreateGroupProposalChatBeneficiary($groupProposalId, $user->getId());

            $chatMessageDTOs = $this->chatManager->getChatHistory($chat->getId());
            
            return $this->json(["chatId" => $chat->getId(),"messages" => $chatMessageDTOs]);

        }catch(\Exception $e){
            return $this->json(["error" => (string)$e], 400);
        }
    }

    #[Route('/chats/group-proposal/provider/{groupProposalId}', name: 'get_chat_by_proposal_id', methods: ['GET'])]
    public function getChatAndHistoryByGroupProposalIdProvider(int $groupProposalId): JsonResponse
    {
        $user = $this->getUser();

        try{
            $chat = $this->chatManager->getOrCreateGroupProposalChatProvider($groupProposalId, $user);

            $chatMessageDTOs = $this->chatManager->getChatHistory($chat->getId());
            
            return $this->json(["chatId" => $chat->getId(),"messages" => $chatMessageDTOs]);

        }catch(\Exception $e){
            return $this->json(["error" => (string)$e], 400);
        }
    }

    #[Route('/chats/send-message/{chatId}', name: 'send_message', methods: ['POST'])]
    public function sendMessage(Request $request, int $chatId): JsonResponse
    {   
        $data = json_decode($request->getContent(), true);
        $user = $this->getUser();
        $message = $data['message'] ?? null;

        if ($user === null || $message === null) {
            return $this->json(['error' => 'One or more parameters are missing'], 400);
        }

        try {
            $this->chatManager->sendMessage($chatId, $user, $message);
            return $this->json(['success' => true]);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => (string)$e], 400);
        }
    }

}