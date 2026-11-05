<?php

namespace App\Manager;

use App\Entity\User;
use App\Repository\ServiceRepository;



class ServiceManager
{
    private $serviceRepository;

    public function __construct(ServiceRepository $serviceRepository)
    {
        $this->serviceRepository = $serviceRepository;
    }

    public function getServiceById(int $serviceId)
    {
        return $this->serviceRepository->find($serviceId);
    }

    public function getUserOfferedService(User $user){
        return $this->serviceRepository->findUserOfferedService($user);
    }
}