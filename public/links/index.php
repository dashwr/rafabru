<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$settings = rafabru_read_json('settings.json', []);
$redirects = rafabru_sort_records(rafabru_read_json('redirects.json', []));
$title = trim((string) ($settings['title'] ?? 'rafa & bru')) ?: 'rafa & bru';

$visibleRedirects = array_values(array_filter(
    $redirects,
    static fn (array $redirect): bool =>
        ($redirect['enabled'] ?? false) === true
        && rafabru_is_valid_slug((string) ($redirect['slug'] ?? ''))
));
?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#f2b9d6">
    <title>Links — <?= rafabru_h($title) ?></title>
    <link rel="icon" type="image/png" href="/assets/images/favicon.png">
    <link rel="stylesheet" href="/assets/css/site.css?v=20260725-2">
    <link rel="stylesheet" href="/assets/css/sections.css?v=1">
    <script src="/assets/js/lang.js?v=3" defer></script>
</head>
<body class="section-page">
    <main class="section-shell">
        <section class="window section-window">
            <header class="titlebar">
                <a class="titlebar__name" href="/" data-i18n-skip>
                    <span class="titlebar__icon" aria-hidden="true">♡</span>
                    <?= rafabru_h(strtolower($title)) ?>.exe
                </a>
                <span class="window-controls" aria-hidden="true">
                    <span class="window-control">_</span>
                    <span class="window-control">□</span>
                    <span class="window-control">×</span>
                </span>
            </header>

            <nav class="toolbar toolbar--centered" aria-label="Application menu">
                <span class="toolbar-nav">
                    <a class="toolbar-menu-link toolbar-menu-link--active" href="/links/">Links</a>
                    <a class="toolbar-menu-link" href="/music/">Music</a>
                    <a class="toolbar-menu-link" href="/write/">Write...</a>
                </span>
                <span class="toolbar-actions">
                    <label class="language-picker">
                        <span class="sr-only">Language</span>
                        <select class="language-select" data-language-select aria-label="Language">
                            <option value="en">English</option>
                            <option value="pt">Português</option>
                        </select>
                    </label>
                    <a class="toolbar-login" href="/admin/">login</a>
                </span>
            </nav>

            <div class="section-content">
                <h1 class="section-heading">shortcut crowd</h1>
                <p class="section-copy">Every enabled short redirect is dropped into the box automatically.</p>

                <section class="window redirect-cloud-window" aria-label="Short redirects">
                    <header class="titlebar"><span>▣ shortcuts</span></header>
                    <div class="redirect-cloud">
                        <?php if ($visibleRedirects === []): ?>
                            <div class="redirect-cloud__empty">No redirects have been created.</div>
                        <?php else: ?>
                            <?php foreach ($visibleRedirects as $index => $redirect): ?>
                                <?php
                                $slug = strtolower(trim((string) ($redirect['slug'] ?? '')));
                                $hash = (int) sprintf('%u', crc32($slug));
                                $x = 9 + ($hash % 83);
                                $y = 9 + ((int) floor($hash / 89) % 83);
                                $rotation = (($hash % 901) / 100) - 4.5;
                                $z = 2 + ($index % 40);
                                ?>
                                <a
                                    class="redirect-shortcut window"
                                    data-i18n-skip
                                    href="/<?= rafabru_h($slug) ?>"
                                    style="--x: <?= $x ?>%; --y: <?= $y ?>%; --r: <?= number_format($rotation, 2, '.', '') ?>deg; --z: <?= $z ?>;"
                                >/<?= rafabru_h($slug) ?></a>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </section>
            </div>
        </section>
    </main>
</body>
</html>
