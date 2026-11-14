# Baratto-lo backend

The current API covers JWT authentication, profiles, categories, services, reports, staff administration and retained chat endpoints. See [the API guide](../Context_and_DB_V2/API%20docs/DATABASE_AND_API_GUIDE.md).

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

4. Use the SQL dump selected by `../Context_and_DB_V2/LAST_DB_TO_USE.txt` for a fresh database. Currently this is `barattolo_demo_20261108.sql`, with 50 categories, 30 users and 300 services. All demo accounts use password `demo`; see [demo accounts](../Context_and_DB_V2/DEMO_DATABASE.md). Historical migrations target earlier schemas; do not run them or Doctrine schema-update commands over the selected dump.

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

The selected dump is the schema reference, regardless of the local database state. The obsolete `tokens` and `token_redemptions` tables and their API and lifecycle code have been removed. JWT authentication is unchanged. Chat endpoints and their code are retained; their chat/proposal tables are absent from this dump, so chat operations cannot work with the dump alone. No chat schema is added automatically.

## API

`GET /api/users/{id}/services` returns the selected active user's public profile,
published offers and requests for the homepage detail panel. Send a JWT in the
`Authorization: Bearer <token>` header. The response is
`{"user": {...}, "offers": [...], "requests": [...]}`; suspended and deleted
services are excluded. See the [API guide](../Context_and_DB_V2/API%20docs/DATABASE_AND_API_GUIDE.md#user-services-for-the-homepage-detail-panel)
for the response fields and errors. No database migration is required.

`POST /api/auth/register`

```json
{
  "name": "Mario",
  "surname": "Rossi",
  "username": "mario.rossi",
  "email": "mario@example.com",
  "password": "at-least-8-characters",
  "location": "Rome",
  "offers": [{"description":"Bicycle repairs","categories":["Repairs"]}],
  "requests": [{"description":"Language lessons","categories":["Languages"]}]
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
