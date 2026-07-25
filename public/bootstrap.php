<?php

declare(strict_types=1);

$bootstrapCandidates = [
    dirname(__DIR__) . '/app/bootstrap.php',
    __DIR__ . '/app/bootstrap.php',
    '/home1/raf32088/rafabru-app/app/bootstrap.php',
];

$bootstrapLoaded = false;
foreach ($bootstrapCandidates as $candidate) {
    if (!is_file($candidate)) {
        continue;
    }

    require_once $candidate;
    $bootstrapLoaded = true;
    break;
}

if (!$bootstrapLoaded) {
    http_response_code(500);
    echo 'Rafabru application bootstrap was not found.';
    exit;
}

$wallCandidates = [
    dirname(__DIR__) . '/app/wall.php',
    __DIR__ . '/app/wall.php',
    '/home1/raf32088/rafabru-app/app/wall.php',
];

foreach ($wallCandidates as $candidate) {
    if (is_file($candidate)) {
        require_once $candidate;
        break;
    }
}

$requestPath = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
if (str_starts_with($requestPath, '/admin/')) {
    ob_start(static function (string $html): string {
        if (str_contains($html, '</head>') && !str_contains($html, '/assets/css/admin-wall.css')) {
            $html = str_replace(
                '</head>',
                '    <link rel="stylesheet" href="/assets/css/admin-wall.css?v=1">' . PHP_EOL . '</head>',
                $html
            );
        }

        if (str_contains($html, '</body>') && !str_contains($html, '/assets/js/lang.js')) {
            $html = str_replace(
                '</body>',
                '    <script src="/assets/js/lang.js?v=3" defer></script>' . PHP_EOL
                . '    <script src="/assets/js/admin-wall.js?v=1" defer></script>' . PHP_EOL
                . '</body>',
                $html
            );
        }

        return $html;
    });
} else {
    $publicChromePaths = [
        '/',
        '/index.php',
        '/write/',
        '/write/index.php',
        '/music/',
        '/music/index.php',
        '/links/',
        '/links/index.php',
    ];

    if (in_array($requestPath, $publicChromePaths, true)) {
        ob_start(static function (string $html): string {
            if (str_contains($html, '</head>') && !str_contains($html, '/assets/css/navigation-polish.css')) {
                $html = str_replace(
                    '</head>',
                    '    <link rel="stylesheet" href="/assets/css/navigation-polish.css?v=1">' . PHP_EOL . '</head>',
                    $html
                );
            }

            if (str_contains($html, '</body>') && !str_contains($html, '/assets/js/site-chrome.js')) {
                $html = str_replace(
                    '</body>',
                    '    <script src="/assets/js/site-chrome.js?v=1" defer></script>' . PHP_EOL
                    . '    <script src="/assets/js/sections-i18n.js?v=1" defer></script>' . PHP_EOL
                    . '</body>',
                    $html
                );
            }

            return $html;
        });
    }
}
