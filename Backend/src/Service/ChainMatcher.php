<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Service;
use App\Repository\ChainRepository;
use Doctrine\ORM\EntityManagerInterface;

/** A small, bounded depth-first search: at most four different people are visited. */
final class ChainMatcher
{
    public function __construct(private EntityManagerInterface $em, private ChainRepository $repository, private ServiceCompatibility $compatibility) {}

    /** @return list<array{userId:int, offer:Service, request:Service}> */
    public function choices(): array
    {
        $services = $this->em->getRepository(Service::class)->findBy([], ['id' => 'ASC']);
        $choices = [];
        foreach ($services as $offer) {
            if ($offer->getType() !== Service::TYPE_OFFER || !$offer->getUser()->isActive()) {
                continue;
            }
            foreach ($services as $request) {
                if ($request->getType() === Service::TYPE_REQUEST && $request->getUser()->getId() === $offer->getUser()->getId()) {
                    $choices[] = ['userId' => $offer->getUser()->getId(), 'offer' => $offer, 'request' => $request];
                }
            }
        }
        usort($choices, static fn (array $a, array $b) => [$a['userId'], $a['offer']->getId(), $a['request']->getId()] <=> [$b['userId'], $b['offer']->getId(), $b['request']->getId()]);
        return $choices;
    }

    public function directAvailable(Service $offer, Service $request, bool $currentRead = false): bool
    {
        if ($this->repository->hasDirectProposal($offer->getId(), $currentRead) || $this->repository->hasDirectProposal($request->getId(), $currentRead)) {
            return true;
        }
        foreach ($this->choices() as $choice) {
            if ($choice['userId'] === $offer->getUser()->getId()
                || !$this->repository->serviceAvailable($choice['offer']->getId(), $currentRead) || !$this->repository->serviceAvailable($choice['request']->getId(), $currentRead)) {
                continue;
            }
            if ($this->compatibility->sharesCategory($offer, $choice['request']) && $this->compatibility->sharesCategory($choice['offer'], $request)
                && !$this->repository->swipeExists($offer->getUser()->getId(), $choice['userId'], $offer->getId(), $request->getId(), $choice['offer']->getId(), $choice['request']->getId())
                && !$this->repository->directPairExists($offer->getId(), $choice['offer']->getId())) {
                return true;
            }
        }
        return false;
    }

    public function find(Service $offer, Service $request): array
    {
        $choices = array_values(array_filter($this->choices(), fn (array $c) => $this->repository->serviceAvailable($c['offer']->getId()) && $this->repository->serviceAvailable($c['request']->getId())));
        $first = ['userId' => $offer->getUser()->getId(), 'offer' => $offer, 'request' => $request];
        foreach ([3, 4] as $length) {
            $cycle = $this->extend([$first], $choices, $length);
            if ($cycle !== []) {
                return $cycle;
            }
        }
        return [];
    }

    private function extend(array $path, array $choices, int $length): array
    {
        $last = $path[count($path) - 1];
        if (count($path) === $length) {
            // Reaching the desired length is insufficient: the last offer must close the cycle.
            return $this->compatibility->sharesCategory($last['offer'], $path[0]['request']) ? $path : [];
        }
        foreach ($choices as $choice) {
            if (in_array($choice['userId'], array_column($path, 'userId'), true) || !$this->compatibility->sharesCategory($last['offer'], $choice['request'])) {
                continue;
            }
            $cycle = $this->extend([...$path, $choice], $choices, $length);
            if ($cycle !== []) {
                return $cycle;
            }
        }
        return [];
    }
}
