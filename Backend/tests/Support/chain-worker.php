<?php

declare(strict_types=1);

// Separate PHP processes exercise real database locks, rather than simulated retries.
use App\Entity\User;
use App\Kernel;
use App\Service\ChainError;
use App\Service\ChainService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Dotenv\Dotenv;
use Symfony\Component\HttpFoundation\Request;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;

require dirname(__DIR__, 2).'/vendor/autoload.php';
chdir(dirname(__DIR__, 2));
(new Dotenv())->bootEnv('.env');
$kernel = new Kernel('test', true);
$kernel->boot();
$container = $kernel->getContainer()->get('test.service_container');
$em = $container->get(EntityManagerInterface::class);
if (!str_starts_with($em->getConnection()->getDatabase(), 'chain_check_')) { throw new RuntimeException('Worker database is not isolated.'); }
$input = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
$actor = $em->find(User::class, $input['userId']);
$service = $container->get(ChainService::class);
$limit = microtime(true) + 10;
while (!is_file($input['gate'])) {
    if (microtime(true) >= $limit) { throw new RuntimeException('Worker synchronization timed out.'); }
    usleep(10000);
}
try {
    if ($input['action'] === 'swipe') {
        $jwt = $container->get(JWTTokenManagerInterface::class)->create($actor);
        $request = Request::create('/api/swipes', 'POST', server: ['HTTP_AUTHORIZATION' => 'Bearer '.$jwt, 'CONTENT_TYPE' => 'application/json'], content: json_encode($input['payload']));
        $response = $kernel->handle($request);
        echo json_encode(['statusCode' => $response->getStatusCode()]), PHP_EOL;
        $kernel->shutdown();
        exit;
    }
    $chain = match ($input['action']) {
        'start' => $service->start($actor, $input['offerId'], $input['requestId']),
        'cancel' => $service->cancel($actor, $input['chainId'], 'Concurrent cancellation'),
        'receipt' => $service->receive($actor, $input['chainId'], $input['provisionId']),
        'decision' => $service->decide($actor, $input['chainId'], 'ACCEPT'),
        default => throw new RuntimeException('Unknown worker action.'),
    };
    echo json_encode(['id' => $chain['id'], 'status' => $chain['status']]), PHP_EOL;
} catch (ChainError $error) {
    echo json_encode(['error' => $error->getMessage(), 'statusCode' => $error->status]), PHP_EOL;
}
$kernel->shutdown();
