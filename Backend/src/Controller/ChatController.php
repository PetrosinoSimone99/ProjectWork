<?php
declare(strict_types=1);

namespace App\Controller;
use App\Manager\ChatManager;
use App\Entity\User;
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

    #[Route('/chats/{proposalId}', name: 'get_chat_by_proposal_id', methods: ['GET'])]
    public function getChatByProposalId(int $proposalId): JsonResponse
    {
        try{
            $chatId = $this->chatManager->getChatByProposalId($proposalId);

            return $this->json(["chatId" => $chatId]);

        }catch(\Exception $e){
            return $this->json(["error" => (string)$e], 400);
        }
        
    }

    #[Route('/chats/{chatId}/history', name: 'get_chat_history', methods: ['GET'])]
    public function getChatHistory(int $chatId): JsonResponse
    {
        try{
            $chatHistory = $this->chatManager->getChatHistory($chatId);
            return $this->json($chatHistory);

        }catch(\Exception $e){
            return $this->json(["error" => (string)$e], 400);
        }
    }

    #[Route('/chats/{chatId}/send', name: 'send_message', methods: ['POST'])]
    public function sendMessage(Request $request, int $chatId): JsonResponse
    {   
        $data = json_decode($request->getContent(), true);
        $user = $this->getUser();
        $message = $data['message'] ?? null;

        if ($userId === null || $message === null) {
            return $this->json(['error' => 'One or more paramters are missing'], 400);
        }

        try {
            $this->chatManager->sendMessage($chatId, $user, $message);
            return $this->json(['success' => true]);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => (string)$e], 400);
        }
    }

}