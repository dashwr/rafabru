<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$settings = rafabru_read_json('settings.json', []);
$songs = rafabru_sort_records(rafabru_read_json('songs.json', []));
$redirects = rafabru_sort_records(rafabru_read_json('redirects.json', []));
$musicSettings = is_array($settings['music'] ?? null) ? $settings['music'] : [];
$musicEnabled = ($musicSettings['enabled'] ?? true) === true;

$playlist = [];
if ($musicEnabled) {
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
}

$shortcuts = [];
foreach ($redirects as $redirect) {
    $slug = strtolower(trim((string) ($redirect['slug'] ?? '')));
    if (($redirect['enabled'] ?? false) !== true || !rafabru_is_valid_slug($slug)) {
        continue;
    }

    $shortcuts[] = [
        'slug' => $slug,
        'href' => '/' . rawurlencode($slug),
    ];
}

try {
    echo json_encode([
        'music' => [
            'enabled' => $musicEnabled,
            'mode' => ($musicSettings['mode'] ?? 'sequential') === 'random' ? 'random' : 'sequential',
            'volume' => min(1, max(0, (float) ($musicSettings['volume'] ?? 0.45))),
            'playlist' => $playlist,
        ],
        'redirects' => $shortcuts,
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (JsonException) {
    http_response_code(500);
    echo '{"error":"The public site data could not be encoded."}';
}
