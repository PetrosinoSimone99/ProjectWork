<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Two participants proposing to each other.
 *
 * The second proposal is the answer to the first: it must accept the pending
 * agreement instead of opening a second one, and both sides must read the same
 * ACCEPTED state.
 */
final class ReciprocalProposalTest extends WebTestCase
{
    private ?Connection $referenceDb = null;

    protected function tearDown(): void
    {
        if ($this->referenceDb !== null) {
            $this->referenceDb->executeStatement('PRAGMA foreign_keys = OFF');
            foreach ($this->referenceDb->createSchemaManager()->listTableNames() as $table) {
                $this->referenceDb->executeStatement('DROP TABLE '.$this->referenceDb->quoteSingleIdentifier($table));
            }
            $this->referenceDb->executeStatement('PRAGMA foreign_keys = ON');
        }
        parent::tearDown();
    }

    public function testCrossedProposalsEndWithOneAcceptedAgreement(): void
    {
        $client = $this->referenceClient();
        $alice = $this->register($client, 'alice');
        $bob = $this->register($client, 'bob');

        $this->authenticate($client, (string) $alice['token']);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => (int) $bob['user']['id'], 'serviceId' => (int) $bob['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(201);
        self::assertFalse($this->success($client)['autoAccepted'], 'A first proposal waits for the counterpart.');

        $pending = $this->agreements($client);
        self::assertCount(1, $pending);
        $agreementId = (int) $pending[0]['id'];
        self::assertSame('PENDING', $pending[0]['agreementStatus']);
        self::assertSame([], $pending[0]['agreementDetails']);

        $this->authenticate($client, (string) $bob['token']);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => (int) $alice['user']['id'], 'serviceId' => (int) $alice['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(201);
        self::assertTrue($this->success($client)['autoAccepted'], 'The crossed proposal accepts the pending agreement.');

        $received = $this->agreements($client);
        self::assertCount(1, $received, 'The crossed proposal reuses the pending agreement.');
        self::assertSame($agreementId, (int) $received[0]['id']);
        self::assertSame('ACCEPTED', $received[0]['agreementStatus']);
        self::assertSame('received', $received[0]['direction']);
        $answers = array_column($received[0]['agreementProposal'], null, 'username');
        self::assertTrue($answers['alice']['response']);
        self::assertTrue($answers['bob']['response']);
        self::assertNotNull($answers['alice']['responseDate']);
        self::assertNotNull($answers['bob']['responseDate']);
        self::assertCount(2, $received[0]['agreementDetails'], 'Both participants own a sheet.');
        foreach ($received[0]['agreementDetails'] as $detail) {
            self::assertSame('UNCOMPILED', $detail['status']);
            // `inizio` exists from the acceptance, when the sheet is created:
            // only `fine` waits for the confirmation.
            self::assertNotNull($detail['startDate']);
            self::assertNull($detail['endDate']);
        }

        $this->authenticate($client, (string) $alice['token']);
        $sent = $this->agreements($client);
        self::assertCount(1, $sent, 'The proposer reads the same single agreement.');
        self::assertSame('ACCEPTED', $sent[0]['agreementStatus']);
        self::assertSame('sent', $sent[0]['direction']);
        self::assertSame($agreementId, (int) $sent[0]['id']);
    }

    public function testASecondProposalAfterAcceptanceIsRefused(): void
    {
        $client = $this->referenceClient();
        $alice = $this->register($client, 'alice');
        $bob = $this->register($client, 'bob');

        $this->authenticate($client, (string) $alice['token']);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => (int) $bob['user']['id'], 'serviceId' => (int) $bob['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(201);
        $this->authenticate($client, (string) $bob['token']);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => (int) $alice['user']['id'], 'serviceId' => (int) $alice['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(201);
        self::assertTrue($this->success($client)['autoAccepted']);
        self::assertSame('ACCEPTED', $this->agreements($client)[0]['agreementStatus']);

        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => (int) $alice['user']['id'], 'serviceId' => (int) $alice['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(409, 'The accepted exchange cannot be proposed again.');

        $this->authenticate($client, (string) $alice['token']);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => (int) $bob['user']['id'], 'serviceId' => (int) $bob['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(409, 'Neither side opens a second agreement for the same services.');
        self::assertCount(1, $this->agreements($client));
    }

    private function referenceClient(): KernelBrowser
    {
        $client = static::createClient();
        $client->disableReboot();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $db = $em->getConnection();
        self::assertInstanceOf(\Doctrine\DBAL\Platforms\SQLitePlatform::class, $db->getDatabasePlatform());
        $this->referenceDb = $db;
        $db->executeStatement('PRAGMA foreign_keys = OFF');
        foreach ($db->createSchemaManager()->listTableNames() as $table) {
            $db->executeStatement('DROP TABLE '.$db->quoteSingleIdentifier($table));
        }
        ReferenceDatabaseSchema::create($db);
        $db->executeStatement('PRAGMA foreign_keys = ON');
        return $client;
    }

    /** @return array<string, mixed> */
    private function register(KernelBrowser $client, string $username): array
    {
        $client->jsonRequest('POST', '/api/auth/register', [
            'name' => ucfirst($username), 'surname' => 'Test', 'username' => $username,
            'email' => $username.'@example.test', 'password' => 'safe-password', 'location' => 'Rome',
            'offers' => [['description' => $username.' offers repairs', 'categories' => ['Repairs']]],
            'requests' => [['description' => $username.' wants lessons', 'categories' => ['Lessons']]],
        ]);
        self::assertResponseStatusCodeSame(201);
        return json_decode((string) $client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }

    private function authenticate(KernelBrowser $client, string $token): void
    {
        self::assertNotSame('', $token);
        $client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer '.$token);
    }

    /** @return array<string, mixed> */
    private function success(KernelBrowser $client): array
    {
        return json_decode((string) $client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR)['success'];
    }

    /** @return list<array<string, mixed>> */
    private function agreements(KernelBrowser $client): array
    {
        $client->request('GET', '/api/get-agreements');
        self::assertResponseIsSuccessful();
        $data = json_decode((string) $client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertSame(200, $data['success']['code']);
        return $data['success']['agreements'];
    }
}
