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

    #[Route('/chats/mutual-proposal/{proposalId}', name: 'get_chat_by_mutual_proposal_id', methods: ['GET'])]
    public function getChatAndHistoryByProposalId(int $proposalId): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }

        try{
            $chat = $this->chatManager->getOrCreateMutualProposalChat($proposalId);
            $chatMessageDTOs = $this->chatManager->getChatHistory($chat->getId());
            
            return $this->json(['chatId' => $chat->getId(),'messages' => $chatMessageDTOs]);

        }catch (\InvalidArgumentException) {
            return $this->json(['error' => 'Invalid chat'], 400);
        }
        catch(\Exception){
            return $this->json(['error' => 'An unexpected error occurred'], 500);
        }
        
    }

    #[Route('/chats/group-proposal/beneficiary/{groupProposalId}', name: 'get_chat_by_group_proposal_id_beneficiary', methods: ['GET'])]
    public function getChatAndHistoryByGroupProposalIdBeneficiary(int $groupProposalId): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }
        try{
            $chat = $this->chatManager->getOrCreateGroupProposalChatBeneficiary($groupProposalId, $user->getId());

            $chatMessageDTOs = $this->chatManager->getChatHistory($chat->getId());
            
            return $this->json(['chatId' => $chat->getId(),'messages' => $chatMessageDTOs]);

        }catch (\InvalidArgumentException) {
            return $this->json(['error' => 'Invalid chat'], 400);
        }
        catch(\Exception){
            return $this->json(['error' => 'An unexpected error occurred'], 500);
        }
    }

    #[Route('/chats/group-proposal/provider/{groupProposalId}', name: 'get_chat_by_group_proposal_id_provider', methods: ['GET'])]
    public function getChatAndHistoryByGroupProposalIdProvider(int $groupProposalId): JsonResponse
    {        
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }
        try{
            $chat = $this->chatManager->getOrCreateGroupProposalChatProvider($groupProposalId, $user->getId());

            $chatMessageDTOs = $this->chatManager->getChatHistory($chat->getId());
            
            return $this->json(['chatId' => $chat->getId(),'messages' => $chatMessageDTOs]);


        }
        catch (\InvalidArgumentException) {
            return $this->json(['error' => 'Invalid chat'], 400);
        }
        catch(\Exception){
            return $this->json(['error' => 'An unexpected error occurred'], 500);
        }
    }

    #[Route('/chats/send-message/{chatId}', name: 'send_message', methods: ['POST'])]
    public function sendMessage(Request $request, int $chatId): JsonResponse
    {   
        $user = $this->getUser();
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

            $this->chatManager->sendMessage($chatId, $user->getId(), $message);
            return $this->json(['success' => true]);
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
        catch (\Exception) {
            return $this->json(['error' => 'An unexpected error occurred'], 500);
        }
        
    }

    #[Route('/chats/most-recent-message', name: 'get_most_recent_message', methods: ['GET'])]
    public function getUserMostRecentReceivedMessage(): JsonResponse
    {   
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => 'User not authenticated'], 401);
        }
        
        try{
            $mostRecentMessage = $this->chatManager->getUserMostRecentReceivedMessage($user->getId());

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
            $chatMessageDTOS = $this->chatManager->checkNewMessagesForUser($user->getId(), $recentMessageId);

            return $this->json($chatMessageDTOS);

        }catch(\Exception){
            return $this->json(['error' => 'An unexpected error occurred'], 500);
        }
    }
}
