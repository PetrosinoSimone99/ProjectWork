<?php

declare(strict_types=1);

// A separate PHP process lets functional tests exercise real MySQL row locks.
require dirname(__DIR__, 2).'/vendor/autoload.php';
chdir(dirname(__DIR__, 2));
(new Symfony\Component\Dotenv\Dotenv())->bootEnv('.env');
$input = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
$kernel = new App\Kernel('test', false);
$kernel->boot();
$db = $kernel->getContainer()->get('test.service_container')->get(Doctrine\ORM\EntityManagerInterface::class)->getConnection();
if (!str_starts_with((string) $db->getDatabase(), 'staff_check_') || !str_ends_with((string) $db->getDatabase(), '_test')) {
    throw new RuntimeException('Staff workers require an isolated staff_check_*_test database.');
}
file_put_contents($argv[1], 'ready');
$request = Symfony\Component\HttpFoundation\Request::create($input['path'], $input['method'], [], [], [], [
    'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
    'HTTP_AUTHORIZATION' => 'Bearer '.$input['token'],
], isset($input['body']) ? json_encode($input['body'], JSON_THROW_ON_ERROR) : '');
$response = $kernel->handle($request);
echo json_encode(['status' => $response->getStatusCode(), 'data' => json_decode($response->getContent(), true)], JSON_THROW_ON_ERROR);
$kernel->shutdown();
