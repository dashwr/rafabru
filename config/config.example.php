<?php

declare(strict_types=1);

return [
    // Copy this file to /home1/raf32088/rafabru-data/config.php in production.
    'data_dir' => '/home1/raf32088/rafabru-data',
    'session_name' => 'rafabru_admin',
    'session_timeout' => 1800,
    'max_upload_bytes' => 25 * 1024 * 1024,
    'admin_username' => 'serafim',

    // Generate the hash on the server. Never commit the plain password.
    // php -r "echo password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
    'admin_password_hash' => 'REPLACE_WITH_PASSWORD_HASH',

    // Create a Cloudflare Turnstile widget for rafabru.duckdns.org.
    // The site key is rendered publicly; the secret key must remain private here.
    'turnstile_site_key' => '',
    'turnstile_secret_key' => '',
];
