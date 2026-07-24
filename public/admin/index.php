<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

rafabru_start_session();

function admin_post(string $key, string $default = ''): string
{
    return trim((string) ($_POST[$key] ?? $default));
}

function admin_checked(bool $value): string
{
    return $value ? ' checked' : '';
}

function admin_selected(string $value, string $expected): string
{
    return $value === $expected ? ' selected' : '';
}

function admin_move(array $records, string $id, int $direction): array
{
    $records = rafabru_normalize_order($records);
    $index = rafabru_find_index($records, $id);

    if ($index === null) {
        return $records;
    }

    $target = $index + $direction;
    if (!isset($records[$target])) {
        return $records;
    }

    [$records[$index], $records[$target]] = [$records[$target], $records[$index]];
    return rafabru_normalize_order($records);
}

$action = admin_post('action');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    if (!rafabru_verify_csrf($_POST['csrf'] ?? null)) {
        rafabru_flash('error', 'The login form expired. Please try again.');
    } elseif (rafabru_attempt_login(admin_post('username'), (string) ($_POST['password'] ?? ''))) {
        rafabru_flash('success', 'Welcome back, Serafim.');
        rafabru_admin_redirect();
    } else {
        rafabru_flash('error', rafabru_config_ready()
            ? 'The username or password was not accepted.'
            : 'The production password hash has not been configured yet.');
    }
}

