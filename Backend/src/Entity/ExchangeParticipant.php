<?php
declare(strict_types=1);

use Doctrine\ORM\Mapping as ORM;

#[ORM\Table(name: 'exchange_participants')]
class ExchangeParticipant
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: ExchangeMutual::class, inversedBy: 'exchangeParticipants')]
    #[ORM\JoinColumn(name: "exchange_id", referencedColumnName: "id")]
    private ?ExchangeMutual $exchange = null;

    #[ORM\Id]
    #[ORM\Column(name: 'user_id')]
    private ?int $userId = null;

    #[ORM\Id]
    #[ORM\Column(name: 'service_id')]
    private ?int $serviceId = null;

    #[ORM\Column(name:'location')]
    private ?string $location = null;

    #[ORM\Column(name: 'start_date', type: 'datetime')]
    private ?\DateTimeInterface $startDate = null;

    #[ORM\Column(name: 'completion_date', type: 'datetime')]
    private ?\DateTimeInterface $completionDate = null;

    #[ORM\Column(name: 'is_remote')]
    private ?bool $isRemote = null;

    #[ORM\Column(name: 'exchange_accepted', type: 'boolean')]
    private ?bool $exchangeAccepted = null;

    public function __construct(int $exchangeId, int $userId, int $serviceId, string $location,
     \DateTimeInterface $startDate, \DateTimeInterface $completionDate, bool $isRemote, bool $exchangeAccepted)
    {
        $this->exchangeId = $exchangeId;
        $this->userId = $userId;
        $this->serviceId = $serviceId;
        $this->location = $location;
        $this->startDate = $startDate;
        $this->completionDate = $completionDate;
        $this->isRemote = $isRemote;
        $this->exchangeAccepted = $exchangeAccepted;
    }

    public function getExchangeId(): ?int
    {
        return $this->exchangeId;
    }
    public function getUserId(): ?int
    {
        return $this->userId;
    }
    public function getServiceId(): ?int
    {
        return $this->serviceId;
    }
    public function getStartDate(): ?\DateTimeInterface
    {
        return $this->startDate;
    }
    public function getCompletionDate(): ?\DateTimeInterface
    {
        return $this->completionDate;
    }
    public function getExchangeAccepted(): ?bool
    {
        return $this->exchangeAccepted;
    }
}