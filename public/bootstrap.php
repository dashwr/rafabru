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

        $requestPath = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
        if (str_starts_with($requestPath, '/admin/')) {
            ob_start(static function (string $html): string {
                if (!str_contains($html, '</body>') || str_contains($html, '/assets/js/lang.js')) {
                    return $html;
                }

                return str_replace(
                    '</body>',
                    '    <script src="/assets/js/lang.js?v=1" defer></script>' . PHP_EOL . '</body>',
                    $html
                );
            });
        }

        return;
    }
}

http_response_code(500);
echo 'Rafabru application bootstrap was not found.';
exit;
