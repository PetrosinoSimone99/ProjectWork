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

    #[ORM\Column(name: 'creation_date')]
    private \DateTimeImmutable $createdAt;

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
    public function getUser(): User { return $this->user; }
    public function getType(): string { return $this->type; }
    public function getDescription(): string { return $this->description; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    /** @return Collection<int, Category> */
    public function getCategories(): Collection { return $this->categories; }
    public function addCategory(Category $category): void
    {
        if (!$this->categories->contains($category)) {
            $this->categories->add($category);
        }
    }

    /** @return array{id: int|null, type: string, description: string, categories: list<array{id: int|null, description: string}>} */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'description' => $this->description,
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
     * @return array{id: int|null, type: string, description: string, createdAt: string, categories: list<array{id: int|null, description: string}>, owner: array{id: int|null, name: string, surname: string, username: string, location: string|null}}
     */
    public function toHomepageOfferApiArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'description' => $this->description,
            'createdAt' => $this->createdAt->format(DATE_ATOM),
            'categories' => array_map(static fn (Category $category) => $category->toApiArray(), $this->categories->toArray()),
            'owner' => $this->user->toPublicApiArray(),
        ];
    }
}
