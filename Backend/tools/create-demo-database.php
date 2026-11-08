<?php

declare(strict_types=1);

// Run from Backend with: php tools/create-demo-database.php
// This one-time tool refuses to seed a database that already contains data.
require dirname(__DIR__).'/vendor/autoload.php';
chdir(dirname(__DIR__));
(new Symfony\Component\Dotenv\Dotenv())->bootEnv('.env');

$url = parse_url($_SERVER['DATABASE_URL']);
if ($url === false || ($url['scheme'] ?? '') !== 'mysql' || ltrim($url['path'] ?? '', '/') !== 'barattolo'
    || !in_array($url['host'] ?? '', ['127.0.0.1', 'localhost'], true)) {
    throw new RuntimeException('This tool requires the local MySQL barattolo database.');
}
$pdo = new PDO(
    'mysql:host='.$url['host'].';port='.($url['port'] ?? 3306).';dbname=barattolo;charset=utf8mb4',
    urldecode($url['user'] ?? ''), urldecode($url['pass'] ?? ''),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);
$pdo->exec("SET time_zone = '+00:00'");
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    if ((int) $pdo->query('SELECT COUNT(*) FROM '.quoteName($table))->fetchColumn() !== 0) {
        throw new RuntimeException('The database is no longer empty. Nothing has been changed.');
    }
}
$output = dirname(__DIR__, 2).'/Context_and_DB_V2/barattolo_demo_20261108.sql';
if (file_exists($output)) {
    throw new RuntimeException('The demo dump already exists. Refusing to overwrite it.');
}

// Capture every table before any DDL. MySQL DROP TABLE cannot be rolled back.
$backupDirectory = __DIR__.'/../var/backups';
if (!is_dir($backupDirectory) && !mkdir($backupDirectory, 0777, true)) {
    throw new RuntimeException('Cannot create the backup directory.');
}
$backup = $backupDirectory.'/barattolo_before_demo_'.gmdate('Ymd_His').'.sql';
writeDump($pdo, $backup, 'Backup before removing compensation tables and inserting demo data.');
echo 'Backup: '.realpath($backup).PHP_EOL;
$pdo->exec('DROP TABLE `token_redemptions`');
$pdo->exec('DROP TABLE `tokens`');

