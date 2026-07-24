# Deployment notes

## Overview

Source repository:

```text
dashwr/rafabru
```

Live address:

```text
https://rafabru.duckdns.org
```

The live site runs on HostGator with PHP 8.3. GitHub Pages is not used because authentication, redirects, JSON writes, and MP3 uploads require PHP.

## Confirmed HostGator paths

Public document root:

```text
/home1/raf32088/public_html/rafabru/
```

Private deployed source/application copy:

```text
/home1/raf32088/rafabru-app/
```

Private writable data:

```text
/home1/raf32088/rafabru-data/
```

The public document root receives the contents of `public/`. The private application directory receives the repository files needed by the PHP bootstrap, templates, and installer. The loader at `public/bootstrap.php` can locate the private application at:

```text
/home1/raf32088/rafabru-app/app/bootstrap.php
```

## Private production data

Expected production layout:

```text
/home1/raf32088/rafabru-data/
├── config.php
├── settings.json
├── links.json
├── redirects.json
├── songs.json
└── audio/
    └── uploaded MP3 files
```

This directory is never replaced by a normal code deployment.

## Initial installation

After the repository is present on the server, initialize the private directory from HostGator's terminal:

```bash
cd /home1/raf32088/rafabru-app
php scripts/install.php
```

The installer:

- Prompts for the administrator password without writing it in plaintext.
- Uses `serafim` as the default administrator username.
- Creates `/home1/raf32088/rafabru-data` and its private audio folder.
- Stores only a PHP `password_hash()` value.
- Copies the initial JSON templates only when their production files do not already exist.

Use `--force` only when deliberately replacing the existing administrator password configuration:

```bash
php scripts/install.php --force
```

The password itself must never be put in a committed command, workflow file, README, or source file.

## Manual first deployment

The first deployment should be tested manually before GitHub Actions is enabled:

1. Upload or clone the repository into `/home1/raf32088/rafabru-app/`.
2. Run `php scripts/install.php` from that directory.
3. Copy the contents of `public/` into `/home1/raf32088/public_html/rafabru/`.
4. Confirm that `.htaccess` was copied; cPanel may hide dotfiles unless **Show Hidden Files** is enabled.
5. Put the supplied favicon at `/home1/raf32088/public_html/rafabru/assets/images/favicon.png`.
6. Open the public page and `/admin/` over HTTPS.
7. Test login, page settings, an MP3 upload, link editing, and a temporary redirect.
8. Deploy the same commit again and confirm that JSON data and uploaded MP3 files remain unchanged.

## Automatic deployment model

The eventual workflow should perform two code-only syncs:

```text
repository except mutable/local files
→ /home1/raf32088/rafabru-app/

public/ contents
→ /home1/raf32088/public_html/rafabru/
```

It must exclude:

```text
config/config.local.php
storage/runtime/
*.mp3
/home1/raf32088/rafabru-data/
```

Conceptual flow:

```text
push to main
→ GitHub Actions validates PHP files
→ private application copy is updated
→ public files are updated
→ production JSON and uploaded songs remain untouched
```

## Planned GitHub Actions secrets

```text
HOSTGATOR_HOST
HOSTGATOR_PORT
HOSTGATOR_USERNAME
HOSTGATOR_SSH_KEY
HOSTGATOR_PUBLIC_PATH
HOSTGATOR_APP_PATH
```

Suggested values for the path secrets:

```text
HOSTGATOR_PUBLIC_PATH=/home1/raf32088/public_html/rafabru/
HOSTGATOR_APP_PATH=/home1/raf32088/rafabru-app/
```

Do not commit cPanel credentials, SSH private keys, DuckDNS tokens, the administrator password, or the production configuration.

## SSL

AutoSSL has been run and the DuckDNS address opens. Keep HTTPS redirection in `.htaccess`, then verify both addresses:

```text
http://rafabru.duckdns.org
https://rafabru.duckdns.org
```

The HTTP address should redirect to HTTPS.

## Separation from Projeto Ideal

This project must not modify or depend on:

```text
brunoupmidia/projetoideal-revamp
/home1/raf32088/public_html/projetoideal-staging
/home1/raf32088/projetoideal-backend-staging
```

Rafabru has its own repository, application copy, document root, private data, credentials, and deployment workflow.

## Rollback

Redeploy a known-good Git commit. Because mutable content and MP3 files live separately, rolling application code backward must not erase page content.

Before changing a JSON data format, create a timestamped backup of `/home1/raf32088/rafabru-data/`.
