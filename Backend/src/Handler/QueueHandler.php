<?php

namespace App\Handler;

use App\Entity\ServiceQueue;
use App\Entity\User;
use App\Entity\Service;
use App\Entity\Category;
use App\Message\QueueId;
use App\Manager\ServiceQueueManager;
use App\Manager\AgreementManager;
use App\Enum\QueueType;
use App\Enum\QueueStatus;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Doctrine\ORM\EntityManagerInterface;

#[AsMessageHandler]
class QueueHandler
{
    private ServiceQueueManager $serviceQueueManager;
    private AgreementManager $agreementManager;
    private EntityManagerInterface $entityManager;
    public function __construct(ServiceQueueManager $serviceQueueManager, AgreementManager $agreementManager, 
    EntityManagerInterface $entityManager)
    {
        $this->serviceQueueManager = $serviceQueueManager;
        $this->agreementManager = $agreementManager;
        $this->entityManager = $entityManager;
    }
    public function __invoke(QueueId $queueId)
    {
        $userQueue = $this->serviceQueueManager->getQueueById($queueId->getId());
        $userServiceCategory = $userQueue->getService()->getCategories()->first();
        $userServiceFromRemote = $userQueue->getService()->isRemote();
        $relevantQueues = $this->getRelevantQueues($this->serviceQueueManager, $userQueue);
        $relevantQueues = array_filter($relevantQueues, function (ServiceQueue $queue) use ($userServiceCategory, $userServiceFromRemote) {
            return $queue->getService()->getCategories()->contains($userServiceCategory) && $queue->getService()->isRemote() === $userServiceFromRemote;
        });
        $userQueueKeywords = $this->extractKeywordsFromDescription(strtolower($userQueue->getService()->getDescription()), $userServiceCategory->getDescription());
        
        if(!empty($relevantQueues)){
            foreach($relevantQueues as $queue){
                $queueKeywords = $this->extractKeywordsFromDescription(strtolower($queue->getService()->getDescription()), $userServiceCategory->getDescription());
                $commonKeywords = array_intersect($userQueueKeywords, $queueKeywords);
                if(!empty($commonKeywords)){
                    $provider = null;
                    $beneficiary = null;
                    if($userQueue->getQueueType() === QueueType::OFFER){
                        $provider = $userQueue->getUser();
                        $beneficiary = $queue->getUser();
                    }
                    if($userQueue->getQueueType() === QueueType::REQUEST){
                        $provider = $queue->getUser();
                        $beneficiary = $userQueue->getUser();
                    }
                    $agreeement = $this->agreementManager->createProvisionAgreement($provider, $beneficiary);
                    $userQueue->setAgreement($agreeement);
                    $queue->setAgreement($agreeement);
                    $userQueue->setQueueStatus(QueueStatus::IN_PROGRESS);
                    $queue->setQueueStatus(QueueStatus::IN_PROGRESS);
                    $this->entityManager->persist($userQueue);
                    $this->entityManager->persist($queue);
                    $this->entityManager->flush();
                }
            }
        }
    }


    private function getRelevantQueues(ServiceQueueManager $serviceQueueManager, ServiceQueue $userQueue): array
    {
        $queueType = $userQueue->getQueueType();
        if($queueType === QueueType::OFFER){
            return $serviceQueueManager->getRelevantQueues(QueueType::REQUEST, $userQueue->getLocation());
        }else{
            return $serviceQueueManager->getRelevantQueues(QueueType::OFFER, $userQueue->getLocation());
        }
    }
    private function extractKeywordsFromDescription(string $description, string $category): array
    {
        $keywords = [];
        $categoryKeywords = json_decode(file_get_contents(__DIR__ . '/../Dictionaries/'.$category.'.json'), true);
        $keys = array_keys($categoryKeywords);
        foreach ($keys as $key) {
            foreach($categoryKeywords[$key] as $keyword){
                if(str_contains($description, $keyword)) {
                    $keywords[] = $keyword;
                    $description = str_replace($keyword, '', $description);
                    break;
                }
            }
        }
        return $keywords;
    }
}