$definitions = <<<'DATA'
Giardinaggio|potatura di siepi e piccoli arbusti|cesoie e raccolta degli sfalci
Orto domestico|preparazione di un orto sul balcone|semina di basilico e pomodori
Cura delle piante|rinvaso e cura delle piante da appartamento|terriccio e controllo delle radici
Pulizie domestiche|pulizia di cucina e bagno|superfici, piastrelle e vetri
Organizzazione della casa|riordino di armadi e ripostigli|selezione e sistemazione degli oggetti
Montaggio mobili|montaggio di librerie e scrivanie|istruzioni e fissaggio dei ripiani
Piccole riparazioni|riparazione di maniglie e cerniere|regolazione delle ante e sostituzione delle viti
Idraulica domestica|sostituzione di guarnizioni dei rubinetti|controllo delle piccole perdite
Tinteggiatura|tinteggiatura di una parete interna|protezione dei mobili e preparazione del fondo
Riparazione biciclette|manutenzione di biciclette da citta|regolazione dei freni e lubrificazione della catena
Cucito|riparazione di pantaloni e camicie|orli e sostituzione dei bottoni
Ricamo|ricamo a mano su tessuti|punti base e personalizzazione di tovaglioli
Falegnameria|restauro di piccoli oggetti in legno|carteggiatura e finitura di mensole
Restauro mobili|recupero di sedie e comodini|pulizia del legno e trattamento della superficie
Assistenza computer|configurazione di computer domestici|aggiornamenti e installazione dei programmi
Assistenza smartphone|configurazione di smartphone Android|backup delle foto e impostazioni di accessibilita
Reti Wi-Fi|ottimizzazione della rete Wi-Fi di casa|posizionamento del router e verifica della copertura
Programmazione web|sviluppo di pagine web in HTML e CSS|layout responsive e moduli di contatto
Programmazione Python|lezioni pratiche di Python|cicli, funzioni e lettura di file CSV
Fogli di calcolo|creazione di fogli di calcolo per le spese|formule, filtri e grafici mensili
Grafica digitale|realizzazione di locandine digitali|colori, caratteri e impaginazione
Fotografia|fotografia di piccoli prodotti artigianali|luce naturale e composizione dello scatto
Fotoritocco|ritocco di fotografie digitali|correzione di esposizione e bilanciamento del bianco
Montaggio video|montaggio di brevi video di eventi|tagli, titoli e musica di sottofondo
Scrittura e revisione|revisione di testi in italiano|ortografia, punteggiatura e chiarezza
Curriculum e colloqui|preparazione di curriculum e colloqui|esperienze professionali e simulazione delle domande
Inglese|conversazione in inglese di livello B1|situazioni di viaggio e pronuncia
Francese|conversazione in francese per principianti|presentazioni e dialoghi quotidiani
Spagnolo|conversazione in spagnolo di livello A2|ordinazioni al ristorante e indicazioni stradali
Tedesco|ripasso delle basi del tedesco|articoli, verbi e frasi di uso comune
Italiano per stranieri|lezioni di italiano per stranieri|conversazione e comprensione di testi semplici
Matematica|ripetizioni di matematica per le superiori|equazioni di secondo grado e problemi geometrici
Fisica|ripetizioni di fisica per le superiori|cinematica e principi della dinamica
Chimica|ripasso di chimica per le superiori|bilanciamento delle reazioni e tavola periodica
Informatica scolastica|ripetizioni di informatica per le superiori|algoritmi e diagrammi di flusso
Aiuto compiti|aiuto compiti per la scuola media|organizzazione dello studio e ripasso delle lezioni
Preparazione esami|preparazione di esami universitari|piano di studio e simulazioni orali
Chitarra|lezioni di chitarra per principianti|accordi aperti e accompagnamento ritmico
Pianoforte|lezioni introduttive di pianoforte|lettura delle note e coordinazione delle mani
Canto|esercizi introduttivi di canto|respirazione e intonazione
Teoria musicale|ripasso di teoria musicale|solfeggio ritmico e lettura dello spartito
Cucina italiana|preparazione di ricette della cucina italiana|risotto e pasta fresca fatta in casa
Panificazione|preparazione di pane con lievito madre|impasto, pieghe e tempi di lievitazione
Pasticceria|preparazione di dolci da forno|crostata di frutta e pasta frolla
Cucina vegetariana|preparazione di pasti vegetariani|legumi, verdure di stagione e menu settimanale
Yoga|pratica introduttiva di yoga|posizioni di base e respirazione consapevole
Fitness|allenamento a corpo libero per principianti|riscaldamento e circuiti senza attrezzi
Corsa|organizzazione di uscite di corsa per principianti|ritmo graduale e percorsi al parco
Dog sitting|cura e passeggiate per cani|uscite al parco e rispetto degli orari dei pasti
Cat sitting|cura di gatti a domicilio|cibo, acqua e pulizia della lettiera
DATA;
$topics = array_map(static fn (string $row): array => explode('|', $row), explode("\n", $definitions));
if (count($topics) !== 50) {
    throw new RuntimeException('Exactly 50 categories are required.');
}
$people = [
    ['Mario', 'Rossi'], ['Giulia', 'Bianchi'], ['Luca', 'Ferrari'], ['Sofia', 'Romano'],
    ['Marco', 'Ricci'], ['Chiara', 'Marino'], ['Andrea', 'Greco'], ['Francesca', 'Bruno'],
    ['Alessandro', 'Gallo'], ['Elena', 'Conti'], ['Matteo', 'De Luca'], ['Sara', 'Mancini'],
    ['Davide', 'Costa'], ['Martina', 'Giordano'], ['Simone', 'Rizzo'], ['Valentina', 'Lombardi'],
    ['Federico', 'Moretti'], ['Alice', 'Barbieri'], ['Lorenzo', 'Fontana'], ['Beatrice', 'Santoro'],
    ['Gabriele', 'Mariani'], ['Laura', 'Rinaldi'], ['Riccardo', 'Caruso'], ['Silvia', 'Ferrara'],
    ['Nicola', 'Galli'], ['Paola', 'Martini'], ['Tommaso', 'Leone'], ['Roberta', 'Longo'],
    ['Anna', 'Serra'], ['Paolo', 'Villa'],
];
$cities = ['Roma', 'Milano', 'Torino', 'Bologna', 'Firenze', 'Napoli', 'Palermo', 'Genova', 'Bari', 'Padova'];
$hash = password_hash('demo', PASSWORD_BCRYPT);
$accounts = [];