if (!rafabru_is_admin()) {
    $flashes = rafabru_take_flashes();
    ?><!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title>our corner — admin login</title>
        <link rel="icon" type="image/png" href="/assets/images/favicon.png">
        <link rel="stylesheet" href="/assets/css/admin.css">
    </head>
    <body>
        <main class="login-window window">
            <header class="titlebar"><span>♡ our corner control panel</span><span>×</span></header>
            <div class="login-body">
                <h1>administrator login</h1>
                <p>One small key for editing links, music, and redirects.</p>
                <?php if ($flashes !== []): ?>
                    <div class="flash-stack">
                        <?php foreach ($flashes as $flash): ?>
                            <div class="flash flash--<?= rafabru_h((string) ($flash['type'] ?? 'error')) ?>"><?= rafabru_h((string) ($flash['message'] ?? '')) ?></div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
                <form method="post" class="form-grid form-grid--single">
                    <input type="hidden" name="action" value="login">
                    <input type="hidden" name="csrf" value="<?= rafabru_h(rafabru_csrf_token()) ?>">
                    <div class="field">
                        <label for="username">Username</label>
                        <input id="username" name="username" type="text" autocomplete="username" value="serafim" required>
                    </div>
                    <div class="field">
                        <label for="password">Password</label>
                        <input id="password" name="password" type="password" autocomplete="current-password" required>
                    </div>
                    <div class="form-actions"><button class="button button--primary" type="submit">log in</button></div>
                </form>
            </div>
        </main>
    </body>
    </html><?php
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action !== '' && $action !== 'login') {
    if (!rafabru_verify_csrf($_POST['csrf'] ?? null)) {
        rafabru_flash('error', 'The form expired. Please try again.');
        rafabru_admin_redirect();
    }

    try {
        if ($action === 'logout') {
            rafabru_logout();
            header('Location: /admin/');
            exit;
        }

        if ($action === 'save_settings') {
            $settings = rafabru_read_json('settings.json', []);
            $settings['title'] = admin_post('title') ?: 'our corner';
            $settings['subtitle'] = admin_post('subtitle') ?: 'welcome';
            $settings['footer'] = [
                'before' => (string) ($_POST['footer_before'] ?? ''),
                'accent' => (string) ($_POST['footer_accent'] ?? ''),
                'after' => (string) ($_POST['footer_after'] ?? ''),
            ];
            $settings['music'] = [
                'enabled' => isset($_POST['music_enabled']),
                'show_player' => isset($_POST['show_player']),
                'mode' => admin_post('music_mode') === 'random' ? 'random' : 'sequential',
                'volume' => min(1, max(0, (float) ($_POST['music_volume'] ?? 0.45))),
            ];
            rafabru_write_json('settings.json', $settings);
            rafabru_flash('success', 'Page settings were saved.');
            rafabru_admin_redirect('settings');
        }

        if ($action === 'add_link') {
            $text = admin_post('text');
            $url = admin_post('url');
            if ($text === '' || !rafabru_is_http_url($url)) {
                throw new RuntimeException('A link needs text and a valid http or https address.');
            }

            $links = rafabru_read_json('links.json', []);
            $links[] = [
                'id' => rafabru_id('link'),
                'text' => $text,
                'url' => $url,
                'description' => admin_post('description'),
                'icon' => admin_post('icon') ?: 'heart',
                'order' => count($links) + 1,
                'enabled' => isset($_POST['enabled']),
                'new_tab' => isset($_POST['new_tab']),
            ];
            rafabru_write_json('links.json', rafabru_normalize_order($links));
            rafabru_flash('success', 'The link was added.');
            rafabru_admin_redirect('links');
        }

        if (in_array($action, ['save_link', 'delete_link', 'move_link_up', 'move_link_down'], true)) {
            $links = rafabru_read_json('links.json', []);
            $id = admin_post('id');
            $index = rafabru_find_index($links, $id);
            if ($index === null) {
                throw new RuntimeException('That link no longer exists.');
            }

            if ($action === 'delete_link') {
                array_splice($links, $index, 1);
            } elseif ($action === 'move_link_up' || $action === 'move_link_down') {
                $links = admin_move($links, $id, $action === 'move_link_up' ? -1 : 1);
            } else {
                $text = admin_post('text');
                $url = admin_post('url');
                if ($text === '' || !rafabru_is_http_url($url)) {
                    throw new RuntimeException('A link needs text and a valid http or https address.');
                }
                $links[$index]['text'] = $text;
                $links[$index]['url'] = $url;
                $links[$index]['description'] = admin_post('description');
                $links[$index]['icon'] = admin_post('icon') ?: 'heart';
                $links[$index]['enabled'] = isset($_POST['enabled']);
                $links[$index]['new_tab'] = isset($_POST['new_tab']);
            }

            rafabru_write_json('links.json', rafabru_normalize_order($links));
            rafabru_flash('success', $action === 'delete_link' ? 'The link was deleted.' : 'The link list was updated.');
            rafabru_admin_redirect('links');
        }

        if ($action === 'add_redirect') {
            $slug = strtolower(admin_post('slug'));
            $destination = admin_post('destination');
            if (!rafabru_is_valid_slug($slug)) {
                throw new RuntimeException('Use a short slug with lowercase letters, numbers, and hyphens.');
            }
            if (!rafabru_is_http_url($destination)) {
                throw new RuntimeException('The redirect destination must be a valid http or https address.');
            }

            $redirects = rafabru_read_json('redirects.json', []);
            foreach ($redirects as $redirect) {
                if (($redirect['slug'] ?? null) === $slug) {
                    throw new RuntimeException('That redirect slug is already in use.');
                }
            }
            $redirects[] = [
                'id' => rafabru_id('redirect'),
                'slug' => $slug,
                'destination' => $destination,
                'status' => (int) ($_POST['status'] ?? 302) === 301 ? 301 : 302,
                'enabled' => isset($_POST['enabled']),
                'order' => count($redirects) + 1,
            ];
            rafabru_write_json('redirects.json', rafabru_normalize_order($redirects));
            rafabru_flash('success', 'The short redirect was created.');
            rafabru_admin_redirect('redirects');
        }

        if (in_array($action, ['save_redirect', 'delete_redirect'], true)) {
            $redirects = rafabru_read_json('redirects.json', []);
            $id = admin_post('id');
            $index = rafabru_find_index($redirects, $id);
            if ($index === null) {
                throw new RuntimeException('That redirect no longer exists.');
            }

            if ($action === 'delete_redirect') {
                array_splice($redirects, $index, 1);
            } else {
                $slug = strtolower(admin_post('slug'));
                $destination = admin_post('destination');
                if (!rafabru_is_valid_slug($slug) || !rafabru_is_http_url($destination)) {
                    throw new RuntimeException('Check the slug and destination address.');
                }
                foreach ($redirects as $otherIndex => $redirect) {
                    if ($otherIndex !== $index && ($redirect['slug'] ?? null) === $slug) {
                        throw new RuntimeException('That redirect slug is already in use.');
                    }
                }
                $redirects[$index]['slug'] = $slug;
                $redirects[$index]['destination'] = $destination;
                $redirects[$index]['status'] = (int) ($_POST['status'] ?? 302) === 301 ? 301 : 302;
                $redirects[$index]['enabled'] = isset($_POST['enabled']);
            }

            rafabru_write_json('redirects.json', rafabru_normalize_order($redirects));
            rafabru_flash('success', $action === 'delete_redirect' ? 'The redirect was deleted.' : 'The redirect was saved.');
            rafabru_admin_redirect('redirects');
        }

        if ($action === 'upload_song') {
            $upload = $_FILES['song'] ?? null;
            if (!is_array($upload) || (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                throw new RuntimeException('Choose an MP3 file to upload.');
            }

            $size = (int) ($upload['size'] ?? 0);
            if ($size < 1 || $size > (int) rafabru_config()['max_upload_bytes']) {
                throw new RuntimeException('The song is empty or larger than the configured upload limit.');
            }

            $originalName = basename((string) ($upload['name'] ?? 'song.mp3'));
            if (strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) !== 'mp3') {
                throw new RuntimeException('Only MP3 files are accepted.');
            }

            $temporaryPath = (string) ($upload['tmp_name'] ?? '');
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath);
            if (!in_array($mime, ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'application/octet-stream'], true)) {
                throw new RuntimeException('The uploaded file does not look like an MP3.');
            }

            $storedName = 'song_' . bin2hex(random_bytes(12)) . '.mp3';
            $destination = rafabru_audio_dir() . '/' . $storedName;
            if (!move_uploaded_file($temporaryPath, $destination)) {
                throw new RuntimeException('The server could not store the uploaded song.');
            }
            @chmod($destination, 0640);

            $songs = rafabru_read_json('songs.json', []);
            $songs[] = [
                'id' => rafabru_id('song'),
                'title' => admin_post('title') ?: pathinfo($originalName, PATHINFO_FILENAME),
                'filename' => $storedName,
                'original_name' => $originalName,
                'order' => count($songs) + 1,
                'enabled' => isset($_POST['enabled']),
            ];
            rafabru_write_json('songs.json', rafabru_normalize_order($songs));
            rafabru_flash('success', 'The song was uploaded.');
            rafabru_admin_redirect('music');
        }

        if (in_array($action, ['save_song', 'delete_song', 'move_song_up', 'move_song_down'], true)) {
            $songs = rafabru_read_json('songs.json', []);
            $id = admin_post('id');
            $index = rafabru_find_index($songs, $id);
            if ($index === null) {
                throw new RuntimeException('That song no longer exists.');
            }

            if ($action === 'delete_song') {
                $filename = basename((string) ($songs[$index]['filename'] ?? ''));
                if ($filename !== '') {
                    @unlink(rafabru_audio_dir() . '/' . $filename);
                }
                array_splice($songs, $index, 1);
            } elseif ($action === 'move_song_up' || $action === 'move_song_down') {
                $songs = admin_move($songs, $id, $action === 'move_song_up' ? -1 : 1);
            } else {
                $songs[$index]['title'] = admin_post('title') ?: 'untitled song';
                $songs[$index]['enabled'] = isset($_POST['enabled']);
            }

            rafabru_write_json('songs.json', rafabru_normalize_order($songs));
            rafabru_flash('success', $action === 'delete_song' ? 'The song and its file were deleted.' : 'The playlist was updated.');
            rafabru_admin_redirect('music');
        }

        throw new RuntimeException('Unknown administrator action.');
    } catch (Throwable $error) {
        rafabru_flash('error', $error->getMessage());
        rafabru_admin_redirect();
    }
}

