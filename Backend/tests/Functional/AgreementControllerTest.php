<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\ReferenceDatabaseSchema;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * The agreement endpoints, exercised end to end on the reference schema.
 *
 * The lifecycle is the one the endpoints define: one participant creates a
 * PENDING exchange, the other answers once (a second answer is a 409), the
 * agreement becomes ACCEPTED, either participant writes the delivery sheet, and
 * cancel turns an accepted exchange into VOID — the only "called off" state the
 * reference schema has.
 */
final class AgreementControllerTest extends WebTestCase
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

    public function testExchangeAgreementLifecycleBetweenTwoParticipants(): void
    {
        $client = $this->referenceClient();
        $alice = $this->register($client, 'alice');
        $bob = $this->register($client, 'bob');
        $aliceId = (int) $alice['user']['id'];
        $bobId = (int) $bob['user']['id'];

        $client->request('GET', '/api/get-agreements');
        self::assertResponseStatusCodeSame(401);

        $this->authenticate($client, (string) $alice['token']);

        $client->jsonRequest('POST', '/api/create-exchange-agreement', []);
        self::assertResponseStatusCodeSame(400);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => $aliceId]);
        self::assertResponseStatusCodeSame(400);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => 999999]);
        self::assertResponseStatusCodeSame(404);

        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bobId]);
        self::assertResponseStatusCodeSame(201);
        $agreements = $this->agreements($client);
        self::assertCount(1, $agreements);
        $agreementId = (int) $agreements[0]['id'];
        self::assertSame('PENDING', $agreements[0]['agreementStatus']);
        $proposals = array_column($agreements[0]['agreementProposal'], null, 'username');
        self::assertSame('Provider', $proposals['alice']['role']);
        self::assertTrue($proposals['alice']['response']);
        self::assertSame('Beneficiary', $proposals['bob']['role']);
        self::assertNull($proposals['bob']['response'], 'A participant who has not answered yet has no response.');
        self::assertSame([], $agreements[0]['agreementDetails']);

        $client->jsonRequest('POST', '/api/send-agreement-response', ['agreementId' => $agreementId, 'response' => true]);
        self::assertResponseStatusCodeSame(409, 'The creator already answered when the exchange was created.');

        $this->authenticate($client, (string) $bob['token']);
        $client->jsonRequest('POST', '/api/send-agreement-response', ['agreementId' => $agreementId, 'response' => true]);
        self::assertResponseStatusCodeSame(200);
        self::assertSame('ACCEPTED', $this->agreements($client)[0]['agreementStatus']);

        $this->authenticate($client, (string) $alice['token']);
        $client->request('GET', '/api/offers/mine');
        self::assertResponseIsSuccessful();
        $offers = json_decode((string) $client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR)['offers'];
        $sheet = [
            'agreementId' => $agreementId,
            'serviceId' => (int) $offers[0]['id'],
            'beneficiaryId' => $bobId,
            'fromRemote' => false,
            'startDate' => '2026-12-01T09:00:00+00:00',
            'endDate' => '2026-12-05T18:00:00+00:00',
        ];
        $client->jsonRequest('POST', '/api/send-agreement-details', ['agreementId' => $agreementId]);
        self::assertResponseStatusCodeSame(400);
        $client->jsonRequest('POST', '/api/send-agreement-details', $sheet);
        self::assertResponseStatusCodeSame(200);
        $client->jsonRequest('POST', '/api/send-agreement-details', [...$sheet, 'endDate' => '2026-11-01T09:00:00+00:00']);
        self::assertResponseStatusCodeSame(400, 'The end date cannot precede the start date.');

        $this->authenticate($client, (string) $bob['token']);
        $details = $this->agreements($client)[0]['agreementDetails'];
        self::assertCount(1, $details);
        self::assertSame('alice offers repairs', $details[0]['serviceDescription']);
        self::assertSame('UNCOMPILED', $details[0]['status']);
        self::assertNull($details[0]['beneficiaryAccepted']);
        self::assertFalse($details[0]['fromRemote']);

        $client->request('POST', '/api/cancel-agreement/'.$agreementId);
        self::assertResponseStatusCodeSame(200);
        self::assertSame('VOID', $this->agreements($client)[0]['agreementStatus']);

        $carol = $this->register($client, 'carol');
        $this->authenticate($client, (string) $carol['token']);
        $client->request('POST', '/api/cancel-agreement/'.$agreementId);
        self::assertResponseStatusCodeSame(404, 'Only the two participants can see or cancel an agreement.');
        self::assertSame([], $this->agreements($client));
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
