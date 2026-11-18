<?php
declare(strict_types=1);
namespace App\Handler;

use App\Entity\ServiceQueue;
use App\Enum\{QueueType, QueueStatus};
use App\Message\QueueId;
use App\Manager\{ServiceQueueManager, AgreementManager};
use App\Service\{WorkflowTransaction, NotificationService};
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class QueueHandler
{
    public function __construct(private ServiceQueueManager $queues, private AgreementManager $agreements,
        private NotificationService $notifications, private WorkflowTransaction $transaction, private EntityManagerInterface $em) {}

    public function __invoke(QueueId $message): void
    {
        $source = $this->queues->getQueueById((int) $message->getId());
        if (!$source || !$this->available($source)) { return; }
        $opposite = $source->getQueueType() === QueueType::OFFER ? QueueType::REQUEST : QueueType::OFFER;
        foreach ($this->queues->getRelevantQueues($opposite, $source->getLocation()) as $candidate) {
            $matched = $this->transaction->run(function () use ($source, $candidate): bool {
                $this->transaction->lock('service_queues', [$source->getId(), $candidate->getId()]);
                $this->em->refresh($source); $this->em->refresh($candidate);
                $this->em->refresh($source->getUser()); $this->em->refresh($candidate->getUser());
                if (!$this->available($source) || !$this->available($candidate) || $source->getUser()->getId() === $candidate->getUser()->getId()) { return false; }
                $this->transaction->lock('services', [$source->getService()->getId(), $candidate->getService()->getId()]);
                $this->em->refresh($source->getService()); $this->em->refresh($candidate->getService());
                if (!$this->available($source) || !$this->available($candidate) || !$this->compatible($source, $candidate)) { return false; }
                $offer = $source->getQueueType() === QueueType::OFFER ? $source : $candidate;
                $request = $source->getQueueType() === QueueType::REQUEST ? $source : $candidate;
                $agreement = $this->agreements->createProvisionAgreement($offer->getUser(), $request->getUser(), $offer->getService());
                foreach ([$offer, $request] as $queue) { $queue->setAgreement($agreement); $queue->setQueueStatus(QueueStatus::IN_PROGRESS); }
                foreach ([$offer, $request] as $queue) { $this->notifications->notify($queue->getUser(), 'MATCH_CREATED', 'Nuovo abbinamento disponibile.', ['agreementId' => $agreement->getId()]); }
                return true;
            });
            if ($matched) { return; }
        }
    }
    private function available(ServiceQueue $queue): bool
    {
        $service = $queue->getService();
        return $queue->getQueueStatus() === QueueStatus::OPEN && $queue->getAgreement() === null && $service !== null
            && !$service->isDeleted() && !$service->isSuspended() && $queue->getUser()->isActive() && !$service->getCategories()->isEmpty();
    }
    private function compatible(ServiceQueue $a, ServiceQueue $b): bool
    {
        if ($a->getService()->isRemote() !== $b->getService()->isRemote()) { return false; }
        foreach ($a->getService()->getCategories() as $category) {
            if (!$b->getService()->getCategories()->contains($category)) { continue; }
            $dictionary = $this->dictionary($category->getDescription());
            if ($dictionary === null) { return true; }
            $left = $this->keywords($a->getService()->getDescription(), $dictionary);
            $right = $this->keywords($b->getService()->getDescription(), $dictionary);
            if (array_intersect($left, $right) !== []) { return true; }
        }
        return false;
    }
    private function dictionary(string $category): ?array
    {
        $map = [
            'Bricolage' => 'Bricolage', 'Cucina' => 'Cucina', 'Educazione' => 'Educazione', 'Fitness' => 'Fitness',
            'Giardinaggio' => 'Giardinaggio', 'Informatica' => 'Informatica', 'Lingue' => 'Lingue', 'Musica' => 'Musica',
            'Programmazione' => 'Programmazione', 'Pulizie' => 'Pulizie', 'Sport' => 'Sport',
            'Programmazione web' => 'Programmazione', 'Programmazione Python' => 'Programmazione',
            'Assistenza computer' => 'Informatica', 'Assistenza smartphone' => 'Informatica',
        ];
        if (!isset($map[$category])) { return null; }
        $path = dirname(__DIR__).'/Dictionaries/'.$map[$category].'.json';
        if (!is_file($path)) { return null; }
        $dictionary = json_decode(file_get_contents($path), true);
        if (!is_array($dictionary) || $dictionary === []) { return null; }
        foreach ($dictionary as $words) { if (!is_array($words) || array_any($words, fn ($word) => !is_string($word))) { return null; } }
        return $dictionary;
    }
    private function keywords(string $description, array $dictionary): array
    {
        $text = mb_strtolower($description); $found = [];
        foreach ($dictionary as $key => $words) {
            foreach ($words as $word) {
                if ($word !== '' && str_contains($text, mb_strtolower($word))) { $found[] = (string) $key; break; }
            }
        }
        return $found;
    }
}
