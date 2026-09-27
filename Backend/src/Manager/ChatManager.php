<?php
declare(strict_types=1);

namespace App\Manager;

use App\Entity\User;
use App\Entity\Chat;
use App\Entity\ChatMessage;
use App\Entity\ProposalParticipant;
use App\Entity\ChatParticipant;
use App\Repository\UserRepository;
use App\Repository\ChatRepository;
use App\Repository\ChatMessageRepository;
use App\Repository\ProposalRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class ChatManager
{
    private EntityManagerInterface $entityManager;
    private ChatRepository $chatRepository;
    private ChatMessageRepository $chatMessageRepository;
    private ValidatorInterface $validator;
    private UserRepository $userRepository;
    private ProposalRepository $proposalRepository;

    public function __construct(EntityManagerInterface $entityManager, ChatRepository $chatRepository, ChatMessageRepository $chatMessageRepository, ProposalRepository $proposalRepository, UserRepository $userRepository, ValidatorInterface $validator) {
        $this->entityManager = $entityManager;
        $this->chatRepository = $chatRepository;
        $this->chatMessageRepository = $chatMessageRepository;
        $this->proposalRepository = $proposalRepository;
        $this->userRepository = $userRepository;
        $this->validator = $validator;
    }

    public function getChatByProposalId(int $proposalId): ?int
    {
        $chat = $this->chatRepository->getChatByProposalId($proposalId);
        
        if($chat == null){
            $chat = $this->createChatMutual($proposalId);
            $proposalParticipants = $this->proposalRepository->findMembersByProposalId($proposalId);
            $this->insertChatMembers($chat, $proposalParticipants);
        }

        return $chat->getId();
    }
    public function getChatHistory(int $chatId): array
    {
        return $this->chatMessageRepository->getChatHistory($chatId);
    }
    public function sendMessage(int $chatId,  User $user, string $message): void
    {
        $chat = $this->chatRepository->getChatById($chatId);

        $chatMessage = new ChatMessage();
        $chatMessage->setChat($chat);
        $chatMessage->setUserId($user->getId());
        $chatMessage->setMessage($message);

        $errors = $this->validator->validate($chatMessage);
        
        if(count($errors) > 0){
            throw new \InvalidArgumentExcepton((string)$errors);
        }

        $this->entityManager->persist($chatMessage);
        $this->entityManager->flush();
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
            $this->entityManager->flush();

        }
    }

}