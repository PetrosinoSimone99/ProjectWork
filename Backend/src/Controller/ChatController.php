<?php
declare(strict_types=1);

namespace App\Controller;
use App\Manager\ChatManager;
use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\Request;
use JsonException;
use App\Exception\ChatNotFoundException;

#[Route('/api')]
class ChatController extends AbstractController
{
    private ChatManager $chatManager;

    public function __construct(ChatManager $chatManager)
    {
        $this->chatManager = $chatManager;
    }

    #[Route('/chats/agreement/{agreementId}', name: 'get_chat_by_agreement_id', methods: ['GET'])]
    public function getChatAndHistoryByAgreementId(int $agreementId): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }

        try{
            $chat = $this->chatManager->getOrCreateChat($agreementId);
            $chatMessageDTOs = $this->chatManager->getChatHistory($chat);
            
            return $this->json(['chatId' => $chat->getId(),'messages' => $chatMessageDTOs]);

        }catch (\InvalidArgumentException) {
            return $this->json(['error' => 'Invalid chat'], 400);
        }
        catch(\Exception $e){
            return $this->json(['error' => 'Internal server error '. $e->getMessage()], 500);
        }
        
    }

    #[Route('/chats/send-message/{chatId}', name: 'send_message', methods: ['POST'])]
    public function sendMessage(Request $request, int $chatId): JsonResponse
    {   
        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }
        
        try {
            $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if(!is_array($data)) {
                return $this->json(['error' => 'Request data must be a JSON object'], 400);
            }
            $message = $data['message'] ?? null;

            if(!is_string($message)) {
                return $this->json(['error' => 'Message must be a string'], 400);
            }

            $this->chatManager->sendMessage($chatId, $user, $message = 'Hello Bob');
            return $this->json(['success' => ['code' => 200, 'message' => 'Message sent successfully']], 200);
        }
        catch (JsonException) {
            return $this->json(['error' => 'Invalid JSON'], 400);
        }
        catch (ChatNotFoundException) {
            return $this->json(['error' => 'Invalid chat'], 400);
        }
        catch (\InvalidArgumentException) {
            return $this->json(['error' => 'Invalid message'], 400);
        }
        catch (\Exception $e) {
            return $this->json(['error' => 'An unexpected error occurred '. $e->getMessage()], 500);
        }
        
    }

    #[Route('/chats/most-recent-message', name: 'get_most_recent_message', methods: ['GET'])]
    public function getUserMostRecentReceivedMessage(): JsonResponse
    {   
        //$user = $this->getUser();
        $user = $this->userManager->getUserById(1); // Replace 1 with the actual user ID you want to test with
        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }
        
        try{
            $mostRecentMessage = $this->chatManager->getUserMostRecentReceivedMessage($user);

            if($mostRecentMessage === null){
                return $this->json(['chatMessageId' => null]);
            }

            return $this->json(['chatMessageId' => $mostRecentMessage->getId()]);

        }catch(\Exception){
            return $this->json(['error' => 'An unexpected error occurred'], 500);
        }
    }

    #[Route('/chats/check-new-messages/{recentMessageId}', name: 'check_new_messages', methods: ['GET'])]
    public function checkNewMessagesForUser(int $recentMessageId): JsonResponse
    {
        $user = $this->getUser();

        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }
        try{
            $chatMessageDTOS = $this->chatManager->checkNewMessagesForUser($user, $recentMessageId);

            return $this->json($chatMessageDTOS);

        }catch(\Exception $e){
            return $this->json(['error' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
        }
    }
}
