<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class ProfileControllerTest extends WebTestCase
{
    private EntityManagerInterface $entityManager;
    private KernelBrowser $client;

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($this->entityManager);
        $metadata = $this->entityManager->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($metadata);
        $tool->createSchema($metadata);
    }

    public function testUserCanReadAndPartiallyUpdateTheirProfile(): void
    {
        $user = $this->createUser();
        $user->setBio('Original biography');
        $this->entityManager->flush();
        $this->authenticate($user);

        $this->client->request('GET', '/api/profile');
        self::assertResponseIsSuccessful();
        self::assertSame('Original biography', $this->data()['profile']['bio']);
        self::assertArrayNotHasKey('roles', $this->data()['profile']);
        self::assertArrayNotHasKey('accountStatus', $this->data()['profile']);

        $this->client->jsonRequest('PATCH', '/api/profile', [
            'location' => 'Milan',
            'bio' => null,
            'profileImageUrl' => 'https://example.test/mario.jpg',
        ]);

        self::assertResponseIsSuccessful();
        self::assertSame('Mario', $this->data()['profile']['name']);
        self::assertSame('Milan', $this->data()['profile']['location']);
        self::assertNull($this->data()['profile']['bio']);
        self::assertSame('https://example.test/mario.jpg', $this->data()['profile']['profileImageUrl']);

        $this->entityManager->clear();
        $savedUser = $this->entityManager->getRepository(User::class)->find($user->getId());
        self::assertSame('Milan', $savedUser->getLocation());
        self::assertNull($savedUser->getBio());
    }

    public function testProfileUpdateRejectsInvalidBodiesAndProtectedFields(): void
    {
        $user = $this->createUser();
        $this->authenticate($user);

        $this->client->jsonRequest('PATCH', '/api/profile', []);
        self::assertResponseStatusCodeSame(400);

        foreach ([
            ['name' => '   '],
            ['surname' => str_repeat('a', 51)],
            ['location' => ''],
            ['bio' => str_repeat('a', 1001)],
            ['profileImageUrl' => 'http://example.test/image.png'],
            ['profileImageUrl' => 'not a URL'],
            ['email' => 'changed@example.test'],
            ['username' => 'changed'],
            ['password' => 'new-password'],
            ['roles' => ['ROLE_STAFF']],
            ['accountStatus' => 'INACTIVE'],
            ['unexpectedField' => 'value'],
        ] as $payload) {
            $this->client->jsonRequest('PATCH', '/api/profile', $payload);
            self::assertResponseStatusCodeSame(400);
        }

        // A valid field next to an invalid one must not be saved partially.
        $this->client->jsonRequest('PATCH', '/api/profile', ['name' => 'Changed', 'bio' => str_repeat('a', 1001)]);
        self::assertResponseStatusCodeSame(400);
        self::assertSame('Mario', $this->entityManager->getRepository(User::class)->find($user->getId())->getName());

        $this->client->request('PATCH', '/api/profile', [], [], ['CONTENT_TYPE' => 'application/json'], '{invalid');
        self::assertResponseStatusCodeSame(400);
    }

    public function testProfileRequiresAnActiveAuthenticatedUser(): void
    {
        $this->client->request('GET', '/api/profile');
        self::assertResponseStatusCodeSame(401);

        $inactive = $this->createUser();
        $inactive->setAccountStatus(User::STATUS_INACTIVE);
        $this->entityManager->flush();
        $this->authenticate($inactive);
        $this->client->request('GET', '/api/profile');
        self::assertResponseStatusCodeSame(403);
    }

    private function createUser(): User
    {
        $user = new User('Mario', 'Rossi', 'mario', 'mario@example.test');
        $hasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        $user->setPassword($hasher->hashPassword($user, 'correct-password'));
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    private function authenticate(User $user): void
    {
        $jwt = static::getContainer()->get(JWTTokenManagerInterface::class);
        $this->client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$jwt->create($user));
    }

    /** @return array<string, mixed> */
    private function data(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
