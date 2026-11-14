<?php

declare(strict_types=1);

// Read-only checks against the demo database, followed by an isolated import check.
require dirname(__DIR__).'/vendor/autoload.php';
chdir(dirname(__DIR__));
(new Symfony\Component\Dotenv\Dotenv())->bootEnv('.env');
$url = parse_url($_SERVER['DATABASE_URL']);
$pdo = new PDO('mysql:host='.$url['host'].';port='.($url['port'] ?? 3306).';dbname='.ltrim($url['path'], '/').';charset=utf8mb4', urldecode($url['user'] ?? ''), urldecode($url['pass'] ?? ''), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
check(!in_array('tokens', $tables, true) && !in_array('token_redemptions', $tables, true), 'Compensation tables removed');
foreach (['categories' => 50, 'users' => 30, 'services' => 300] as $table => $count) {
    check((int) $pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn() === $count, $table.' count');
}
foreach (['OFFER' => 200, 'REQUEST' => 100] as $type => $count) {
    check((int) $pdo->query("SELECT COUNT(*) FROM services WHERE type = '$type'")->fetchColumn() === $count, $type.' count');
}
check((int) $pdo->query("SELECT COUNT(*) FROM users WHERE account_status <> 'ACTIVE'")->fetchColumn() === 0, 'All users active');
check((int) $pdo->query('SELECT COUNT(*) FROM services WHERE is_suspended <> 0 OR deleted_at IS NOT NULL')->fetchColumn() === 0, 'All services visible');
$staffCount = 0;
foreach ($pdo->query('SELECT password_hash, roles FROM users') as $user) {
    check(password_verify('demo', $user['password_hash']), 'Demo password hash', false);
    $staffCount += (int) in_array('ROLE_STAFF', json_decode($user['roles'], true), true);
}
check($staffCount === 2, 'Two staff accounts');
$coverage = $pdo->query("SELECT c.id, SUM(s.type = 'OFFER') AS offers, SUM(s.type = 'REQUEST') AS requests FROM categories c LEFT JOIN service_categories sc ON sc.category_id = c.id LEFT JOIN services s ON s.id = sc.service_id GROUP BY c.id")->fetchAll(PDO::FETCH_ASSOC);
foreach ($coverage as $category) {
    check($category['offers'] >= 4 && $category['requests'] >= 2, 'Category coverage', false);
}
check(count($coverage) === 50, 'Every category has at least four offers and two requests');
foreach (array_diff($tables, ['categories', 'users', 'services', 'service_categories']) as $table) {
    check((int) $pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn() === 0, 'Empty '.$table, false);
}

$_SERVER['SHELL_VERBOSITY'] = -1;
$kernel = new App\Kernel('dev', true);
function api(App\Kernel $kernel, string $method, string $path, ?array $body = null, ?string $token = null): array
{
    $server = ['CONTENT_TYPE' => 'application/json'];
    if ($token !== null) { $server['HTTP_AUTHORIZATION'] = 'Bearer '.$token; }
    $request = Symfony\Component\HttpFoundation\Request::create($path, $method, [], [], [], $server, $body === null ? null : json_encode($body));
    $response = $kernel->handle($request);
    check($response->getStatusCode() === 200, $method.' '.$path.' (HTTP '.$response->getStatusCode().')', false);
    $data = json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR);
    $kernel->terminate($request, $response);
    return $data;
}
$login = api($kernel, 'POST', '/api/auth/login', ['username' => 'mario.rossi', 'password' => 'demo']);
$staff = api($kernel, 'POST', '/api/auth/login', ['username' => 'staff.anna', 'password' => 'demo']);
api($kernel, 'GET', '/api/staff/users', null, $staff['token']);
check(count(api($kernel, 'GET', '/api/categories')['categories']) === 50, 'Category catalog and regular/staff login');
$viewerId = (int) $login['user']['id'];
$expected = $pdo->query("SELECT s.id FROM services s WHERE s.type = 'OFFER' AND s.user_id <> $viewerId ORDER BY CASE WHEN EXISTS (SELECT 1 FROM service_categories sc JOIN service_categories rc ON rc.category_id = sc.category_id JOIN services r ON r.id = rc.service_id WHERE sc.service_id = s.id AND r.user_id = $viewerId AND r.type = 'REQUEST' AND r.deleted_at IS NULL AND r.is_suspended = 0) THEN 0 ELSE 1 END, s.creation_date DESC, s.id DESC")->fetchAll(PDO::FETCH_COLUMN);
$actual = [];
for ($page = 1; ; ++$page) {
    $data = api($kernel, 'GET', '/api/services?limit=20&page='.$page, null, $login['token']);
    check($data['pagination']['totalItems'] === count($expected), 'Pagination totals', false);
    $actual = [...$actual, ...array_column($data['offers'], 'id')];
    if ($page >= $data['pagination']['totalPages']) { break; }
}
check(array_map('intval', $expected) === $actual, 'All homepage pages match preferred-category and date ordering');
foreach (['true' => 1, 'false' => 0] as $value => $remote) {
    $data = api($kernel, 'GET', '/api/services?isRemote='.$value.'&location=Roma&limit=50', null, $login['token']);
    $count = (int) $pdo->query("SELECT COUNT(*) FROM services WHERE type = 'OFFER' AND user_id <> $viewerId AND is_remote = $remote AND location LIKE '%Roma%'")->fetchColumn();
    check($data['pagination']['totalItems'] === $count, 'Location and remote filter '.$value);
}
$data = api($kernel, 'GET', '/api/services?categoryIds=1,2&limit=50', null, $login['token']);
$count = (int) $pdo->query("SELECT COUNT(DISTINCT s.id) FROM services s JOIN service_categories sc ON sc.service_id = s.id WHERE s.type = 'OFFER' AND s.user_id <> $viewerId AND sc.category_id IN (1,2)")->fetchColumn();
check($data['pagination']['totalItems'] === $count, 'Category filter without duplicates');
$kernel->shutdown();

