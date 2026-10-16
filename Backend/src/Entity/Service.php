<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ServiceRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/** A service a user can offer to others or request from them. */
#[ORM\Entity(repositoryClass: ServiceRepository::class)]
#[ORM\Table(name: 'services')]
#[ORM\Index(name: 'services_user_type_index', columns: ['user_id', 'type'])]
class Service
{
    public const TYPE_OFFER = 'OFFER';
    public const TYPE_REQUEST = 'REQUEST';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 10)]
    private string $type;

    #[ORM\Column(length: 255)]
    private string $description;

    // Both offers and requests can be marked as available remotely.
    #[ORM\Column(name: 'is_remote', options: ['default' => false])]
    private bool $isRemote = false;

    // Suspended services stay in the owner's list but cannot receive new matches.
    #[ORM\Column(name: 'is_suspended', options: ['default' => false])]
    private bool $isSuspended = false;

    #[ORM\Column(name: 'creation_date')]
    private \DateTimeImmutable $createdAt;

    // Keep deleted rows for history. NULL means the service has not been deleted.
    #[ORM\Column(name: 'deleted_at', nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    /** @var Collection<int, Category> */
    #[ORM\ManyToMany(targetEntity: Category::class)]
    #[ORM\JoinTable(name: 'service_categories')]
    #[ORM\JoinColumn(name: 'service_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'category_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    private Collection $categories;

    public function __construct(User $user, string $type, string $description)
    {
        $this->user = $user;
        $this->type = $type;
        $this->description = $description;
        $this->createdAt = new \DateTimeImmutable();
        $this->categories = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function isDeleted(): bool { return $this->deletedAt !== null; }
    public function markDeleted(): void
    {
        $this->deletedAt = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
    }
    public function getUser(): User { return $this->user; }
    public function getType(): string { return $this->type; }
    public function getDescription(): string { return $this->description; }
    public function setDescription(string $description): void { $this->description = $description; }
    public function isRemote(): bool { return $this->isRemote; }
    public function setIsRemote(bool $isRemote): void { $this->isRemote = $isRemote; }
    public function isSuspended(): bool { return $this->isSuspended; }
    public function setIsSuspended(bool $isSuspended): void { $this->isSuspended = $isSuspended; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    /** @return Collection<int, Category> */
    public function getCategories(): Collection { return $this->categories; }
    public function addCategory(Category $category): void
    {
        if (!$this->categories->contains($category)) {
            $this->categories->add($category);
        }
    }

    public function clearCategories(): void
    {
        $this->categories->clear();
    }

    /** @return array{id: int|null, type: string, description: string, isRemote: bool, isSuspended: bool, categories: list<array{id: int|null, description: string}>} */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'description' => $this->description,
            'isRemote' => $this->isRemote,
            'isSuspended' => $this->isSuspended,
            'categories' => array_map(static fn (Category $category) => $category->toApiArray(), $this->categories->toArray()),
        ];
    }

    /**
     * Builds the safe, complete representation used by the homepage catalog.
     *
     * The owner is deliberately represented with public profile data only. This
     * keeps private account fields, such as the email address and roles, out of
     * a response that is shared with other authenticated users.
     *
     * @return array{id: int|null, type: string, description: string, isRemote: bool, isSuspended: bool, createdAt: string, categories: list<array{id: int|null, description: string}>, owner: array{id: int|null, name: string, surname: string, username: string, location: string|null}}
     */
    public function toHomepageOfferApiArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'description' => $this->description,
            'isRemote' => $this->isRemote,
            'isSuspended' => $this->isSuspended,
            'createdAt' => $this->createdAt->format(DATE_ATOM),
            'categories' => array_map(static fn (Category $category) => $category->toApiArray(), $this->categories->toArray()),
            'owner' => $this->user->toPublicApiArray(),
        ];
    }

    /** @return array{id: int|null, type: string, description: string, isRemote: bool, isSuspended: bool, createdAt: string, categories: list<array{id: int|null, description: string}>} */
    public function toOwnedServiceApiArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'description' => $this->description,
            'isRemote' => $this->isRemote,
            'isSuspended' => $this->isSuspended,
            'createdAt' => $this->createdAt->format(DATE_ATOM),
            'categories' => array_map(static fn (Category $category) => $category->toApiArray(), $this->categories->toArray()),
        ];
    }
}
