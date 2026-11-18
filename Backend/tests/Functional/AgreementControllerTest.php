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
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => 999999, 'serviceId' => $bob['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(404);

        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bobId, 'serviceId' => $bob['offers'][0]['id']]);
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
        $client->jsonRequest('POST', '/api/send-agreement-details', ['agreementId' => $agreementId]);
        self::assertResponseStatusCodeSame(400, 'The notes are required.');
        $client->jsonRequest('POST', '/api/send-agreement-details', ['agreementId' => $agreementId, 'notes' => '   ']);
        self::assertResponseStatusCodeSame(400, 'Blank notes are refused.');
        $client->jsonRequest('POST', '/api/send-agreement-details', ['agreementId' => $agreementId, 'notes' => str_repeat('a', 501)]);
        self::assertResponseStatusCodeSame(400, 'The notes stop at 500 characters.');
        $client->jsonRequest('POST', '/api/send-agreement-details', ['agreementId' => $agreementId, 'notes' => 'Ritiro a casa di Alice, citofono Rossi.']);
        self::assertResponseStatusCodeSame(200);

        $this->authenticate($client, (string) $bob['token']);
        $details = $this->agreements($client)[0]['agreementDetails'];
        self::assertCount(2, $details);
        self::assertSame('alice offers repairs', $details[0]['serviceDescription']);
        self::assertSame('OFFER', $details[0]['serviceType']);
        self::assertSame('COMPILED', $details[0]['status']);
        self::assertSame('Ritiro a casa di Alice, citofono Rossi.', $details[0]['notes']);
        self::assertNotNull($details[0]['sentAt']);
        self::assertNull($details[0]['beneficiaryAccepted']);
        self::assertFalse($details[0]['fromRemote']);
        self::assertNotNull($details[0]['startDate'], 'The start is written when the agreement is accepted.');
        self::assertNull($details[0]['endDate'], 'The end arrives with the confirmation.');
        self::assertSame('UNCOMPILED', $details[1]['status']);

        $client->jsonRequest('POST', '/api/send-agreement-details', ['agreementId' => $agreementId, 'notes' => 'Scheda concorrente.']);
        self::assertResponseStatusCodeSame(409, 'The first sender locks the round.');

        $client->request('POST', '/api/cancel-agreement/'.$agreementId);
        self::assertResponseStatusCodeSame(200);
        self::assertSame('CANCELLED', $this->agreements($client)[0]['agreementStatus']);

        $carol = $this->register($client, 'carol');
        $this->authenticate($client, (string) $carol['token']);
        $client->request('POST', '/api/cancel-agreement/'.$agreementId);
        self::assertResponseStatusCodeSame(404, 'Only the two participants can see or cancel an agreement.');
        self::assertSame([], $this->agreements($client));
    }

    public function testConfirmationClosesTheExchangeAndNotifiesBothParticipants(): void
    {
        $client = $this->referenceClient();
        $alice = $this->register($client, 'alice');
        $bob = $this->register($client, 'bob');
        $aliceId = (int) $alice['user']['id'];
        $bobId = (int) $bob['user']['id'];

        $this->authenticate($client, (string) $alice['token']);
        $client->jsonRequest('POST', '/api/create-exchange-agreement', ['otherParticipant' => $bobId, 'serviceId' => (int) $bob['offers'][0]['id']]);
        self::assertResponseStatusCodeSame(201);
        $agreementId = (int) $this->agreements($client)[0]['id'];
        $this->authenticate($client, (string) $bob['token']);
        $client->jsonRequest('POST', '/api/send-agreement-response', ['agreementId' => $agreementId, 'response' => true]);
        self::assertResponseStatusCodeSame(200);
        $accepted = array_column($this->agreements($client)[0]['agreementProposal'], null, 'username');

        $this->authenticate($client, (string) $alice['token']);
        $client->jsonRequest('POST', '/api/send-agreement-details', ['agreementId' => $agreementId, 'notes' => 'Ci vediamo sabato.']);
        self::assertResponseStatusCodeSame(200);
        $sheet = $this->detailOf($this->agreements($client)[0]['agreementDetails'], $aliceId);
        self::assertSame($accepted['bob']['responseDate'], $sheet['startDate'], 'The start is the moment the proposal was accepted.');
        self::assertNull($sheet['endDate'], 'The sender does not write the end.');

        $this->authenticate($client, (string) $bob['token']);
        self::assertSame(0, (int) $this->referenceDb->fetchOne("SELECT COUNT(*) FROM notifications WHERE type = 'AGREEMENT_COMPLETED'"));
        $client->request('POST', '/api/accept-agreement-details/'.$agreementId);
        self::assertResponseStatusCodeSame(200);

        $agreement = $this->agreements($client)[0];
        self::assertSame('COMPLETED', $agreement['agreementStatus'], 'The confirmed sheet is the delivery.');
        $confirmed = $this->detailOf($agreement['agreementDetails'], $aliceId);
        self::assertTrue($confirmed['beneficiaryAccepted']);
        self::assertNotNull($confirmed['endDate'], 'The confirmation writes the end.');
        self::assertSame($sheet['startDate'], $confirmed['startDate'], 'The confirmation never rewrites the start.');
        self::assertNull($this->detailOf($agreement['agreementDetails'], $bobId)['endDate'], 'Only the confirmed row carries the end.');

        $client->request('POST', '/api/cancel-agreement/'.$agreementId);
        self::assertResponseStatusCodeSame(409, 'A completed exchange is closed.');

        $notifications = $this->completionNotifications();
        self::assertCount(2, $notifications, 'One completion notification per participant.');
        self::assertSame([$aliceId, $bobId], array_keys($notifications));
        self::assertSame([
            'agreementId' => $agreementId, 'serviceDescription' => 'alice offers repairs',
            'startDate' => $confirmed['startDate'], 'endDate' => $confirmed['endDate'], 'otherUsername' => 'bob',
        ], $notifications[$aliceId]);
        self::assertSame('alice', $notifications[$bobId]['otherUsername']);
    }

    /** @param list<array<string, mixed>> $details @return array<string, mixed> */
    private function detailOf(array $details, int $providerId): array
    {
        $detail = array_find($details, fn (array $row) => $row['providerId'] === $providerId);
        self::assertNotNull($detail, 'Every participant owns a sheet.');
        return $detail;
    }

    /** @return array<int, array<string, mixed>> the completion payload of each participant, keyed by user id */
    private function completionNotifications(): array
    {
        $byUser = [];
        foreach ($this->referenceDb->fetchAllAssociative("SELECT user_id, data FROM notifications WHERE type = 'AGREEMENT_COMPLETED' ORDER BY id") as $row) {
            $byUser[(int) $row['user_id']] = json_decode((string) $row['data'], true, flags: JSON_THROW_ON_ERROR);
        }
        return $byUser;
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
