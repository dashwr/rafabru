<?php

declare(strict_types=1);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    return;
}

rafabru_start_session();
if (!rafabru_is_admin() || !rafabru_verify_csrf($_POST['csrf'] ?? null)) {
    return;
}

$action = trim((string) ($_POST['action'] ?? ''));

if (in_array($action, ['move_link_up', 'move_link_down', 'move_song_up', 'move_song_down'], true)) {
    $isLink = str_starts_with($action, 'move_link_');
    $filename = $isLink ? 'links.json' : 'songs.json';
    $fragment = $isLink ? 'links' : 'music';
    $records = rafabru_normalize_order(rafabru_read_json($filename, []));
    $id = trim((string) ($_POST['id'] ?? ''));
    $index = rafabru_find_index($records, $id);

    if ($index === null) {
        rafabru_flash('error', $isLink ? 'That link no longer exists.' : 'That song no longer exists.');
        rafabru_admin_redirect($fragment);
    }

    $direction = str_ends_with($action, '_up') ? -1 : 1;
    $target = $index + $direction;
    if (isset($records[$target])) {
        [$records[$index], $records[$target]] = [$records[$target], $records[$index]];
        foreach ($records as $recordIndex => &$record) {
            $record['order'] = $recordIndex + 1;
        }
        unset($record);
        rafabru_write_json($filename, array_values($records));
    }

    rafabru_flash('success', $isLink ? 'The public button order was updated.' : 'The playlist order was updated.');
    rafabru_admin_redirect($fragment);
}

if (!in_array($action, ['add_redirect', 'save_redirect'], true)) {
    return;
}

$slug = strtolower(trim((string) ($_POST['slug'] ?? '')));
if (preg_match('/^[a-z0-9][a-z0-9-]{0,62}$/', $slug) !== 1) {
    return;
}

$reserved = [
    'admin', 'api', 'app', 'assets', 'audio', 'config', 'font', 'links',
    'login', 'logout', 'music', 'og-image', 'redirect', 'storage', 'write',
];
$publicRoot = RAFABRU_ROOT . '/public';
$conflicts = in_array($slug, $reserved, true)
    || is_file($publicRoot . '/' . $slug)
    || is_dir($publicRoot . '/' . $slug)
    || is_file($publicRoot . '/' . $slug . '.php')
    || is_dir($publicRoot . '/' . $slug . '.php');

if ($conflicts) {
    rafabru_flash('error', 'That slug belongs to an existing page or system route. Choose another name.');
    rafabru_admin_redirect('redirects');
}
