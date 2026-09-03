<?php

class TokenManager
{
    public function generateToken(int $userID): string
    {
        $payload = base64_encode(json_encode(['id' => $userID, 'exp' => time() + 3600]));
        // faccio un json encode di id e il tempo per randomizzare, base64 per salvare solo caratteri alfanumerici
        $signature = hash_hmac('sha512', $payload, 'abc123'); // la firma non è altro che la firma del payload
        return "{$signature}.{$payload}";
        // uguale a return $signature . '.' . $payload;

        // aggiungere una funzione che validi il token, resituendo l'id dell'utente se il token è valido
    }

    public function validate(string $token): bool
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return false;
        }
        if (!hash_equals($parts[0], hash_hmac('sha512', $parts[1], 'abc123'))) {
            return false;
        } else {
            $token2 = json_decode(base64_decode($parts[1]));
            $time = time();
            if ($token2->exp <= $time) {
                return false;
            } else {
                return true;
            }

        }
    }

    public function extractUserID(string $token): int
    {
        $parts = explode('.', $token);
        $payload = json_decode(base64_decode($parts[1]));
        return $payload->id;
    }

    public function getAuthorizationHeader()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Cerca l'header su Apache
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } elseif (function_exists('getallheaders')) {
            $all_headers = getallheaders();
            // Cerca l'header con varianti di maiuscole/minuscole
            if (isset($all_headers['Authorization'])) {
                $headers = trim($all_headers['Authorization']);
            } elseif (isset($all_headers['authorization'])) {
                $headers = trim($all_headers['authorization']);
            }
        }
        return $headers;
    }

    public function getBearerToken()
    {
        $headers = $this->getAuthorizationHeader();

        if (!empty($headers)) {
//            if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
//                return $matches[1];
//            }
            $parts = explode('Bearer ', $headers);
//            $parts2 = explode('<br />', $parts[1]);
            return $parts[1];
        }
        return null;
    }


}
