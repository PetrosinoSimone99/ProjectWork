<?php

declare(strict_types=1);

// Segreto condiviso per la firma dei token SSE (generaTokenSSE.php e nuoviMessaggiSSE.php).
// In produzione va sovrascritto via variabile d'ambiente, NON committato in repo.
function sseSecret(): string
{
    $env = getenv('SSE_SECRET');
    return $env !== false && $env !== '' ? $env : 'abc123';
}
