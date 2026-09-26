<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Category;
use App\Entity\Service;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AuthControllerTest extends WebTestCase
{
    private EntityManagerInterface $entityManager;
    private KernelBrowser $client;
    private int $cookingCategoryId;
    private int $gardeningCategoryId;

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);

        // Each test starts with an empty SQLite database, so test cases never affect each other.
        $schemaTool = new SchemaTool($this->entityManager);
        $metadata = $this->entityManager->getMetadataFactory()->getAllMetadata();
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        $cooking = new Category('Cooking');
        $gardening = new Category('Gardening');
        $this->entityManager->persist($cooking);
        $this->entityManager->persist($gardening);
        $this->entityManager->flush();
        $this->cookingCategoryId = $cooking->getId();
        $this->gardeningCategoryId = $gardening->getId();
    }

    public function testRegistrationCreatesAnActiveUserWithAHiddenPasswordHash(): void
    {
        $this->client->jsonRequest('POST', '/api/auth/register', $this->registrationData());

        self::assertResponseStatusCodeSame(201);
        $response = $this->responseData();
        self::assertArrayHasKey('token', $response);
        self::assertSame('mario.rossi', $response['user']['username']);
        self::assertSame('Milan', $response['user']['location']);
        self::assertSame(['ROLE_USER'], $response['user']['roles']);
        self::assertSame('ACTIVE', $response['user']['accountStatus']);
        self::assertArrayNotHasKey('password', $response['user']);
        self::assertArrayNotHasKey('password_hash', $response['user']);
        self::assertSame('OFFER', $response['offers'][0]['type']);
        self::assertSame('I can cook Italian meals.', $response['offers'][0]['description']);
        self::assertSame($this->cookingCategoryId, $response['offers'][0]['categories'][0]['id']);
        self::assertSame('REQUEST', $response['requests'][0]['type']);
        self::assertSame('I need help with gardening.', $response['requests'][0]['description']);
        self::assertSame($this->gardeningCategoryId, $response['requests'][0]['categories'][0]['id']);

        $user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => 'mario.rossi']);
        self::assertInstanceOf(User::class, $user);
        self::assertSame('Milan', $user->getLocation());
        self::assertCount(2, $this->entityManager->getRepository(Service::class)->findBy(['user' => $user]));
        self::assertNotSame('correct-password', $user->getPassword());
        self::assertTrue(password_verify('correct-password', $user->getPassword()));
    }

    public function testRegistrationRejectsInvalidLocationAndServiceDataWithoutSavingAnything(): void
    {
        $invalidData = [
            ['location' => ''],
            ['location' => str_repeat('a', 256)],
            ['offers' => []],
            ['requests' => []],
            ['offers' => 'not a list'],
            ['offers' => [['description' => '', 'categoryIds' => [$this->cookingCategoryId]]]],
            ['offers' => [['description' => 'A valid offer.', 'categoryIds' => []]]],
            ['offers' => [['description' => 'A valid offer.', 'categoryIds' => [$this->cookingCategoryId, $this->cookingCategoryId]]]],
            ['requests' => [['description' => 'A valid request.', 'categoryIds' => ['not-a-number']]]],
            ['offers' => [['description' => 'A valid offer.', 'categories' => ['']]]],
            ['offers' => [['description' => 'A valid offer.', 'categories' => [str_repeat('a', 256)]]]],
            ['offers' => [['description' => 'A valid offer.', 'categories' => ['Cooking', ' cooking ']]]],
            ['offers' => [['description' => 'A valid offer.', 'categories' => ['Cooking'], 'categoryIds' => [$this->cookingCategoryId]]]],
        ];

        foreach ($invalidData as $replace) {
            $this->client->jsonRequest('POST', '/api/auth/register', $this->registrationData($replace));

            self::assertResponseStatusCodeSame(400);
            self::assertSame(0, $this->entityManager->getRepository(User::class)->count([]));
            self::assertSame(0, $this->entityManager->getRepository(Service::class)->count([]));
        }
    }

    public function testRegistrationRejectsMissingCategoryWithoutSavingUserOrServices(): void
    {
        $data = $this->registrationData([
            'offers' => [['description' => 'I can cook.', 'categories' => ['Fresh category']]],
            'requests' => [['description' => 'I need help.', 'categoryIds' => [999999]]],
        ]);
        $this->client->jsonRequest('POST', '/api/auth/register', $data);

        self::assertResponseStatusCodeSame(404);
        self::assertSame(0, $this->entityManager->getRepository(User::class)->count([]));
        self::assertSame(0, $this->entityManager->getRepository(Service::class)->count([]));
        self::assertSame(2, $this->entityManager->getRepository(Category::class)->count([]));
    }

    public function testRegistrationCreatesAndReusesCategoriesByName(): void
    {
        $this->client->jsonRequest('POST', '/api/auth/register', $this->registrationData([
            'offers' => [
                ['description' => 'I can make bowls.', 'categories' => ['  Pottery  ']],
                ['description' => 'I can make plates.', 'categories' => ['pottery']],
            ],
            'requests' => [
                ['description' => 'I need pottery tools.', 'categories' => ['POTTERY']],
            ],
        ]));

        self::assertResponseStatusCodeSame(201);
        $response = $this->responseData();
        $offerCategoryId = $response['offers'][0]['categories'][0]['id'];
        self::assertSame('Pottery', $response['offers'][0]['categories'][0]['description']);
        self::assertSame($offerCategoryId, $response['offers'][1]['categories'][0]['id']);
        self::assertSame($offerCategoryId, $response['requests'][0]['categories'][0]['id']);
        self::assertSame(3, $this->entityManager->getRepository(Category::class)->count([]));
    }

    public function testRegistrationReusesExistingCategoriesAndCombinesNamesWithIds(): void
    {
        $this->client->jsonRequest('POST', '/api/auth/register', $this->registrationData([
            'offers' => [[
                'description' => 'I can cook.',
                'categories' => ['cOoKiNg'],
                'categoryIds' => [$this->gardeningCategoryId],
            ]],
        ]));

        self::assertResponseStatusCodeSame(201);
        $response = $this->responseData();
        self::assertSame([
            ['id' => $this->gardeningCategoryId, 'description' => 'Gardening'],
            ['id' => $this->cookingCategoryId, 'description' => 'Cooking'],
        ], $response['offers'][0]['categories']);
        self::assertSame(2, $this->entityManager->getRepository(Category::class)->count([]));
    }

    public function testRegistrationRejectsDuplicateUsernameOrEmail(): void
    {
        $this->client->jsonRequest('POST', '/api/auth/register', $this->registrationData());
        $this->client->jsonRequest('POST', '/api/auth/register', $this->registrationData(['email' => 'other@example.test']));

        self::assertResponseStatusCodeSame(409);
        self::assertSame('The username or email address is already in use.', $this->responseData()['error']);
    }

    public function testRegistrationRejectsInvalidJsonAndMissingData(): void
    {
        $this->client->request('POST', '/api/auth/register', [], [], ['CONTENT_TYPE' => 'application/json'], '{not valid json');
        self::assertResponseStatusCodeSame(400);

        $this->client->jsonRequest('POST', '/api/auth/register', ['name' => 'Mario']);
        self::assertResponseStatusCodeSame(400);
    }

    public function testUserAndStaffCanLogin(): void
    {
        $this->createUser('student', 'student@example.test', [User::ROLE_USER]);
        $this->createUser('staff', 'staff@example.test', [User::ROLE_STAFF]);
        $this->client->jsonRequest('POST', '/api/auth/login', ['username' => 'student', 'password' => 'correct-password']);
        self::assertResponseIsSuccessful();
        self::assertSame(['ROLE_USER'], $this->responseData()['user']['roles']);

        $this->client->jsonRequest('POST', '/api/auth/login', ['username' => 'staff', 'password' => 'correct-password']);
        self::assertResponseIsSuccessful();
        self::assertContains('ROLE_STAFF', $this->responseData()['user']['roles']);
    }

    public function testLoginRejectsWrongPasswordAndInactiveAccounts(): void
    {
        $this->createUser('inactive', 'inactive@example.test', [User::ROLE_USER], User::STATUS_INACTIVE);
        $this->client->jsonRequest('POST', '/api/auth/login', ['username' => 'inactive', 'password' => 'wrong-password']);
        self::assertResponseStatusCodeSame(401);

        $this->client->jsonRequest('POST', '/api/auth/login', ['username' => 'inactive', 'password' => 'correct-password']);
        self::assertResponseStatusCodeSame(403);
        self::assertSame('This account is inactive.', $this->responseData()['error']);
    }

    public function testIssuedTokenExpiresAfterOneHour(): void
    {
        $this->client->jsonRequest('POST', '/api/auth/register', $this->registrationData());
        $token = $this->responseData()['token'];
        $parts = explode('.', $token);

        self::assertCount(3, $parts);
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/'), true), true, flags: JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('exp', $payload);
        self::assertGreaterThanOrEqual(time() + 3590, $payload['exp']);
        self::assertLessThanOrEqual(time() + 3610, $payload['exp']);
    }

    /** @return array<string, mixed> */
    private function registrationData(array $replace = []): array
    {
        return [...[
            'name' => 'Mario',
            'surname' => 'Rossi',
            'username' => 'mario.rossi',
            'email' => 'mario@example.test',
            'password' => 'correct-password',
            'location' => 'Milan',
            'offers' => [[
                'description' => 'I can cook Italian meals.',
                'categoryIds' => [$this->cookingCategoryId],
            ]],
            'requests' => [[
                'description' => 'I need help with gardening.',
                'categoryIds' => [$this->gardeningCategoryId],
            ]],
        ], ...$replace];
    }

    private function createUser(string $username, string $email, array $roles, string $status = User::STATUS_ACTIVE): void
    {
        $user = new User('Test', 'User', $username, $email);
        $user->setRoles($roles);
        $user->setAccountStatus($status);
        $hasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        $user->setPassword($hasher->hashPassword($user, 'correct-password'));
        $this->entityManager->persist($user);
        $this->entityManager->flush();
    }

    /** @return array<string, mixed> */
    private function responseData(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
