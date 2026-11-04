# Dev-only image for the Baratto-lo Symfony backend.
# Used only by ../compose.yaml for local development. Never deploy this.
# Owner: Andrea Cestelli (Docker Desktop maintainer). Editing this file is
# allowed under the exception documented in AGENTS.md, and any change must be
# reported in /docs/changelog.md so the backend maintainer stays informed.

FROM php:8.4-cli

# PHP >= 8.4 is required by composer.lock (doctrine/collections 3.1.0,
# doctrine/orm 3.7.2 require ^8.4). Keep this aligned with the lock file.
# Symfony 7.4 needs intl (libicu), zip and pdo_mysql. ctype, iconv, mbstring
# and openssl are already bundled in the official php:8.4-cli image.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libicu-dev \
      libzip-dev \
      zip \
      unzip \
      git \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql intl zip \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
