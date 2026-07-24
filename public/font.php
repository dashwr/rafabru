<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$parts = glob(RAFABRU_ROOT . '/app/font/w95f.part*');
if (!is_array($parts) || $parts === []) {
    http_response_code(404);
    exit;
}

natsort($parts);
$encoded = '';
foreach ($parts as $part) {
    $contents = @file_get_contents($part);
    if (!is_string($contents)) {
        http_response_code(500);
        exit;
    }
    $encoded .= trim($contents);
}

$font = base64_decode($encoded, true);
if (!is_string($font) || hash('sha256', $font) !== '4e746b0cfa95de92a5627f7d465787c3048d3f5f1be41d3453a0bdc671019275') {
    http_response_code(500);
    exit;
}

header('Content-Type: font/woff2');
header('Content-Length: ' . strlen($font));
header('Cache-Control: public, max-age=31536000, immutable');
header('Access-Control-Allow-Origin: *');
header('X-Content-Type-Options: nosniff');
echo $font;
