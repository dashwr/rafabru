<?php

declare(strict_types=1);

header('Content-Type: text/css; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$files = [
    __DIR__ . '/assets/css/write-wall.css',
    __DIR__ . '/assets/css/write-wall-polish.css',
];

foreach ($files as $file) {
    $content = @file_get_contents($file);
    if (!is_string($content)) {
        http_response_code(500);
        echo "/* Writing-wall stylesheet could not be loaded. */\n";
        exit;
    }

    echo $content, "\n";
}
