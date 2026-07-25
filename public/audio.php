<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$id = trim((string) ($_GET['id'] ?? ''));
$download = (string) ($_GET['download'] ?? '') === '1';
$songs = rafabru_read_json('songs.json', []);
$song = null;

foreach ($songs as $candidate) {
    if (($candidate['id'] ?? null) === $id && ($candidate['enabled'] ?? false) === true) {
        $song = $candidate;
        break;
    }
}

if (!is_array($song)) {
    http_response_code(404);
    exit('Song not found.');
}

$filename = basename((string) ($song['filename'] ?? ''));
$path = rafabru_audio_dir() . '/' . $filename;

if ($filename === '' || !is_file($path) || !is_readable($path)) {
    http_response_code(404);
    exit('Song file not found.');
}

$size = filesize($path);
if ($size === false || $size < 1) {
    http_response_code(404);
    exit('Song file is empty.');
}

$start = 0;
$end = $size - 1;
$status = 200;
$range = $download ? '' : ($_SERVER['HTTP_RANGE'] ?? '');

if (is_string($range) && preg_match('/bytes=(\d*)-(\d*)/', $range, $matches) === 1) {
    if ($matches[1] !== '') {
        $start = max(0, (int) $matches[1]);
    }
    if ($matches[2] !== '') {
        $end = min($end, (int) $matches[2]);
    }

    if ($start > $end || $start >= $size) {
        header('Content-Range: bytes */' . $size);
        http_response_code(416);
        exit;
    }

    $status = 206;
}

$length = $end - $start + 1;
http_response_code($status);
header('Content-Type: audio/mpeg');
header('Accept-Ranges: bytes');
header('Content-Length: ' . $length);
header('Cache-Control: private, max-age=3600');
header('X-Content-Type-Options: nosniff');

if ($download) {
    $displayTitle = trim((string) ($song['title'] ?? '')) ?: pathinfo($filename, PATHINFO_FILENAME);
    $displayTitle = preg_replace('/[\\\/:*?"<>|\x00-\x1F\x7F]+/u', '-', $displayTitle) ?? 'song';
    $downloadName = trim($displayTitle, " .-") . '.mp3';
    if ($downloadName === '.mp3') {
        $downloadName = 'song.mp3';
    }
    header('Content-Disposition: attachment; filename="song.mp3"; filename*=UTF-8\'\'' . rawurlencode($downloadName));
} elseif ($status === 206) {
    header(sprintf('Content-Range: bytes %d-%d/%d', $start, $end, $size));
}

$handle = fopen($path, 'rb');
if ($handle === false) {
    http_response_code(500);
    exit;
}

fseek($handle, $start);
$remaining = $length;

while ($remaining > 0 && !feof($handle)) {
    $chunk = fread($handle, min(8192, $remaining));
    if ($chunk === false) {
        break;
    }

    echo $chunk;
    $remaining -= strlen($chunk);

    if (connection_aborted()) {
        break;
    }
}

fclose($handle);