// All inserts succeed together. Category IDs and user IDs are explicit in this empty database.
$pdo->beginTransaction();
try {
    foreach ($topics as $index => [$name]) {
        insertRow($pdo, 'categories', ['id' => $index + 1, 'description' => $name]);
    }
    foreach ($people as $index => [$name, $surname]) {
        $username = $index < 28 ? strtolower($name.'.'.str_replace(' ', '', $surname)) : 'staff.'.($index === 28 ? 'anna' : 'paolo');
        $city = $cities[$index % count($cities)];
        insertRow($pdo, 'users', [
            'id' => $index + 1, 'name' => $name, 'surname' => $surname, 'username' => $username,
            'email' => $username.'@example.test', 'password_hash' => $hash, 'location' => $city,
            'roles' => json_encode($index < 28 ? ['ROLE_USER'] : ['ROLE_USER', 'ROLE_STAFF']),
            'account_status' => 'ACTIVE', 'credits' => 0, 'creation_date' => '2026-08-01 09:00:00',
            'bio' => $index < 28 ? 'Vivo a '.$city.'. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.' : 'Mi occupo di assistenza agli utenti e moderazione della comunita.',
            'profile_image_url' => null,
        ]);
        $accounts[] = [$username, $index < 28 ? 'Utente' : 'Staff', $city];
    }

    // Four offers and two requests per topic ensure that every category has useful results.
    $serviceId = 0;
    foreach ($topics as $index => [$name, $activity, $details]) {
        $descriptions = [
            'Offro '.$activity.'. Incontro individuale di un\'ora dedicato a '.$details.'.',
            'Sono disponibile per '.$activity.'. Due ore il sabato mattina: '.$details.'.',
            'Propongo '.$activity.' per principianti, con esempi pratici su '.$details.'.',
            'Metto a disposizione esperienza in '.$activity.'. Ci accordiamo per '.$details.'.',
            'Cerco aiuto per '.$activity.'. Vorrei concentrarmi su '.$details.'.',
            'Vorrei imparare '.$activity.'. Sono disponibile nel fine settimana per '.$details.'.',
        ];
        foreach ($descriptions as $variant => $description) {
            ++$serviceId;
            $ownerId = (($index * 3 + $variant * 5) % 28) + 1;
            $remote = $index >= 14 && $index <= 40 && $variant % 2 === 0;
            $createdAt = (new DateTimeImmutable('2026-09-01 08:00:00', new DateTimeZone('UTC')))->modify('+'.($serviceId * 5).' hours');
            insertRow($pdo, 'services', [
                'id' => $serviceId, 'user_id' => $ownerId, 'type' => $variant < 4 ? 'OFFER' : 'REQUEST',
                'description' => $description, 'creation_date' => $createdAt->format('Y-m-d H:i:s'),
                'is_used' => 1, 'is_remote' => (int) $remote, 'is_suspended' => 0, 'deleted_at' => null,
                'location' => $cities[($ownerId - 1) % count($cities)],
            ]);
            insertRow($pdo, 'service_categories', ['service_id' => $serviceId, 'category_id' => $index + 1]);
            // Add a second category only for related topics, such as gardening and plant care.
            $relatedTopics = [0 => 1, 2 => 0, 4 => 3, 6 => 5, 8 => 12, 10 => 11, 12 => 13,
                14 => 15, 16 => 14, 18 => 17, 20 => 22, 22 => 21, 24 => 25, 26 => 30,
                28 => 27, 30 => 26, 32 => 31, 34 => 18, 36 => 35, 38 => 40, 40 => 37,
                42 => 41, 44 => 41, 46 => 47, 48 => 49];
            if ($variant === 0 && isset($relatedTopics[$index])) {
                insertRow($pdo, 'service_categories', ['service_id' => $serviceId, 'category_id' => $relatedTopics[$index] + 1]);
            }
        }
    }
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    throw $error;
}
writeDump($pdo, $output, 'Barattolo demo: 50 categories, 30 users, 200 offers, 100 requests. All passwords: demo (hashed).');

