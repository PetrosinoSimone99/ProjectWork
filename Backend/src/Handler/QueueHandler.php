<?php

namespace App\Handler;

use App\Entity\ServiceQueue;
use App\Entity\User;
use App\Entity\Service;
use App\Entity\Category;
use App\Message\QueueId;
use App\Manager\ServiceQueueManager;
use App\Enum\QueueType;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class QueueHandler
{
    private ServiceQueueManager $serviceQueueManager;
    public function __construct(ServiceQueueManager $serviceQueueManager)
    {
        $this->serviceQueueManager = $serviceQueueManager;
    }
    //Servono altri test
    //Una volta tovato il match, creare l'accordo.
    public function __invoke(QueueId $queueId)
    {
        $userQueue = $this->serviceQueueManager->getQueueById($queueId->getId());
        $userServiceCategory = $userQueue->getService()->getCategories()->first();
        $relevantQueues = $this->getRelevantQueues($this->serviceQueueManager, $userQueue);
        $relevantQueues = array_filter($relevantQueues, function (ServiceQueue $queue) use ($userServiceCategory) {
            return $queue->getService()->getCategories()->contains($userServiceCategory);
        });
        $userQueueKeywords = $this->extractKeywordsFromDescription(strtolower($userQueue->getService()->getDescription()), $userServiceCategory->getDescription());
        
        foreach($relevantQueues as $queue){
            $queueKeywords = $this->extractKeywordsFromDescription(strtolower($queue->getService()->getDescription()), $userServiceCategory->getDescription());
            $commonKeywords = array_intersect($userQueueKeywords, $queueKeywords);
            if(!empty($commonKeywords)){
                echo "Queue ID: ".$userQueue->getId() . " - " . $userQueue->getService()->getDescription() . " - Category: " . $userServiceCategory->getDescription() . PHP_EOL;
                echo "Found a match with queue ID: ".$queue->getId() . " - " . $queue->getService()->getDescription() . " - Category: " . $userServiceCategory->getDescription() . PHP_EOL;
                echo "Common keywords: " . implode(", ", $commonKeywords) . PHP_EOL;
            }
        }
    }


    private function getRelevantQueues(ServiceQueueManager $serviceQueueManager, ServiceQueue $userQueue): array
    {
        $queueType = $userQueue->getQueueType();
        if($queueType === QueueType::OFFER){
            return $serviceQueueManager->getRelevantQueues(QueueType::REQUEST);
        }else{
            return $serviceQueueManager->getRelevantQueues(QueueType::OFFER);
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