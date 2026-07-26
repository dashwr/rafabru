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
    $preflightCandidates = [
        dirname(__DIR__) . '/app/admin-preflight.php',
        __DIR__ . '/app/admin-preflight.php',
        '/home1/raf32088/rafabru-app/app/admin-preflight.php',
    ];
    foreach ($preflightCandidates as $candidate) {
        if (is_file($candidate)) {
            require_once $candidate;
            break;
        }
    }

    ob_start(static function (string $html): string {
        if (str_contains($html, '</head>') && !str_contains($html, '/assets/css/admin-wall.css')) {
            $html = str_replace(
                '</head>',
                '    <link rel="stylesheet" href="/assets/css/admin-wall.css?v=1">' . PHP_EOL . '</head>',
                $html
            );
        }

        if (str_contains($html, '</body>')) {
            $scripts = [
                '/assets/js/lang.js?v=3',
                '/assets/js/admin-wall.js?v=1',
                '/assets/js/admin-order-fix.js?v=1',
            ];
            $markup = '';
            foreach ($scripts as $src) {
                if (!str_contains($html, $src)) {
                    $markup .= '    <script src="' . $src . '" defer></script>' . PHP_EOL;
                }
            }
            if ($markup !== '') {
                $html = str_replace('</body>', $markup . '</body>', $html);
            }
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
        $isWritePage = str_starts_with($requestPath, '/write/');
        ob_start(static function (string $html) use ($isWritePage): string {
            if (str_contains($html, '</head>')) {
                $styles = [
                    '/assets/css/navigation-polish.css?v=2',
                    '/assets/css/sections.css?v=2',
                    '/assets/css/site-windows.css?v=2',
                    '/assets/css/site-internal-links.css?v=1',
                ];
                if ($isWritePage) {
                    $styles[] = '/assets/css/wall-extras.css?v=2';
                    $styles[] = '/assets/css/wall-core-repair.css?v=3';
                    $styles[] = '/assets/css/published-notes.css?v=2';
                }
                $markup = '';
                foreach ($styles as $href) {
                    if (!str_contains($html, $href)) {
                        $markup .= '    <link rel="stylesheet" href="' . $href . '">' . PHP_EOL;
                    }
                }
                if ($markup !== '') {
                    $html = str_replace('</head>', $markup . '</head>', $html);
                }

                if ($isWritePage && !str_contains($html, '/assets/js/wall-extras-preload.js')) {
                    $needle = '<script src="/assets/js/write-wall.js';
                    $position = strpos($html, $needle);
                    if ($position !== false) {
                        $html = substr_replace(
                            $html,
                            '<script src="/assets/js/published-note-state.js?v=2" defer></script>' . PHP_EOL
                            . '    <script src="/assets/js/published-note-event-guard.js?v=2" defer></script>' . PHP_EOL
                            . '    <script src="/assets/js/wall-extras-preload.js?v=2" defer></script>' . PHP_EOL
                            . '    <script src="/assets/js/draft-checklist-repair.js?v=1" defer></script>' . PHP_EOL
                            . '    <script src="/assets/js/wall-core-repair.js?v=2" defer></script>' . PHP_EOL
                            . '    <script src="/assets/js/wall-title-guard.js?v=1" defer></script>' . PHP_EOL
                            . '    ',
                            $position,
                            0
                        );
                    }
                }
            }

            if (str_contains($html, '</body>')) {
                $scripts = [
                    '/assets/js/site-audio.js?v=1',
                    '/assets/js/site-chrome.js?v=2',
                    '/assets/js/site-windows.js?v=2',
                    '/assets/js/site-internal-links.js?v=1',
                    '/assets/js/sections-i18n.js?v=1',
                ];
                $markup = '';
                foreach ($scripts as $src) {
                    if (!str_contains($html, $src)) {
                        $markup .= '    <script src="' . $src . '" defer></script>' . PHP_EOL;
                    }
                }
                if ($markup !== '') {
                    $html = str_replace('</body>', $markup . '</body>', $html);
                }
            }

            return $html;
        });
    }
}
