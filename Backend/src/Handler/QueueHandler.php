<?php

namespace App\Handler;

use App\Message\QueueId;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class QueueHandler
{
    public function __invoke(QueueId $queueId)
    {
        echo "Processing queue with ID: " . $queueId->getId() . PHP_EOL;
    }
}