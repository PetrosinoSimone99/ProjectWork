<?php

declare(strict_types=1);

/**
 * CORS per il frontend Baratto-lo (app Expo).
 *
 * Serve solo quando l'app gira sul target WEB da un'origine diversa
 * (es. dev server Expo su http://localhost:8081 che chiama XAMPP su :80).
 * Le app native Android/iOS non applicano CORS: questi header sono ininfluenti.
 *
 * Richiesto in cima a ogni endpoint, PRIMA dei controlli sul metodo,
 * cosi' il preflight OPTIONS riceve subito 204 senza toccare la logica.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