$settings = rafabru_read_json('settings.json', []);
$links = rafabru_sort_records(rafabru_read_json('links.json', []));
$redirects = rafabru_sort_records(rafabru_read_json('redirects.json', []));
$songs = rafabru_sort_records(rafabru_read_json('songs.json', []));
$flashes = rafabru_take_flashes();
$music = is_array($settings['music'] ?? null) ? $settings['music'] : [];
$footer = is_array($settings['footer'] ?? null) ? $settings['footer'] : [];
$csrf = rafabru_csrf_token();
$iconOptions = ['folder', 'heart', 'star', 'music', 'photo', 'cloud', 'letter', 'flower', 'gift', 'bow'];
?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>our corner — control panel</title>
    <link rel="icon" type="image/png" href="/assets/images/favicon.png">
    <link rel="stylesheet" href="/assets/css/admin.css">
</head>
<body>
    <main class="admin-shell window">
        <header class="titlebar">
            <span>♡ our corner control panel</span>
            <span class="titlebar__actions">
                <a class="button button--small" href="/" target="_blank" rel="noopener">view site</a>
                <form method="post">
                    <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                    <button class="button button--small" type="submit" name="action" value="logout">log out</button>
                </form>
            </span>
        </header>

        <div class="admin-content">
            <?php if ($flashes !== []): ?>
                <div class="flash-stack">
                    <?php foreach ($flashes as $flash): ?>
                        <div class="flash flash--<?= rafabru_h((string) ($flash['type'] ?? 'error')) ?>"><?= rafabru_h((string) ($flash['message'] ?? '')) ?></div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <nav class="tabs" aria-label="Admin sections">
                <a class="tab-link" href="#settings">page settings</a>
                <a class="tab-link" href="#music">music</a>
                <a class="tab-link" href="#links">links</a>
                <a class="tab-link" href="#redirects">redirects</a>
            </nav>

            <div class="dashboard-grid">
                <section class="panel panel--wide" id="settings">
                    <h2 class="panel__title">page settings</h2>
                    <div class="panel__body">
                        <form method="post" class="form-grid">
                            <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                            <input type="hidden" name="action" value="save_settings">
                            <div class="field"><label for="title">Title</label><input id="title" name="title" type="text" value="<?= rafabru_h((string) ($settings['title'] ?? 'our corner')) ?>" required></div>
                            <div class="field"><label for="subtitle">Subtitle</label><input id="subtitle" name="subtitle" type="text" value="<?= rafabru_h((string) ($settings['subtitle'] ?? 'welcome')) ?>" required></div>
                            <div class="field"><label for="footer-before">Footer before accent</label><input id="footer-before" name="footer_before" type="text" value="<?= rafabru_h((string) ($footer['before'] ?? 'made with ')) ?>"></div>
                            <div class="field"><label for="footer-accent">Accent text</label><input id="footer-accent" name="footer_accent" type="text" value="<?= rafabru_h((string) ($footer['accent'] ?? 'love')) ?>"></div>
                            <div class="field field--full"><label for="footer-after">Footer after accent</label><input id="footer-after" name="footer_after" type="text" value="<?= rafabru_h((string) ($footer['after'] ?? ' by Sol. 28/10/2024')) ?>"></div>
                            <div class="field">
                                <label for="music-mode">Playback order</label>
                                <select id="music-mode" name="music_mode">
                                    <option value="sequential"<?= admin_selected((string) ($music['mode'] ?? 'sequential'), 'sequential') ?>>consecutive playlist</option>
                                    <option value="random"<?= admin_selected((string) ($music['mode'] ?? 'sequential'), 'random') ?>>random songs</option>
                                </select>
                            </div>
                            <div class="field"><label for="music-volume">Starting volume (0–1)</label><input id="music-volume" name="music_volume" type="number" min="0" max="1" step="0.05" value="<?= rafabru_h((string) ($music['volume'] ?? 0.45)) ?>"></div>
                            <div class="field field--full checkbox-row">
                                <label><input type="checkbox" name="music_enabled"<?= admin_checked(($music['enabled'] ?? true) === true) ?>> music enabled</label>
                                <label><input type="checkbox" name="show_player"<?= admin_checked(($music['show_player'] ?? true) === true) ?>> show music player</label>
                            </div>
                            <div class="form-actions"><button class="button button--primary" type="submit">save page settings</button></div>
                        </form>
                    </div>
                </section>

                <section class="panel" id="music">
                    <h2 class="panel__title">music folder and playlist</h2>
                    <div class="panel__body">
                        <p class="note">Upload MP3 files here. Enabled songs play in the order shown, or randomly when random mode is selected. One enabled song loops by itself.</p>
                        <form method="post" enctype="multipart/form-data" class="form-grid form-grid--single">
                            <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                            <input type="hidden" name="action" value="upload_song">
                            <div class="field"><label for="song-title">Display title (optional)</label><input id="song-title" name="title" type="text"></div>
                            <div class="field"><label for="song-file">MP3 file</label><input id="song-file" name="song" type="file" accept="audio/mpeg,.mp3" required></div>
                            <div class="checkbox-row"><label><input type="checkbox" name="enabled" checked> include in playback</label></div>
                            <div class="form-actions"><button class="button button--primary" type="submit">upload song</button></div>
                        </form>

                        <div class="records">
                            <?php if ($songs === []): ?><div class="empty">No songs have been uploaded. The public player will say “no music available.”</div><?php endif; ?>
                            <?php foreach ($songs as $song): ?>
                                <form method="post" class="record">
                                    <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                                    <input type="hidden" name="id" value="<?= rafabru_h((string) ($song['id'] ?? '')) ?>">
                                    <div class="record__header">
                                        <div><h3 class="record__title"><?= rafabru_h((string) ($song['title'] ?? 'untitled song')) ?></h3><p class="record__meta"><?= rafabru_h((string) ($song['original_name'] ?? '')) ?></p></div>
                                        <div class="record__move"><button class="button button--small" type="submit" name="action" value="move_song_up" title="Move up">↑</button><button class="button button--small" type="submit" name="action" value="move_song_down" title="Move down">↓</button></div>
                                    </div>
                                    <div class="form-grid form-grid--single">
                                        <div class="field"><label>Display title</label><input name="title" type="text" value="<?= rafabru_h((string) ($song['title'] ?? '')) ?>" required></div>
                                        <div class="checkbox-row"><label><input type="checkbox" name="enabled"<?= admin_checked(($song['enabled'] ?? false) === true) ?>> enabled</label></div>
                                        <div class="form-actions"><button class="button" type="submit" name="action" value="save_song">save</button><button class="button button--danger" type="submit" name="action" value="delete_song" formnovalidate onclick="return confirm('Delete this song and its MP3 file?')">delete</button></div>
                                    </div>
                                </form>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>

                <section class="panel" id="links">
                    <h2 class="panel__title">public buttons</h2>
                    <div class="panel__body">
                        <form method="post" class="form-grid">
                            <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                            <input type="hidden" name="action" value="add_link">
                            <div class="field"><label for="link-text">Button text</label><input id="link-text" name="text" type="text" required></div>
                            <div class="field"><label for="link-icon">Icon</label><select id="link-icon" name="icon"><?php foreach ($iconOptions as $icon): ?><option value="<?= rafabru_h($icon) ?>"><?= rafabru_h($icon) ?></option><?php endforeach; ?></select></div>
                            <div class="field field--full"><label for="link-url">Destination</label><input id="link-url" name="url" type="url" placeholder="https://" required></div>
                            <div class="field field--full"><label for="link-description">Small description (optional)</label><textarea id="link-description" name="description"></textarea></div>
                            <div class="field field--full checkbox-row"><label><input type="checkbox" name="enabled"> visible</label><label><input type="checkbox" name="new_tab" checked> open in new tab</label></div>
                            <div class="form-actions"><button class="button button--primary" type="submit">add button</button></div>
                        </form>

                        <div class="records">
                            <?php if ($links === []): ?><div class="empty">There are no buttons yet. The public page currently shows its gentle empty-state message.</div><?php endif; ?>
                            <?php foreach ($links as $link): ?>
                                <form method="post" class="record">
                                    <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                                    <input type="hidden" name="id" value="<?= rafabru_h((string) ($link['id'] ?? '')) ?>">
                                    <div class="record__header">
                                        <div><h3 class="record__title"><?= rafabru_h((string) ($link['text'] ?? 'untitled link')) ?></h3><p class="record__meta"><?= rafabru_h((string) ($link['url'] ?? '')) ?></p></div>
                                        <div class="record__move"><button class="button button--small" type="submit" name="action" value="move_link_up">↑</button><button class="button button--small" type="submit" name="action" value="move_link_down">↓</button></div>
                                    </div>
                                    <div class="form-grid">
                                        <div class="field"><label>Button text</label><input name="text" type="text" value="<?= rafabru_h((string) ($link['text'] ?? '')) ?>" required></div>
                                        <div class="field"><label>Icon</label><select name="icon"><?php foreach ($iconOptions as $icon): ?><option value="<?= rafabru_h($icon) ?>"<?= admin_selected((string) ($link['icon'] ?? 'heart'), $icon) ?>><?= rafabru_h($icon) ?></option><?php endforeach; ?></select></div>
                                        <div class="field field--full"><label>Destination</label><input name="url" type="url" value="<?= rafabru_h((string) ($link['url'] ?? '')) ?>" required></div>
                                        <div class="field field--full"><label>Description</label><textarea name="description"><?= rafabru_h((string) ($link['description'] ?? '')) ?></textarea></div>
                                        <div class="field field--full checkbox-row"><label><input type="checkbox" name="enabled"<?= admin_checked(($link['enabled'] ?? false) === true) ?>> visible</label><label><input type="checkbox" name="new_tab"<?= admin_checked(($link['new_tab'] ?? true) === true) ?>> new tab</label></div>
                                        <div class="form-actions"><button class="button" type="submit" name="action" value="save_link">save</button><button class="button button--danger" type="submit" name="action" value="delete_link" formnovalidate onclick="return confirm('Delete this button?')">delete</button></div>
                                    </div>
                                </form>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>

                <section class="panel panel--wide" id="redirects">
                    <h2 class="panel__title">short redirects</h2>
                    <div class="panel__body">
                        <p class="note">Example: slug <span class="code">playlist</span> creates <span class="code">https://rafabru.duckdns.org/playlist</span>.</p>
                        <form method="post" class="form-grid">
                            <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                            <input type="hidden" name="action" value="add_redirect">
                            <div class="field"><label for="redirect-slug">Short slug</label><input id="redirect-slug" name="slug" type="text" pattern="[a-z0-9][a-z0-9-]{0,62}" placeholder="playlist" required></div>
                            <div class="field"><label for="redirect-status">Redirect type</label><select id="redirect-status" name="status"><option value="302">302 — changeable</option><option value="301">301 — permanent</option></select></div>
                            <div class="field field--full"><label for="redirect-destination">Destination</label><input id="redirect-destination" name="destination" type="url" placeholder="https://" required></div>
                            <div class="field field--full checkbox-row"><label><input type="checkbox" name="enabled" checked> enabled</label></div>
                            <div class="form-actions"><button class="button button--primary" type="submit">create redirect</button></div>
                        </form>

                        <div class="records">
                            <?php if ($redirects === []): ?><div class="empty">No redirects have been created.</div><?php endif; ?>
                            <?php foreach ($redirects as $redirect): ?>
                                <form method="post" class="record">
                                    <input type="hidden" name="csrf" value="<?= rafabru_h($csrf) ?>">
                                    <input type="hidden" name="id" value="<?= rafabru_h((string) ($redirect['id'] ?? '')) ?>">
                                    <div class="record__header"><div><h3 class="record__title">/<?= rafabru_h((string) ($redirect['slug'] ?? '')) ?></h3><p class="record__meta"><?= rafabru_h((string) ($redirect['destination'] ?? '')) ?></p></div></div>
                                    <div class="form-grid">
                                        <div class="field"><label>Short slug</label><input name="slug" type="text" value="<?= rafabru_h((string) ($redirect['slug'] ?? '')) ?>" required></div>
                                        <div class="field"><label>Redirect type</label><select name="status"><option value="302"<?= admin_selected((string) ($redirect['status'] ?? 302), '302') ?>>302 — changeable</option><option value="301"<?= admin_selected((string) ($redirect['status'] ?? 302), '301') ?>>301 — permanent</option></select></div>
                                        <div class="field field--full"><label>Destination</label><input name="destination" type="url" value="<?= rafabru_h((string) ($redirect['destination'] ?? '')) ?>" required></div>
                                        <div class="field field--full checkbox-row"><label><input type="checkbox" name="enabled"<?= admin_checked(($redirect['enabled'] ?? false) === true) ?>> enabled</label></div>
                                        <div class="form-actions"><button class="button" type="submit" name="action" value="save_redirect">save</button><button class="button button--danger" type="submit" name="action" value="delete_redirect" formnovalidate onclick="return confirm('Delete this redirect?')">delete</button></div>
                                    </div>
                                </form>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </main>
</body>
</html>
