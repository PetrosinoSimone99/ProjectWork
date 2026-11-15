<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Service;
use App\Entity\User;
use App\Exception\ServiceNotFoundException;
use App\Repository\ServiceRepository;
use Doctrine\ORM\EntityManagerInterface;

/** Restores the same row without changing its content or related records. */
final class ServiceRestorer
{
    public function __construct(
        private EntityManagerInterface $em,
        private ServiceRepository $services,
        private StaffOperationLogger $history,
        private NotificationService $notifications,
    ) {}

    public function restore(int $id, User $actor, ?string $type, bool $asStaff): Service
    {
        return $this->em->getConnection()->transactional(function () use ($id, $actor, $type, $asStaff): Service {
            // DELETE and PATCH use this same lock, so changes happen one at a time.
            $this->services->lockForUpdate($id);
            $service = $this->services->find($id);
            if ($service === null) {
                throw new ServiceNotFoundException('The service does not exist.');
            }
            $this->em->refresh($service);
            if ((!$asStaff && $service->getUser()->getId() !== $actor->getId())
                || ($type !== null && $service->getType() !== $type)) {
                throw new ServiceNotFoundException('The service does not exist.');
            }
            // Repeated calls succeed without creating duplicate history entries.
            if (!$service->isDeleted()) { return $service; }
            $before = ['deletedAt' => $service->getDeletedAt()->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM)];
            $service->restore();
            $this->em->flush();
            if ($asStaff) {
                $this->history->record($actor, 'SERVICE_RESTORED', 'SERVICE', $id, $before, ['deletedAt' => null]);
                // Only staff restores notify the owner; do not notify the acting staff member.
                if ($service->getUser()->getId() !== $actor->getId()) {
                    $this->notifications->notify($service->getUser(), 'SERVICE_RESTORED', 'Your service has been restored by staff.', ['serviceId' => $id]);
                }
            }
            return $service;
        });
    }
}
