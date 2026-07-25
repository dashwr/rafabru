<?php

declare(strict_types=1);

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$sourcePath = __DIR__ . '/assets/js/write-wall.js';
$source = @file_get_contents($sourcePath);
if (!is_string($source)) {
    http_response_code(500);
    echo "console.error('The writing-wall script could not be loaded.');\n";
    exit;
}

echo $source;
