<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Service;

/** The same category rule is used by direct swaps and by every chain edge. */
final class ServiceCompatibility
{
    public function sharesCategory(Service $offer, Service $request): bool
    {
        foreach ($offer->getCategories() as $offeredCategory) {
            foreach ($request->getCategories() as $requestedCategory) {
                if ($offeredCategory->getId() === $requestedCategory->getId()) {
                    return true;
                }
            }
        }
        return false;
    }
}
