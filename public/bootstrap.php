<?php

declare(strict_types=1);

$candidates = [
    dirname(__DIR__) . '/app/bootstrap.php',
    __DIR__ . '/app/bootstrap.php',
    '/home1/raf32088/rafabru-app/app/bootstrap.php',
];

foreach ($candidates as $candidate) {
    if (is_file($candidate)) {
        require_once $candidate;
        return;
    }
}

http_response_code(500);
echo 'Rafabru application bootstrap was not found.';
exit;
