<?php
declare(strict_types=1);

namespace App\Manager;

use App\Entity\User;
use App\Entity\Chat;
use App\Entity\ChatMessage;
use App\Entity\ProposalParticipant;
use App\Entity\ChatParticipant;

use App\Exception\ChatNotFoundException;

use App\DTO\ChatMessageDTO;
use App\DTO\GroupParticipantDTO;

use App\Manager\UserManager;

use App\Repository\ChatRepository;
use App\Repository\ChatMessageRepository;
use App\Repository\ProposalRepository;

use App\Query\GroupParticipantInfoQuery;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class ChatManager
{
    private EntityManagerInterface $entityManager;
    private ChatRepository $chatRepository;
    private ChatMessageRepository $chatMessageRepository;
    private ValidatorInterface $validator;
    private ProposalRepository $proposalRepository;
    private UserManager $userManager;
    private GroupParticipantInfoQuery $groupParticipantInfoQuery;

    public function __construct(EntityManagerInterface $entityManager, ChatRepository $chatRepository, 
    ChatMessageRepository $chatMessageRepository, ProposalRepository $proposalRepository, 
    ValidatorInterface $validator, UserManager $userManager, GroupParticipantInfoQuery $groupParticipantInfoQuery) {
        $this->entityManager = $entityManager;
        $this->chatRepository = $chatRepository;
        $this->chatMessageRepository = $chatMessageRepository;
        $this->proposalRepository = $proposalRepository;
        $this->validator = $validator;
        $this->userManager = $userManager;
        $this->groupParticipantInfoQuery = $groupParticipantInfoQuery;
    }

    public function getOrCreateMutualProposalChat(int $proposalId): Chat
    {
        $chat = $this->chatRepository->getChatByMutualProposalId($proposalId);
        
        if($chat == null){
            $chat = $this->createChatMutual($proposalId);
            $proposalParticipants = $this->proposalRepository->findMembersByProposalId($proposalId);
            $this->insertChatMembers($chat, $proposalParticipants);
        }

        return $chat;
    }

    public function getOrCreateGroupProposalChatBeneficiary(int $groupProposalId, int $beneficiaryId): Chat
    {   
        $groupParticipantInfo = $this->groupParticipantInfoQuery->getServiceProviderForUser($groupProposalId, $beneficiaryId);

        if ($groupParticipantInfo === null) {
           throw new \InvalidArgumentException('Invalid chat');
        }
        
        $chat = $this->chatRepository->getChatByParticipants($groupParticipantInfo->getBeneficiaryId(), $groupParticipantInfo->getProviderId(), $groupProposalId);
        
        if($chat == null){
            $chat = $this->createChatGroup($groupProposalId);
            $this->insertChatMembersGroup($chat, [$groupParticipantInfo->getBeneficiaryId(), $groupParticipantInfo->getProviderId()]);
        }

        return $chat;
    }

    public function getOrCreateGroupProposalChatProvider(int $groupProposalId, int $providerId): Chat
    {
        $groupParticipantInfo = $this->groupParticipantInfoQuery->getBeneficiaryForUserService($groupProposalId, $providerId);

        if ($groupParticipantInfo === null) {
           throw new \InvalidArgumentException('Invalid chat');
        }
        
        $chat = $this->chatRepository->getChatByParticipants($groupParticipantInfo->getBeneficiaryId(), $groupParticipantInfo->getProviderId(), $groupProposalId);
        
        if($chat == null){
            $chat = $this->createChatGroup($groupProposalId);
            $this->insertChatMembersGroup($chat, [$groupParticipantInfo->getBeneficiaryId(), $groupParticipantInfo->getProviderId()]);
        }

        return $chat;
    }

    public function getChatHistory(int $chatId): ?array
    {   
        $chatMessages = $this->chatMessageRepository->getChatHistory($chatId);

        if($chatMessages === null){
            return [];
        }

        $chatMessageDTOs = $this->prepareChatMessageDTO($chatMessages);

        return $chatMessageDTOs;
        
    }
    
    public function sendMessage(int $chatId,  int $userId, string $message): void
    {
        $chat = $this->chatRepository->getChatById($chatId);
        
        if ($chat === null) {
           throw new ChatNotFoundException();
        }

        $chatMessage = new ChatMessage();
        $chatMessage->setChatId($chat->getId());
        $chatMessage->setUserId($userId);
        $chatMessage->setMessage($message);
        $chatMessage->setCreationDate(new \DateTimeImmutable('now'));

        $errors = $this->validator->validate($chatMessage);
        
        if(count($errors) > 0){
            throw new \InvalidArgumentException((string)$errors);
        }

        $this->entityManager->persist($chatMessage);
        $this->entityManager->flush();
    }


    public function getUserMostRecentReceivedMessage(int $userId): ?ChatMessage
    {   
        $chatIds = [];
        $userChats = $this->chatRepository->getUserChats($userId);
        
        foreach($userChats as $chat)
        {
            $chatIds[] = $chat->getId();
        }
        $mostRecentMessage = $this->chatMessageRepository->getUserMostRecentReceivedMessage($userId, $chatIds);

        return $mostRecentMessage;
    }

    public function checkNewMessagesForUser(int $userId, int $recentMessageId): array
    {
        $chatIds = [];
        $userChats = $this->chatRepository->getUserChats($userId);

        foreach($userChats as $chat){
            $chatIds[] = $chat->getId();
        }

        $newMessages = $this->chatMessageRepository->getNewMessagesForUser($userId, $chatIds, $recentMessageId);
        $chatMessageDTOs = $this->prepareChatMessageDTO($newMessages);
        return $chatMessageDTOs;
    }
    //Internal Only
    private function createChatMutual(int $proposalId): Chat
    {
        $chat = new Chat();
        $chat->setProposalMutualId($proposalId);

        $errors = $this->validator->validate($chat);
        if(count($errors) > 0){
            throw new \InvalidArgumentException((string)$errors);
        }
        $this->entityManager->persist($chat);
        $this->entityManager->flush();

        return $chat;
    }

    private function createChatGroup(int $groupProposalId): Chat
    {
        $chat = new Chat();
        $chat->setProposalGroupId($groupProposalId);

        $errors = $this->validator->validate($chat);
        if(count($errors) > 0){
            throw new \InvalidArgumentException((string)$errors);
        }

        $this->entityManager->persist($chat);
        $this->entityManager->flush();

        return $chat;
    }

    //proposalParticipants is an array of User objects, so for the mutual proposal chat, the users need to be inserted this way
    private function insertChatMembers(Chat $chat, $proposalParticipants): void
    {
        foreach($proposalParticipants as $user){
            $chatParticipant = new ChatParticipant();
            $chatParticipant->setChat($chat);
            $chatParticipant->setUserId($user->getId());

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
        $userIds = array_unique(array_map(fn ($chatMessages) => $chatMessages->getUserId(), $chatMessages));
        $users = [];
        foreach ($userIds as $userId) {
            $users[$userId] = $this->userManager->getUserById($userId);
        }
        $dtos = array_map(
            fn($chatMessages) => new ChatMessageDTO(
                $chatMessages->getId(),
                $chatMessages->getChatId(),
                $users[$chatMessages->getUserId()]->getUsername(),
                $chatMessages->getMessage(),
                $chatMessages->getCreationDate()
            ),
            $chatMessages);

        return $dtos;
    }

}
