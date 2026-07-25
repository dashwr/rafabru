<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$settings = rafabru_read_json('settings.json', []);
$songs = rafabru_sort_records(rafabru_read_json('songs.json', []));
$title = trim((string) ($settings['title'] ?? 'rafa & bru')) ?: 'rafa & bru';
$musicSettings = is_array($settings['music'] ?? null) ? $settings['music'] : [];
$musicVolume = min(1, max(0, (float) ($musicSettings['volume'] ?? 0.45)));

$playlist = [];
foreach ($songs as $song) {
    if (($song['enabled'] ?? false) !== true) {
        continue;
    }

    $id = trim((string) ($song['id'] ?? ''));
    $filename = basename((string) ($song['filename'] ?? ''));
    if ($id === '' || $filename === '' || !is_file(rafabru_audio_dir() . '/' . $filename)) {
        continue;
    }

    $playlist[] = [
        'id' => $id,
        'title' => trim((string) ($song['title'] ?? '')) ?: 'untitled song',
        'src' => '/audio.php?id=' . rawurlencode($id),
        'download' => '/audio.php?id=' . rawurlencode($id) . '&download=1',
    ];
}
?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#f2b9d6">
    <title>Music — <?= rafabru_h($title) ?></title>
    <link rel="icon" type="image/png" href="/assets/images/favicon.png">
    <link rel="stylesheet" href="/assets/css/site.css?v=20260725-2">
    <link rel="stylesheet" href="/assets/css/sections.css?v=1">
    <script src="/assets/js/lang.js?v=3" defer></script>
    <script src="/assets/js/music-library.js?v=1" defer></script>
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
                    <a class="toolbar-menu-link" href="/links/">Links</a>
                    <a class="toolbar-menu-link toolbar-menu-link--active" href="/music/">Music</a>
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
                <h1 class="section-heading">music library</h1>
                <p class="section-copy">Every song currently enabled in the control panel appears here automatically.</p>

                <section
                    class="radio-library"
                    data-music-library
                    data-volume="<?= rafabru_h((string) $musicVolume) ?>"
                    data-playlist="<?= rafabru_h(json_encode($playlist, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '[]') ?>"
                    aria-label="Music library"
                >
                    <div class="radio-library__deck">
                        <div class="radio-library__bezel">
                            <div class="radio-library__screen">
                                <div class="radio-library__status">
                                    <span>NOW PLAYING</span>
                                    <span class="radio-library__stereo">STEREO</span>
                                    <span data-library-number>TRACK --</span>
                                </div>
                                <div class="radio-library__track-window">
                                    <span class="radio-library__track-name" data-library-title data-i18n-skip>
                                        <?= $playlist === [] ? 'no music available' : 'press play to start' ?>
                                    </span>
                                </div>
                                <div class="radio-library__timeline">
                                    <input class="player-range" type="range" min="0" max="1000" value="0" data-library-progress aria-label="Song position">
                                    <span class="radio-library__time" data-library-time>0:00 / 0:00</span>
                                </div>
                            </div>
                        </div>

                        <div class="radio-library__controls">
                            <button class="radio-library__button" type="button" data-library-previous aria-label="Previous song">◀◀</button>
                            <button class="radio-library__button" type="button" data-library-main-play aria-label="Play music">▶</button>
                            <button class="radio-library__button" type="button" data-library-next aria-label="Next song">▶▶</button>
                            <input class="player-range" type="range" min="0" max="100" step="1" value="<?= (int) round($musicVolume * 100) ?>" data-library-volume aria-label="Music volume">
                            <output class="radio-library__volume-output" data-library-volume-output><?= (int) round($musicVolume * 100) ?>%</output>
                        </div>
                    </div>

                    <section class="window library-playlist" aria-label="Playlist">
                        <header class="titlebar"><span>♫ playlist</span></header>
                        <div class="library-playlist__body">
                            <?php if ($playlist === []): ?>
                                <div class="empty-state">no music available</div>
                            <?php else: ?>
                                <?php foreach ($playlist as $index => $track): ?>
                                    <article class="library-track" data-track-index="<?= $index ?>">
                                        <span class="library-track__number"><?= str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT) ?></span>
                                        <strong class="library-track__title" data-i18n-skip><?= rafabru_h($track['title']) ?></strong>
                                        <button class="track-action" type="button" data-library-row-play>Play</button>
                                        <a class="track-action" href="<?= rafabru_h($track['download']) ?>" download>Download</a>
                                    </article>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </section>
                </section>
            </div>
        </section>
    </main>
</body>
</html>
