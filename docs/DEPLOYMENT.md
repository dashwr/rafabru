# Deployment notes

## Overview

The source code lives in the private GitHub repository:

```text
dashwr/rafabru
```

The live application will run on HostGator with PHP 8.3. GitHub Pages is not suitable because the administrator login, redirects, sessions, and editable JSON data require PHP.

Planned public address:

```text
https://rafabru.duckdns.org
```

## Expected HostGator paths

Application document root:

```text
/home1/raf32088/public_html/rafabru/
```

Private writable data:

```text
/home1/raf32088/rafabru-data/
```

These paths must be confirmed in cPanel before the deployment workflow is activated.

## Separation from Projeto Ideal

This repository and deployment must not modify or depend on:

```text
brunoupmidia/projetoideal-revamp
/home1/raf32088/public_html/projetoideal-staging
/home1/raf32088/projetoideal-backend-staging
```

Rafabru receives its own document root, private data directory, configuration, and deployment secrets.

## Planned first deployment

1. Confirm that `rafabru.duckdns.org` resolves to the HostGator server.
2. Confirm AutoSSL has issued a valid certificate.
3. Confirm the domain document root in cPanel.
4. Create the private data directory outside `public_html`.
5. Copy template JSON files into the private data directory.
6. Create the production `config.php` with the administrator password hash.
7. Upload the public PHP application.
8. Test HTTPS, login, content editing, redirect handling, and music playback.
9. Add GitHub Actions only after manual deployment works correctly.

## Planned GitHub Actions secrets

The eventual workflow may use secrets similar to:

```text
HOSTGATOR_HOST
HOSTGATOR_PORT
HOSTGATOR_USERNAME
HOSTGATOR_SSH_KEY
HOSTGATOR_DEPLOY_PATH
RAFABRU_DATA_PATH
```

Do not commit any password, private key, DuckDNS token, cPanel credential, administrator password hash, or production configuration file.

## Deployment behavior

A deployment should update application files only. It must never delete or overwrite production JSON data created through the administrator panel.

Conceptual flow:

```text
push to main
→ GitHub Actions validates the repository
→ application files are copied to the document root
→ production data remains untouched
```

An rsync-style deployment should explicitly exclude production configuration and writable data.

## SSL

Do not force HTTPS until AutoSSL has successfully issued the certificate for `rafabru.duckdns.org`.

After the certificate is valid, HTTPS redirection can be enabled in `.htaccess` or cPanel. Test both:

```text
http://rafabru.duckdns.org
https://rafabru.duckdns.org
```

## Rollback

The simplest rollback is to redeploy a known-good commit from GitHub. Because mutable production data is stored separately, rolling back application code should not erase links, settings, or redirects.

Before a structural data-format change, create a timestamped copy of the JSON files in the private data directory.