$readme = "# Database demo\n\nDump: `barattolo_demo_20261108.sql`. Password di tutti gli account: **demo** (salvata come hash).\n\n";
$readme .= "Contiene 50 categorie, 28 utenti ordinari, 2 staff, 200 offerte e 100 richieste. Tutti sono attivi; nessun servizio e sospeso o eliminato. Le altre tabelle sono vuote. `tokens` e `token_redemptions` sono assenti.\n\n";
$readme .= "## Importazione\n\nImportare solo in un database MySQL vuoto. Non eseguire le migrazioni storiche su questo schema.\n\n```sql\nCREATE DATABASE barattolo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE barattolo;\nSOURCE Context_and_DB_V2/barattolo_demo_20261108.sql;\n```\n\n";
$readme .= "Login: `POST /api/auth/login` con `username` scelto dalla tabella e `password` uguale a `demo`. La registrazione continua a richiedere almeno 8 caratteri per le nuove password.\n\n";
$readme .= "| Username | Ruolo | Localita |\n| --- | --- | --- |\n";
foreach ($accounts as [$username, $role, $city]) {
    $readme .= '| '.$username.' | '.$role.' | '.$city." |\n";
}
$readme .= "\nPer rigenerare da un database locale vuoto usare `php tools/create-demo-database.php` dalla cartella Backend. Lo script rifiuta database popolati e dump gia esistenti. Il backup precedente alle modifiche si trova in `Backend/var/backups/`.\n";
file_put_contents(dirname($output).'/DEMO_DATABASE.md', $readme);
echo 'Created: '.$output.PHP_EOL;

function quoteName(string $name): string
{
    return '`'.str_replace('`', '``', $name).'`';
}

function insertRow(PDO $pdo, string $table, array $row): void
{
    $statement = $pdo->prepare('INSERT INTO '.quoteName($table).' ('.implode(', ', array_map('quoteName', array_keys($row))).') VALUES ('.implode(', ', array_fill(0, count($row), '?')).')');
    $statement->execute(array_values($row));
}

/** Export schema and data without DROP or CREATE DATABASE statements. */
function writeDump(PDO $pdo, string $path, string $description): void
{
    $sql = '-- '.$description."\n-- Import into an empty MySQL database. Dates are UTC.\nSET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS = 0;\n\n";
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
        $sql .= $pdo->query('SHOW CREATE TABLE '.quoteName($table))->fetch(PDO::FETCH_NUM)[1].";\n\n";
        $rows = $pdo->query('SELECT * FROM '.quoteName($table))->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $values = array_map(static fn ($value): string => $value === null ? 'NULL' : $pdo->quote((string) $value), array_values($row));
            $sql .= 'INSERT INTO '.quoteName($table).' ('.implode(', ', array_map('quoteName', array_keys($row))).') VALUES ('.implode(', ', $values).");\n";
        }
        $sql .= "\n";
    }
    $sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";
    if (file_put_contents($path, $sql, LOCK_EX) !== strlen($sql)) {
        throw new RuntimeException('Cannot write complete dump: '.$path);
    }
}
