# Baratto-lo backend

This directory contains the first Symfony backend for Baratto-lo: public registration and login for regular users and staff.

## Requirements

- PHP 8.3 with `pdo_mysql`, `openssl`, `mbstring`, and `intl` enabled.
- MySQL 8.0 or a compatible MariaDB version.
- Composer.

## Local setup

1. Create an empty MySQL database called `barattolo`.
2. Create an uncommitted `.env.local` file using the example for the local stack:

   | Stack | Example file | Default database connection |
   | --- | --- | --- |
   | MAMP on macOS | `.env.mamp.example` | `root` / `root`, port `8889` |
   | Laragon or XAMPP on Windows | `.env.windows.example` | `root` / no password, port `3306` |

   Copy the matching values into `.env.local`. The default credentials can be changed in MAMP, Laragon, and XAMPP, so update `DATABASE_URL` if the local installation uses different values.
   If Laragon or XAMPP runs MariaDB, set its real version in the URL, for example `serverVersion=mariadb-10.11.2`.

3. Generate local JWT keys. Keep the private key private; the `config/jwt/*.pem` files are ignored by Git.

   ```bash
   openssl genpkey -algorithm RSA -out config/jwt/private.pem -pkeyopt rsa_keygen_bits:4096
   openssl pkey -in config/jwt/private.pem -pubout -out config/jwt/public.pem
   chmod 600 config/jwt/private.pem
   ```

4. Create the authentication table with the migration:

   ```bash
   php bin/console doctrine:migrations:migrate
   ```

5. Configure the web server. In MAMP, XAMPP, and Laragon, create a local virtual host whose document root is the `Backend/public` directory. Do not point Apache to the `Backend` directory itself. Enable Apache `mod_rewrite` and allow `.htaccess` overrides; `public/.htaccess` forwards `/api/...` routes to Symfony.

   The normal local URLs are:

   | Stack | Default URL |
   | --- | --- |
   | MAMP | `http://localhost:8888` |
   | Laragon / XAMPP | `http://localhost` |

   For a quick test without Apache, start Symfony using the PHP binary included with the stack:

   ```bash
   # macOS with MAMP
   /Applications/MAMP/bin/php/php8.3.14/bin/php -S localhost:8000 -t public

   # Windows with Laragon or XAMPP, when PHP is available in PATH
   php -S localhost:8000 -t public
   ```

The v2 SQL reference is in `../Context_and_DB_V2/barattolo_v2.sql`. The first migration creates the `users` table; later features will add the remaining v2 tables through their own migrations.

## API

`POST /api/auth/register`

```json
{
  "name": "Mario",
  "surname": "Rossi",
  "username": "mario.rossi",
  "email": "mario@example.com",
  "password": "at-least-8-characters"
}
```

Returns `201 Created` and `{ "token": "...", "user": { "...": "..." } }`. Public registration always assigns `ROLE_USER` and the `ACTIVE` account status.

`POST /api/auth/login`

```json
{
  "username": "mario.rossi",
  "password": "at-least-8-characters"
}
```

Returns a one-hour JWT and safe user data. Send the token on future protected requests as `Authorization: Bearer <token>`.

## Create the first staff account

Run this command only on the server. The password is hashed before it is stored.

```bash
php bin/console app:create-staff Alice Bianchi alice.staff alice@example.com 'safe-password'
```

## Tests

Generate the local JWT keys first, then run:

```bash
php bin/phpunit
```

Tests use a separate SQLite database in `var/` and cover registration, duplicate values, invalid input, user and staff login, wrong credentials, inactive accounts, password hashing, and the one-hour token expiry.
