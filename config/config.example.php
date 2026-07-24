<?php

declare(strict_types=1);

return [
    // Copy this file to a private location outside public_html in production.
    'data_dir' => '/home1/raf32088/rafabru-data',
    'session_name' => 'rafabru_admin',
    'admin_username' => 'admin',

    // Generate with: php -r "echo password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
    'admin_password_hash' => 'REPLACE_WITH_PASSWORD_HASH',
];
