<?php
declare(strict_types=1);

namespace App\Manager;

use App\Entity\User;
use App\Entity\Chat;
use App\Entity\ChatMessage;
use App\Entity\ChatParticipant;
use App\Entity\AgreementProposal;

use App\Exception\ChatNotFoundException;

use App\Manager\AgreementManager;

use App\DTO\ChatMessageDTO;

use App\Repository\ChatRepository;
use App\Repository\ChatMessageRepository;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class ChatManager
{
    private EntityManagerInterface $entityManager;
    private ChatRepository $chatRepository;
    private ChatMessageRepository $chatMessageRepository;
    private ValidatorInterface $validator;
    private UserManager $userManager;
    private AgreementManager $agreementManager;

    public function __construct(EntityManagerInterface $entityManager, ChatRepository $chatRepository, 
    ChatMessageRepository $chatMessageRepository, ValidatorInterface $validator, UserManager $userManager, AgreementManager $agreementManager) {
        $this->entityManager = $entityManager;
        $this->chatRepository = $chatRepository;
        $this->chatMessageRepository = $chatMessageRepository;
        $this->validator = $validator;
        $this->userManager = $userManager;
        $this->agreementManager = $agreementManager;
    }

    public function getOrCreateChat(int $agreementId): Chat
    {
        $chat = $this->chatRepository->getChatByAgreementId($agreementId);
        
        if($chat == null){
            $agreement = $this->agreementManager->getAgreementById($agreementId);
            $agreementProposals = $agreement->getAgreementProposals();
            $participants = [];
            foreach($agreementProposals as $agreementProposal){
                $participants[] = $agreementProposal->getUser();
            }
            $chat = $this->createChat($agreementId);
            $this->insertChatMembers($chat, $participants);
        }

        return $chat;
    }

    public function getChatHistory(Chat $chat): ?array
    {   
        $chatMessages = $this->chatMessageRepository->getChatHistory($chat);

        if($chatMessages === null){
            return [];
        }

        $chatMessageDTOs = $this->prepareChatMessageDTO($chatMessages);

        return $chatMessageDTOs;
        
    }
    
    public function sendMessage(int $chatId,  User $user, string $message): void
    {
        $chat = $this->chatRepository->getChatById($chatId);
        
        if ($chat === null) {
           throw new ChatNotFoundException();
        }

        $chatMessage = new ChatMessage($chat, $user, $message);
        $errors = $this->validator->validate($chatMessage);
        
        if(count($errors) > 0){
            throw new \InvalidArgumentException((string)$errors);
        }

        $this->entityManager->persist($chatMessage);
        $this->entityManager->flush();
    }



    public function getUserMostRecentReceivedMessage(User $user): ?ChatMessage
    {   
        $chatIds = [];
        $userChats = $this->chatRepository->getUserChats($user);
        
        foreach($userChats as $chat)
        {
            $chatIds[] = $chat->getId();
        }
        $mostRecentMessage = $this->chatMessageRepository->getUserMostRecentReceivedMessage($user, $chatIds);

        return $mostRecentMessage;
    }

    public function checkNewMessagesForUser(User $user, int $recentMessageId): array
    {
        $userChats = $this->chatRepository->getUserChats($user);
        $newMessages = $this->chatMessageRepository->getNewMessagesForUser($user, $userChats, $recentMessageId);
        $chatMessageDTOs = $this->prepareChatMessageDTO($newMessages);
        return $chatMessageDTOs;
    }
    //Internal Only
    private function createChat(int $agreementId): Chat
    {
        $chat = new Chat($agreementId);
        $errors = $this->validator->validate($chat);
        if(count($errors) > 0){
            throw new \InvalidArgumentException((string)$errors);
        }
        $this->entityManager->persist($chat);
        $this->entityManager->flush();

        return $chat;
    }

    private function insertChatMembers(Chat $chat, array $participants): void
    {
        foreach($participants as $user){
            $chatParticipant = new ChatParticipant($chat, $user);
            $errors = $this->validator->validate($chatParticipant);
            if(count($errors) > 0){
                throw new \InvalidArgumentException((string)$errors);
            }
            $this->entityManager->persist($chatParticipant);
        }
        
        $this->entityManager->flush();
    }

    private function insertChatMembersGroup(Chat $chat, array $participants): void
    {
        foreach($participants as $userId){
            $chatParticipant = new ChatParticipant();
            $chatParticipant->setChat($chat);
            $chatParticipant->setUserId($userId);

            $errors = $this->validator->validate($chatParticipant);
            if(count($errors) > 0){
                throw new \InvalidArgumentException((string)$errors);
            }

            $this->entityManager->persist($chatParticipant);
        }
        
        $this->entityManager->flush();
    }

    private function prepareChatMessageDTO(array $chatMessages): array
    {
        $userIds = array_unique(array_map(fn ($chatMessages) => $chatMessages->getUser()->getId(), $chatMessages));
        $users = [];
        foreach ($userIds as $userId) {
            $users[$userId] = $this->userManager->getUserById($userId);
        }
        $dtos = array_map(
            fn($chatMessages) => new ChatMessageDTO(
                $chatMessages->getId(),
                $chatMessages->getChat()->getId(),
                $users[$chatMessages->getUser()->getId()]->getUsername(),
                $chatMessages->getMessage(),
                $chatMessages->getCreationDate()
            ),
            $chatMessages);

        return $dtos;
    }

}
