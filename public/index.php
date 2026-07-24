<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$settings = rafabru_read_json('settings.json', []);
$migrations = is_array($settings['_migrations'] ?? null) ? $settings['_migrations'] : [];
$renameMigration = 'rename-site-rafa-bru-v1';

if (!in_array($renameMigration, $migrations, true)) {
    $storedTitle = trim((string) ($settings['title'] ?? ''));
    if ($storedTitle === '' || strtolower($storedTitle) === 'our corner') {
        $settings['title'] = 'rafa & bru';
    }

    $migrations[] = $renameMigration;
    $settings['_migrations'] = array_values(array_unique($migrations));
    rafabru_write_json('settings.json', $settings);
}

$links = rafabru_sort_records(rafabru_read_json('links.json', []));
$songs = rafabru_sort_records(rafabru_read_json('songs.json', []));

$title = trim((string) ($settings['title'] ?? 'rafa & bru')) ?: 'rafa & bru';
$subtitle = trim((string) ($settings['subtitle'] ?? 'welcome')) ?: 'welcome';
$footerBefore = (string) ($settings['footer']['before'] ?? 'made with ');
$footerAccent = (string) ($settings['footer']['accent'] ?? 'love');
$footerAfter = (string) ($settings['footer']['after'] ?? ' by Sol. 28/10/2024');

$visibleLinks = array_values(array_filter($links, static fn (array $link): bool => ($link['enabled'] ?? false) === true));
$musicSettings = is_array($settings['music'] ?? null) ? $settings['music'] : [];
$musicEnabled = ($musicSettings['enabled'] ?? true) === true;
$musicMode = ($musicSettings['mode'] ?? 'sequential') === 'random' ? 'random' : 'sequential';
$musicVolume = min(1, max(0, (float) ($musicSettings['volume'] ?? 0.45)));
$showPlayer = ($musicSettings['show_player'] ?? true) === true;

$playlist = [];
if ($musicEnabled) {
    foreach ($songs as $song) {
        if (($song['enabled'] ?? false) !== true) {
            continue;
        }

        $id = (string) ($song['id'] ?? '');
        $filename = basename((string) ($song['filename'] ?? ''));
        if ($id === '' || $filename === '' || !is_file(rafabru_audio_dir() . '/' . $filename)) {
            continue;
        }

        $playlist[] = [
            'id' => $id,
            'title' => trim((string) ($song['title'] ?? '')) ?: 'untitled song',
            'src' => '/audio.php?id=' . rawurlencode($id),
        ];
    }
}

$icons = [
    'folder' => '📁',
    'heart' => '♡',
    'star' => '☆',
    'music' => '♫',
    'photo' => '▣',
    'cloud' => '☁',
    'letter' => '✉',
    'flower' => '✿',
    'gift' => '🎁',
    'bow' => '୨୧',
];
?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#f2b9d6">
    <meta name="description" content="A tiny pink Windows 98-style corner for Rafa & Bru's links, songs, and little memories.">
    <link rel="canonical" href="https://rafabru.duckdns.org/">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="rafa & bru">
    <meta property="og:title" content="<?= rafabru_h($title) ?>">
    <meta property="og:description" content="A tiny pink Windows 98-style corner for links, songs, and little memories.">
    <meta property="og:url" content="https://rafabru.duckdns.org/">
    <meta property="og:image" content="https://rafabru.duckdns.org/og-image.php?v=2">
    <meta property="og:image:secure_url" content="https://rafabru.duckdns.org/og-image.php?v=2">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="A pink Windows 98-style window for Rafa and Bru with Cinnamoroll and balloons.">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= rafabru_h($title) ?>">
    <meta name="twitter:description" content="A tiny pink Windows 98-style corner for links, songs, and little memories.">
    <meta name="twitter:image" content="https://rafabru.duckdns.org/og-image.php?v=2">

    <title><?= rafabru_h($title) ?></title>
    <link rel="icon" type="image/png" href="/assets/images/favicon.png">
    <link rel="stylesheet" href="/assets/css/site.css?v=20260724-5">
    <link rel="stylesheet" href="/assets/css/responsive.css?v=20260724-5">
    <script src="/assets/js/lang.js?v=1" defer></script>
