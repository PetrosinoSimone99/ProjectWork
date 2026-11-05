<?php

namespace App\Entity;

use App\Enum\AgreementParticipantRole;

use App\Repository\AgreementRepository;
use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\Entity(repositoryClass: AgreementProposalRepository::class)]
#[ORM\Table(name: 'agreement_proposal')]
class AgreementProposal
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Agreement::class, inversedBy: 'agreementProposals')]
    #[ORM\JoinColumn(name: 'agreement_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Agreement $agreement = null;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(name: 'role')]
    private ?AgreementParticipantRole $role = null;

    #[ORM\Column(name: 'response')]
    private ?bool $response = null;

    #[ORM\Column(name: 'response_date')]
    private ?DateTimeImmutable $responseDate = null;

    public function __construct(Agreement $agreement, User $user, AgreementParticipantRole $role, bool $response, DateTimeImmutable $responseDate){
        $this->agreement = $agreement;
        $this->user = $user;
        $this->role = $role;
        $this->response = $response;
        $this->responseDate = $responseDate;
    }

    public function getAgreement(){
        return $this->agreement;
    }
    public function setAgreement(Agreement $agreement){
        $this->agreement = $agreement;
    }

    public function getUser(){
        return $this->user;
    }
    public function setUser(User $user){
        $this->user = $user;
    }

    public function getRole(){
        return $this->role;
    }
    public function setRole(AgreementParticipantRole $role){
        $this->role = $role;
    }

    public function getResponse(){
        return $this->response;
    }
    public function setResponse(bool $response){
        $this->response = $response;
    }

    public function getResponseDate(){
        return $this->responseDate;
    }

    public function setResponseDate(DateTimeImmutable $responseDate){
        $this->responseDate = $responseDate;
    }

}