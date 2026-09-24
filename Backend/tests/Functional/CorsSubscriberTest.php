<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class CorsSubscriberTest extends WebTestCase
{
    public function testPreflightRequestDoesNotRequireAuthentication(): void
    {
        $client = static::createClient();
        $client->request('OPTIONS', '/api/services', server: [
            'HTTP_ORIGIN' => 'http://localhost:3000',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,content-type',
        ]);

        self::assertResponseStatusCodeSame(204);
        self::assertSame('*', $client->getResponse()->headers->get('Access-Control-Allow-Origin'));
        self::assertSame('GET, POST, OPTIONS', $client->getResponse()->headers->get('Access-Control-Allow-Methods'));
        self::assertSame('Authorization, Content-Type, Accept', $client->getResponse()->headers->get('Access-Control-Allow-Headers'));
    }

    public function testApiErrorResponseAlsoContainsCorsHeaders(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/categories', server: ['HTTP_ORIGIN' => 'http://localhost:3000']);

        self::assertResponseStatusCodeSame(401);
        self::assertSame('*', $client->getResponse()->headers->get('Access-Control-Allow-Origin'));
    }

    public function testCorsHeadersAreNotAddedOutsideTheApi(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        self::assertNull($client->getResponse()->headers->get('Access-Control-Allow-Origin'));
    }
}
