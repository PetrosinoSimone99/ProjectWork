<?php

declare(strict_types=1);


class DbConnector
{
    private string $servername;
    private string $username;
    private string $password;
    private string $dbname;
    private ?PDO $connection = null;
    

    public function __construct(string $servername, string $username, string $password, string $dbname)
    {
        // Override opzionali via environment (es. Docker: DB_HOST=db).
        // Senza variabili impostate il comportamento resta identico a prima.
        $envPassword = getenv('DB_PASS');
        $this->servername = getenv('DB_HOST') ?: $servername;
        $this->username = getenv('DB_USER') ?: $username;
        $this->password = $envPassword !== false ? $envPassword : $password;
        $this->dbname = getenv('DB_NAME') ?: $dbname;
    }

    private function getConnection(): PDO
    {
        // Una sola connessione per richiesta: lastInsertId() deve essere chiamato
        // sulla stessa connessione che ha eseguito la INSERT.
        if ($this->connection === null) {
            $this->connection = new PDO(
                "mysql:host={$this->servername};dbname={$this->dbname};charset=utf8mb4",
                $this->username,
                $this->password
            );
        }
        return $this->connection;
    }

    public function prepare(string $query): PDOStatement
    {
        return $this->getConnection()->prepare($query);
    }

    public function lastInsertId(?string $name = null): string
    {
        return $this->getConnection()->lastInsertId($name);
    }
}
