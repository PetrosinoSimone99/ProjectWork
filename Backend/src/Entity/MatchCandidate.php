<?php

namespace App\Entity;

use App\Entity\ServiceQueue;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Table(name: 'match_candidates')]
class MatchCandidate
{   
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: ServiceQueue::class)]
    #[ORM\JoinColumn(name: 'offer_queue_id', referencedColumnName: 'id')]
    private ?ServiceQueue $offerQueue = null;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: ServiceQueue::class)]
    #[ORM\JoinColumn(name: 'request_queue_id', referencedColumnName: 'id')]
    private ?ServiceQueue $requestQueue = null;

    public function __construct(ServiceQueue $offerQueue, ServiceQueue $requestQueue)
    {
        $this->offerQueue = $offerQueue;
        $this->requestQueue = $requestQueue;
    }

    public function getOfferQueue(): ?ServiceQueue
    {
        return $this->offerQueue;
    }
    public function setOfferQueue(ServiceQueue $offerQueue): self
    {
        $this->offerQueue = $offerQueue;

        return $this;
    }
    public function getRequestQueue(): ?ServiceQueue
    {
        return $this->requestQueue;
    }
    public function setRequestQueue(ServiceQueue $requestQueue): self
    {
        $this->requestQueue = $requestQueue;

        return $this;
    }

}