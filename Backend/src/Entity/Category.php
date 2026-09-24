<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/** A reusable label used to compare offered and requested services. */
#[ORM\Entity]
#[ORM\Table(name: 'categories')]
class Category
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    private string $description;

    public function __construct(string $description)
    {
        $this->description = $description;
    }

    public function getId(): ?int { return $this->id; }
    public function getDescription(): string { return $this->description; }

    /** @return array{id: int|null, description: string} */
    public function toApiArray(): array
    {
        return ['id' => $this->id, 'description' => $this->description];
    }
}