</head>
<body>
    <main class="page-shell">
        <section class="window" aria-labelledby="page-title">
            <header class="titlebar">
                <span class="titlebar__name" data-i18n-skip>
                    <span class="titlebar__icon" aria-hidden="true">♡</span>
                    <?= rafabru_h(strtolower($title)) ?>.exe
                </span>
                <span class="window-controls" aria-hidden="true">
                    <span class="window-control">_</span>
                    <span class="window-control">□</span>
                    <span class="window-control">×</span>
                </span>
            </header>

            <nav class="toolbar" aria-label="Application menu">
                <span>File</span>
                <span>Links</span>
                <span>Music</span>
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

            <div class="content">
                <header class="hero">
                    <img
                        class="hero-mascot"
                        src="/assets/images/cinnamoroll.png"
                        width="250"
                        height="300"
                        alt=""
                        decoding="async"
                    >
                    <h1 id="page-title" data-i18n-skip><?= rafabru_h($title) ?></h1>
                    <p class="subtitle" data-i18n-skip><?= rafabru_h($subtitle) ?></p>
                </header>

                <section class="links" aria-label="Links section">
                    <?php if ($visibleLinks === []): ?>
                        <div class="empty-state">
                            <strong>nothing is pinned here yet ♡</strong>
                            Our links will appear here when we choose to make them visible.
                        </div>
                    <?php else: ?>
                        <?php foreach ($visibleLinks as $link): ?>
                            <?php
                            $iconKey = (string) ($link['icon'] ?? 'heart');
                            $icon = $icons[$iconKey] ?? '♡';
                            $description = trim((string) ($link['description'] ?? ''));
                            $newTab = ($link['new_tab'] ?? true) === true;
                            ?>
                            <a
                                class="link-button"
                                data-i18n-skip
                                href="<?= rafabru_h((string) ($link['url'] ?? '#')) ?>"
                                <?= $newTab ? 'target="_blank" rel="noopener noreferrer"' : '' ?>
                            >
                                <span class="link-icon" aria-hidden="true"><?= rafabru_h($icon) ?></span>
                                <span class="link-copy">
                                    <span class="link-title"><?= rafabru_h((string) ($link['text'] ?? 'untitled link')) ?></span>
                                    <?php if ($description !== ''): ?>
                                        <span class="link-description"><?= rafabru_h($description) ?></span>
                                    <?php endif; ?>
                                </span>
                                <span class="link-arrow" aria-hidden="true">→</span>
                            </a>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </section>

                <?php if ($showPlayer): ?>
                    <section
                        class="music-panel"
                        data-player
                        data-mode="<?= rafabru_h($musicMode) ?>"
                        data-volume="<?= rafabru_h((string) $musicVolume) ?>"
                        data-playlist="<?= rafabru_h(json_encode($playlist, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '[]') ?>"
                        aria-label="Background music player"
                    >
                        <div class="music-panel__title">♫ music player</div>
                        <div class="music-panel__body">
                            <div class="now-playing" aria-live="polite">
                                <span class="now-playing__label">now playing</span>
                                <span class="now-playing__name" data-now-playing<?= $playlist !== [] ? ' data-i18n-skip' : '' ?>><?= $playlist === [] ? 'no music available' : rafabru_h((string) $playlist[0]['title']) ?></span>
                            </div>
                            <div class="player-controls">
                                <button class="retro-button" type="button" data-play aria-label="Play music" <?= $playlist === [] ? 'disabled' : '' ?>>▶</button>
                                <button class="retro-button" type="button" data-next aria-label="Next song" <?= $playlist === [] ? 'disabled' : '' ?>>▸▸</button>
                            </div>
                        </div>
                    </section>
                <?php endif; ?>

                <footer class="site-footer" data-i18n-skip>
                    <?= rafabru_h($footerBefore) ?><span class="footer-accent"><?= rafabru_h($footerAccent) ?></span><?= rafabru_h($footerAfter) ?>
                </footer>
            </div>
        </section>
    </main>

    <?php if ($playlist !== []): ?>
        <div class="music-dialog" data-music-dialog hidden>
            <section class="music-dialog__window" role="dialog" aria-modal="true" aria-labelledby="music-dialog-title">
                <header class="titlebar">
                    <span id="music-dialog-title">♫ background music</span>
                    <span class="window-controls" aria-hidden="true"><span class="window-control">×</span></span>
                </header>
                <div class="music-dialog__body">
                    <p><span>Would you like to play the music for</span> <span data-i18n-skip><?= rafabru_h($title) ?></span>?</p>
                    <div class="music-dialog__actions">
                        <button class="retro-button" type="button" data-music-accept>play music</button>
                        <button class="retro-button" type="button" data-music-decline>not now</button>
                    </div>
                </div>
            </section>
        </div>
    <?php endif; ?>

    <script src="/assets/js/player.js?v=2" defer></script>
</body>
</html>
