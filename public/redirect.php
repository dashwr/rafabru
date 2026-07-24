<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
$redirects = rafabru_read_json('redirects.json', []);
$match = null;

foreach ($redirects as $redirect) {
    if (($redirect['slug'] ?? null) === $slug && ($redirect['enabled'] ?? false) === true) {
        $match = $redirect;
        break;
    }
}

$destination = is_array($match) ? trim((string) ($match['destination'] ?? '')) : '';
$status = is_array($match) && (int) ($match['status'] ?? 302) === 301 ? 301 : 302;

if (!rafabru_is_valid_slug($slug) || !rafabru_is_http_url($destination)) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    ?><!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title>not found</title>
        <link rel="stylesheet" href="/assets/css/site.css">
    </head>
    <body>
        <main class="page-shell">
            <section class="window">
                <header class="titlebar"><span>♡ not found</span></header>
                <div class="content">
                    <div class="empty-state">
                        <strong>this shortcut does not exist</strong>
                        <a href="/">return to our corner</a>
                    </div>
                </div>
            </section>
        </main>
    </body>
    </html><?php
    exit;
}

header('Location: ' . $destination, true, $status);
exit;
