<?php

declare(strict_types=1);

const RAFABRU_ROOT = __DIR__ . '/..';

function rafabru_config(): array
{
    static $config = null;

    if (is_array($config)) {
        return $config;
    }

    $candidates = [];
    $environmentPath = getenv('RAFABRU_CONFIG');

    if (is_string($environmentPath) && $environmentPath !== '') {
        $candidates[] = $environmentPath;
    }

    $candidates[] = '/home1/raf32088/rafabru-data/config.php';
    $candidates[] = RAFABRU_ROOT . '/config/config.local.php';
    $candidates[] = RAFABRU_ROOT . '/config/config.example.php';

    foreach ($candidates as $candidate) {
        if (!is_file($candidate)) {
            continue;
        }

        $loaded = require $candidate;

        if (is_array($loaded)) {
            $config = $loaded;
            break;
        }
    }

    if (!is_array($config)) {
        $config = [];
    }

    $config += [
        'data_dir' => RAFABRU_ROOT . '/storage/runtime',
        'session_name' => 'rafabru_admin',
        'admin_username' => 'serafim',
        'admin_password_hash' => 'REPLACE_WITH_PASSWORD_HASH',
        'session_timeout' => 1800,
        'max_upload_bytes' => 25 * 1024 * 1024,
    ];

    return $config;
}

function rafabru_data_dir(): string
{
    static $directory = null;

    if (is_string($directory)) {
        return $directory;
    }

    $configured = rtrim((string) rafabru_config()['data_dir'], '/');

    if ($configured !== '' && (is_dir($configured) || @mkdir($configured, 0750, true))) {
        $directory = $configured;
    } else {
        $directory = RAFABRU_ROOT . '/storage/runtime';
        if (!is_dir($directory)) {
            @mkdir($directory, 0750, true);
        }
    }

    return $directory;
}

function rafabru_audio_dir(): string
{
    $directory = rafabru_data_dir() . '/audio';

    if (!is_dir($directory)) {
        @mkdir($directory, 0750, true);
    }

    return $directory;
}

function rafabru_templates(): array
{
    return [
        'settings.json' => RAFABRU_ROOT . '/storage/templates/settings.json',
        'links.json' => RAFABRU_ROOT . '/storage/templates/links.json',
        'redirects.json' => RAFABRU_ROOT . '/storage/templates/redirects.json',
        'songs.json' => RAFABRU_ROOT . '/storage/templates/songs.json',
    ];
}

function rafabru_ensure_data_files(): void
{
    foreach (rafabru_templates() as $name => $template) {
        $destination = rafabru_data_dir() . '/' . $name;

        if (!is_file($destination) && is_file($template)) {
            @copy($template, $destination);
            @chmod($destination, 0640);
        }
    }
}

function rafabru_read_json(string $name, array $fallback = []): array
{
    rafabru_ensure_data_files();
    $path = rafabru_data_dir() . '/' . basename($name);

    if (!is_file($path)) {
        return $fallback;
    }

    $contents = @file_get_contents($path);
    if (!is_string($contents)) {
        return $fallback;
    }

    try {
        $decoded = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        return is_array($decoded) ? $decoded : $fallback;
    } catch (JsonException) {
        return $fallback;
    }
}

function rafabru_write_json(string $name, array $data): void
{
    rafabru_ensure_data_files();
    $path = rafabru_data_dir() . '/' . basename($name);
    $temporary = $path . '.tmp.' . bin2hex(random_bytes(6));
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;

    if (@file_put_contents($temporary, $json, LOCK_EX) === false) {
        throw new RuntimeException('Could not write the temporary data file.');
    }

    @chmod($temporary, 0640);

    if (!@rename($temporary, $path)) {
        @unlink($temporary);
        throw new RuntimeException('Could not replace the data file.');
    }
}

function rafabru_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function rafabru_sort_records(array $records): array
{
    usort($records, static function (array $left, array $right): int {
        return ((int) ($left['order'] ?? 0)) <=> ((int) ($right['order'] ?? 0));
    });

    return $records;
}

function rafabru_normalize_order(array $records): array
{
    $records = rafabru_sort_records(array_values($records));

    foreach ($records as $index => &$record) {
        $record['order'] = $index + 1;
    }
    unset($record);

    return $records;
}

function rafabru_id(string $prefix): string
{
    return $prefix . '_' . bin2hex(random_bytes(8));
}

function rafabru_is_http_url(string $url): bool
{
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        return false;
    }

    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
    return in_array($scheme, ['http', 'https'], true);
}

function rafabru_reserved_slugs(): array
{
    return [
        'admin', 'api', 'app', 'assets', 'audio', 'audio.php', 'config',
        'index.php', 'login', 'logout', 'redirect.php', 'storage',
    ];
}

function rafabru_is_valid_slug(string $slug): bool
{
    return preg_match('/^[a-z0-9][a-z0-9-]{0,62}$/', $slug) === 1
        && !in_array($slug, rafabru_reserved_slugs(), true);
}

function rafabru_find_index(array $records, string $id): ?int
{
    foreach ($records as $index => $record) {
        if (($record['id'] ?? null) === $id) {
            return $index;
        }
    }

    return null;
}

function rafabru_config_ready(): bool
{
    $hash = (string) rafabru_config()['admin_password_hash'];
    return $hash !== '' && $hash !== 'REPLACE_WITH_PASSWORD_HASH';
}

function rafabru_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_name((string) rafabru_config()['session_name']);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();

    $timeout = max(300, (int) rafabru_config()['session_timeout']);
    $lastSeen = (int) ($_SESSION['last_seen'] ?? 0);

    if ($lastSeen > 0 && time() - $lastSeen > $timeout) {
        $_SESSION = [];
        session_regenerate_id(true);
    }

    $_SESSION['last_seen'] = time();
}

function rafabru_is_admin(): bool
{
    rafabru_start_session();
    return ($_SESSION['is_admin'] ?? false) === true;
}

function rafabru_attempt_login(string $username, string $password): bool
{
    rafabru_start_session();

    if (!rafabru_config_ready()) {
        return false;
    }

    $expectedUsername = (string) rafabru_config()['admin_username'];
    $passwordHash = (string) rafabru_config()['admin_password_hash'];
    $valid = hash_equals($expectedUsername, $username) && password_verify($password, $passwordHash);

    if (!$valid) {
        $_SESSION['failed_logins'] = ((int) ($_SESSION['failed_logins'] ?? 0)) + 1;
        usleep(min(1500000, 250000 * (int) $_SESSION['failed_logins']));
        return false;
    }

    session_regenerate_id(true);
    $_SESSION['is_admin'] = true;
    $_SESSION['failed_logins'] = 0;
    $_SESSION['last_seen'] = time();
    return true;
}

function rafabru_logout(): void
{
    rafabru_start_session();
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
    }

    session_destroy();
}

function rafabru_csrf_token(): string
{
    rafabru_start_session();

    if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }

    return $_SESSION['csrf'];
}

function rafabru_verify_csrf(?string $token): bool
{
    rafabru_start_session();
    return is_string($token)
        && isset($_SESSION['csrf'])
        && is_string($_SESSION['csrf'])
        && hash_equals($_SESSION['csrf'], $token);
}

function rafabru_flash(string $type, string $message): void
{
    rafabru_start_session();
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function rafabru_take_flashes(): array
{
    rafabru_start_session();
    $messages = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return is_array($messages) ? $messages : [];
}

function rafabru_admin_redirect(string $fragment = ''): never
{
    header('Location: /admin/' . ($fragment !== '' ? '#' . rawurlencode($fragment) : ''));
    exit;
}

rafabru_ensure_data_files();
