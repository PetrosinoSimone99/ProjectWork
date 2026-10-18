<?php

declare(strict_types=1);

use App\Entity\User;
use App\Kernel;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\Dotenv\Dotenv;
use Symfony\Component\HttpFoundation\Request;

require dirname(__DIR__, 2).'/vendor/autoload.php';
chdir(dirname(__DIR__, 2));
(new Dotenv())->bootEnv('.env');
$kernel = new Kernel('test', true);
$kernel->boot();
$container = $kernel->getContainer()->get('test.service_container');
$em = $container->get(EntityManagerInterface::class);
$name = (string) $em->getConnection()->getDatabase();
if (!str_starts_with($name, 'token_check_') || !str_ends_with($name, '_test')) {
    throw new RuntimeException('Worker database is not isolated.');
}
$input = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
$user = $em->find(User::class, $input['userId']);
$jwt = $container->get(JWTTokenManagerInterface::class)->create($user);
file_put_contents($input['ready'], 'ready');
$request = Request::create($input['path'], 'POST', server: [
    'HTTP_AUTHORIZATION' => 'Bearer '.$jwt, 'CONTENT_TYPE' => 'application/json',
], content: json_encode($input['body'] ?? new stdClass()));
$response = $kernel->handle($request);
echo json_encode(['status' => $response->getStatusCode(), 'body' => json_decode($response->getContent(), true)]);
$kernel->shutdown();