// Use a unique name and drop only the temporary database created by this run.
$temporaryDatabase = 'barattolo_demo_verify_'.bin2hex(random_bytes(6));
$pdo->exec('CREATE DATABASE `'.$temporaryDatabase.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
try {
    $pdo->exec('USE `'.$temporaryDatabase.'`');
    $pdo->exec(file_get_contents(dirname(__DIR__, 2).'/Context_and_DB_V2/barattolo_demo_20261108.sql'));
    $importedTables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    check($tables === $importedTables, 'Imported table inventory');
    foreach ($tables as $table) {
        $source = $pdo->query('SELECT * FROM barattolo.`'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
        $restored = $pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
        $sourceRows = array_map('json_encode', $source);
        $restoredRows = array_map('json_encode', $restored);
        sort($sourceRows);
        sort($restoredRows);
        check($sourceRows === $restoredRows, 'Imported rows for '.$table, false);
        // SHOW CREATE qualifies foreign keys when inspecting a different database.
        $pdo->exec('USE barattolo');
        $originalSchema = $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        $pdo->exec('USE `'.$temporaryDatabase.'`');
        $restoredSchema = $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        // MySQL may make the inherited utf8mb4 charset explicit after an import.
        // Every exported table already has DEFAULT CHARSET=utf8mb4.
        $normalize = static fn (string $schema): string => str_replace(' CHARACTER SET utf8mb4', '', $schema);
        check($normalize($originalSchema) === $normalize($restoredSchema), 'Imported schema for '.$table, false);
    }
    foreach ($pdo->query("SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC) as $fk) {
        $missing = $pdo->query('SELECT COUNT(*) FROM `'.$fk['TABLE_NAME'].'` child LEFT JOIN `'.$fk['REFERENCED_TABLE_NAME'].'` parent ON child.`'.$fk['COLUMN_NAME'].'` = parent.`'.$fk['REFERENCED_COLUMN_NAME'].'` WHERE child.`'.$fk['COLUMN_NAME'].'` IS NOT NULL AND parent.`'.$fk['REFERENCED_COLUMN_NAME'].'` IS NULL')->fetchColumn();
        check((int) $missing === 0, 'Foreign key integrity', false);
    }
    check(true, 'Dump round trip: identical schema, rows and valid foreign keys');
} finally {
    $pdo->exec('USE barattolo');
    $pdo->exec('DROP DATABASE `'.$temporaryDatabase.'`');
}

function check(bool $condition, string $label, bool $print = true): void
{
    if (!$condition) { throw new RuntimeException('Check failed: '.$label); }
    if ($print) { echo 'OK: '.$label.PHP_EOL; }
}
