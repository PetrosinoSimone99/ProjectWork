<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'users')]
#[ORM\UniqueConstraint(name: 'unique_users_username', columns: ['username'])]
#[ORM\UniqueConstraint(name: 'unique_users_email', columns: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    public const ROLE_USER = 'ROLE_USER';
    public const ROLE_STAFF = 'ROLE_STAFF';
    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_INACTIVE = 'INACTIVE';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    private string $name;

    #[ORM\Column(length: 50)]
    private string $surname;

    // Location belongs to the v2 profile schema. It remains optional during registration.
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $location = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $bio = null;

    #[ORM\Column(name: 'profile_image_url', length: 2048, nullable: true)]
    private ?string $profileImageUrl = null;

    #[ORM\Column(length: 30, unique: true)]
    private string $username;

    #[ORM\Column(length: 180, unique: true)]
    private string $email;

    // This field contains only a one-way password hash, never the plain password.
    #[ORM\Column(name: 'password_hash')]
    private string $password;

    #[ORM\Column(type: 'json')]
    private array $roles = [self::ROLE_USER];

    #[ORM\Column(length: 10)]
    private string $accountStatus = self::STATUS_ACTIVE;

    #[ORM\Column(name: 'creation_date')]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $name, string $surname, string $username, string $email)
    {
        $this->name = $name;
        $this->surname = $surname;
        $this->username = $username;
        $this->email = $email;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getName(): string { return $this->name; }
    public function getSurname(): string { return $this->surname; }
    public function getLocation(): ?string { return $this->location; }
    public function getBio(): ?string { return $this->bio; }
    public function getProfileImageUrl(): ?string { return $this->profileImageUrl; }
    public function getEmail(): string { return $this->email; }
    public function getUserIdentifier(): string { return $this->username; }
    public function getUsername(): string { return $this->username; }
    public function getPassword(): string { return $this->password; }
    public function eraseCredentials(): void {}

    public function getRoles(): array
    {
        return array_values(array_unique([...$this->roles, self::ROLE_USER]));
    }

    public function setRoles(array $roles): void { $this->roles = $roles; }
    public function setLocation(?string $location): void { $this->location = $location; }
    public function setName(string $name): void { $this->name = $name; }
    public function setSurname(string $surname): void { $this->surname = $surname; }
    public function setBio(?string $bio): void { $this->bio = $bio; }
    public function setProfileImageUrl(?string $profileImageUrl): void { $this->profileImageUrl = $profileImageUrl; }
    public function setPassword(string $hashedPassword): void { $this->password = $hashedPassword; }
    public function getAccountStatus(): string { return $this->accountStatus; }
    public function setAccountStatus(string $accountStatus): void { $this->accountStatus = $accountStatus; }
    public function isActive(): bool { return $this->accountStatus === self::STATUS_ACTIVE; }

    /** Returns only safe profile data that an API may send back to a client. */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'surname' => $this->surname,
            'location' => $this->location,
            'bio' => $this->bio,
            'profileImageUrl' => $this->profileImageUrl,
            'username' => $this->username,
            'email' => $this->email,
            'roles' => $this->getRoles(),
            'accountStatus' => $this->accountStatus,
        ];
    }

    /** Returns the signed-in user's editable profile and account contact details. */
    public function toProfileApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'surname' => $this->surname,
            'location' => $this->location,
            'username' => $this->username,
            'email' => $this->email,
            'bio' => $this->bio,
            'profileImageUrl' => $this->profileImageUrl,
        ];
    }

    /**
     * Returns the profile fields that another marketplace user may see.
     *
     * Marketplace responses use this safe shape so other users never receive
     * contact details, roles, or account administration data.
     *
     * @return array{id: int|null, name: string, surname: string, username: string, location: string|null, bio: string|null, profileImageUrl: string|null}
     */
    public function toPublicApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'surname' => $this->surname,
            'username' => $this->username,
            'location' => $this->location,
            'bio' => $this->bio,
            'profileImageUrl' => $this->profileImageUrl,
        ];
    }
}
