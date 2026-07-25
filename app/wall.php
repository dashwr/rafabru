<?php

declare(strict_types=1);

function rafabru_wall_database_path(): string
{
    return rafabru_data_dir() . '/wall.sqlite';
}

function rafabru_wall_database(): PDO
{
    static $database = null;

    if ($database instanceof PDO) {
        return $database;
    }

    $database = new PDO('sqlite:' . rafabru_wall_database_path(), null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $database->exec('PRAGMA foreign_keys = ON');
    $database->exec('PRAGMA journal_mode = WAL');
    $database->exec('PRAGMA synchronous = NORMAL');
    $database->exec('PRAGMA busy_timeout = 5000');

    rafabru_wall_migrate($database);
    return $database;
}

function rafabru_wall_table_columns(PDO $database, string $table): array
{
    $rows = $database->query('PRAGMA table_info(' . $table . ')')->fetchAll();
    $columns = [];
    foreach ($rows as $row) {
        $name = (string) ($row['name'] ?? '');
        if ($name !== '') {
            $columns[$name] = true;
        }
    }
    return $columns;
}

function rafabru_wall_migrate(?PDO $database = null): void
{
    $database ??= rafabru_wall_database();
    $database->exec(
        'CREATE TABLE IF NOT EXISTS wall_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT NOT NULL UNIQUE,
            post_number INTEGER NOT NULL UNIQUE,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            preview TEXT NOT NULL,
            body TEXT NOT NULL,
            color_key TEXT NOT NULL,
            x_ratio REAL NOT NULL,
            y_position INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT NULL,
            note_type TEXT NOT NULL DEFAULT "write",
            checklist_json TEXT NOT NULL DEFAULT "[]",
            rotation REAL NOT NULL DEFAULT 0
        )'
    );

    $columns = rafabru_wall_table_columns($database, 'wall_notes');
    if (!isset($columns['note_type'])) {
        $database->exec('ALTER TABLE wall_notes ADD COLUMN note_type TEXT NOT NULL DEFAULT "write"');
    }
    if (!isset($columns['checklist_json'])) {
        $database->exec('ALTER TABLE wall_notes ADD COLUMN checklist_json TEXT NOT NULL DEFAULT "[]"');
    }
    if (!isset($columns['rotation'])) {
        $database->exec('ALTER TABLE wall_notes ADD COLUMN rotation REAL NOT NULL DEFAULT 0');
    }

    $database->exec('CREATE INDEX IF NOT EXISTS wall_notes_visible_position ON wall_notes(deleted_at, y_position, post_number)');
    $database->exec('CREATE INDEX IF NOT EXISTS wall_notes_author ON wall_notes(author, deleted_at)');
}

function rafabru_wall_colors(): array
{
    return [
        'blue-1', 'blue-2', 'blue-3',
        'light-blue-1', 'light-blue-2', 'light-blue-3',
        'pink-1', 'pink-2', 'pink-3',
        'light-pink-1', 'light-pink-2', 'light-pink-3',
        'white-1', 'white-2', 'white-3',
        'yellow-classic',
    ];
}

function rafabru_wall_clean_text(mixed $value, int $maximum, bool $required = true): string
{
    $text = str_replace(["\r\n", "\r"], "\n", trim((string) $value));
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';

    if ($required && $text === '') {
        throw new InvalidArgumentException('A required field is empty.');
    }

    if (mb_strlen($text, 'UTF-8') > $maximum) {
        throw new InvalidArgumentException('One of the fields is longer than allowed.');
    }

    return $text;
}

function rafabru_wall_identity_key(mixed $value): string
{
    $name = rafabru_wall_clean_text($value, 32, false);
    return mb_strtolower(preg_replace('/\s+/u', ' ', trim($name)) ?? trim($name), 'UTF-8');
}

function rafabru_wall_author_matches(string $storedAuthor, mixed $claimedAuthor): bool
{
    $stored = rafabru_wall_identity_key($storedAuthor);
    $claimed = rafabru_wall_identity_key($claimedAuthor);
    return $stored !== '' && $claimed !== '' && hash_equals($stored, $claimed);
}

function rafabru_wall_note_type(mixed $value): string
{
    return (string) $value === 'check' ? 'check' : 'write';
}

function rafabru_wall_rotation(mixed $value): float
{
    if (!is_numeric($value)) {
        return random_int(-260, 260) / 100;
    }
    return min(3.5, max(-3.5, (float) $value));
}

function rafabru_wall_clean_checklist(mixed $value): array
{
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        $value = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($value)) {
        return [];
    }

    $items = [];
    foreach (array_slice($value, 0, 100) as $item) {
        if (is_array($item)) {
            $text = rafabru_wall_clean_text($item['text'] ?? '', 180, false);
            $checked = ($item['checked'] ?? false) === true;
        } else {
            $text = rafabru_wall_clean_text($item, 180, false);
            $checked = false;
        }
        if ($text === '' && count($items) >= 5) {
            continue;
        }
        $items[] = ['text' => $text, 'checked' => $checked];
    }

    while (count($items) < 5) {
        $items[] = ['text' => '', 'checked' => false];
    }
    return $items;
}

function rafabru_wall_decode_checklist(mixed $value): array
{
    if (!is_string($value) || $value === '') {
        return [];
    }
    $decoded = json_decode($value, true);
    return is_array($decoded) ? rafabru_wall_clean_checklist($decoded) : [];
}

function rafabru_wall_public_note(array $row, bool $includeBody = false): array
{
    $type = rafabru_wall_note_type($row['note_type'] ?? 'write');
    $checklist = $type === 'check' ? rafabru_wall_decode_checklist($row['checklist_json'] ?? '[]') : [];
    $completed = $type === 'check'
        && $checklist !== []
        && count(array_filter($checklist, static fn (array $item): bool => trim((string) ($item['text'] ?? '')) !== '')) > 0
        && count(array_filter($checklist, static fn (array $item): bool => trim((string) ($item['text'] ?? '')) !== '' && ($item['checked'] ?? false) !== true)) === 0;

    $note = [
        'id' => (string) $row['public_id'],
        'number' => (int) $row['post_number'],
        'title' => (string) $row['title'],
        'author' => (string) $row['author'],
        'preview' => (string) $row['preview'],
        'color' => (string) $row['color_key'],
        'x' => (float) $row['x_ratio'],
        'y' => (int) $row['y_position'],
        'rotation' => (float) ($row['rotation'] ?? 0),
        'type' => $type,
        'checklist' => $checklist,
        'completed' => $completed,
        'createdAt' => (string) $row['created_at'],
        'updatedAt' => (string) ($row['updated_at'] ?? $row['created_at']),
    ];

    if ($includeBody) {
        $note['body'] = (string) $row['body'];
    }

    return $note;
}

function rafabru_wall_select_columns(bool $includeBody = false): string
{
    $columns = 'public_id, post_number, title, author, preview, color_key, x_ratio, y_position, rotation, note_type, checklist_json, created_at, updated_at';
    return $includeBody ? $columns . ', body' : $columns;
}

function rafabru_wall_list_notes(): array
{
    $statement = rafabru_wall_database()->query(
        'SELECT ' . rafabru_wall_select_columns(false) . '
         FROM wall_notes
         WHERE deleted_at IS NULL
         ORDER BY y_position ASC, post_number ASC'
    );

    return array_map(
        static fn (array $row): array => rafabru_wall_public_note($row),
        $statement->fetchAll()
    );
}

function rafabru_wall_read_note(string $publicId): ?array
{
    if (preg_match('/^note_[a-f0-9]{24}$/', $publicId) !== 1) {
        return null;
    }

    $statement = rafabru_wall_database()->prepare(
        'SELECT ' . rafabru_wall_select_columns(true) . '
         FROM wall_notes
         WHERE public_id = :public_id AND deleted_at IS NULL
         LIMIT 1'
    );
    $statement->execute(['public_id' => $publicId]);
    $row = $statement->fetch();

    return is_array($row) ? rafabru_wall_public_note($row, true) : null;
}

function rafabru_wall_find_owned_row(string $publicId, mixed $claimedAuthor): array
{
    $note = rafabru_wall_read_note($publicId);
    if ($note === null) {
        throw new InvalidArgumentException('That note no longer exists.');
    }
    if (!rafabru_wall_author_matches((string) $note['author'], $claimedAuthor)) {
        throw new DomainException('The supplied name does not own this note.');
    }
    return $note;
}

function rafabru_wall_next_number(): int
{
    $value = rafabru_wall_database()->query(
        'SELECT COALESCE(MAX(post_number), 0) + 1 FROM wall_notes'
    )->fetchColumn();

    return max(1, (int) $value);
}

function rafabru_wall_create_note(array $input): array
{
    $type = rafabru_wall_note_type($input['noteType'] ?? $input['type'] ?? 'write');
    $author = rafabru_wall_clean_text($input['author'] ?? '', 32);
    $body = rafabru_wall_clean_text($input['body'] ?? '', 15000, $type === 'write');
    $checklist = $type === 'check' ? rafabru_wall_clean_checklist($input['checklist'] ?? []) : [];

    $preview = rafabru_wall_clean_text($input['preview'] ?? '', 240, false);
    if ($preview === '') {
        $preview = $type === 'check'
            ? 'Checklist'
            : mb_substr(preg_replace('/\s+/u', ' ', $body) ?? $body, 0, 220, 'UTF-8');
    }

    $requestedTitle = rafabru_wall_clean_text($input['title'] ?? '', 80, false);
    $color = (string) ($input['color'] ?? 'yellow-classic');
    if (!in_array($color, rafabru_wall_colors(), true)) {
        throw new InvalidArgumentException('The selected post-it color is not available.');
    }

    $x = (float) ($input['x'] ?? 0.5);
    $y = (int) ($input['y'] ?? 220);
    if (!is_finite($x)) {
        $x = 0.5;
    }
    $x = min(0.96, max(0.04, $x));
    $y = min(100000, max(130, $y));
    $rotation = rafabru_wall_rotation($input['rotation'] ?? null);

    $database = rafabru_wall_database();
    $transactionStarted = false;

    try {
        $database->exec('BEGIN IMMEDIATE');
        $transactionStarted = true;

        $postNumber = max(1, (int) $database->query(
            'SELECT COALESCE(MAX(post_number), 0) + 1 FROM wall_notes'
        )->fetchColumn());
        $fallback = $type === 'check' ? 'Checklist #' : 'Post-it #';
        $title = $requestedTitle !== '' ? $requestedTitle : $fallback . str_pad((string) $postNumber, 2, '0', STR_PAD_LEFT);
        $publicId = 'note_' . bin2hex(random_bytes(12));
        $timestamp = gmdate('c');

        $statement = $database->prepare(
            'INSERT INTO wall_notes
                (public_id, post_number, title, author, preview, body, color_key, x_ratio, y_position, rotation, note_type, checklist_json, created_at, updated_at)
             VALUES
                (:public_id, :post_number, :title, :author, :preview, :body, :color_key, :x_ratio, :y_position, :rotation, :note_type, :checklist_json, :created_at, :updated_at)'
        );
        $statement->execute([
            'public_id' => $publicId,
            'post_number' => $postNumber,
            'title' => $title,
            'author' => $author,
            'preview' => $preview,
            'body' => $body,
            'color_key' => $color,
            'x_ratio' => $x,
            'y_position' => $y,
            'rotation' => $rotation,
            'note_type' => $type,
            'checklist_json' => json_encode($checklist, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);

        $database->exec('COMMIT');
        $transactionStarted = false;
    } catch (Throwable $error) {
        if ($transactionStarted) {
            try {
                $database->exec('ROLLBACK');
            } catch (Throwable) {
            }
        }
        throw $error;
    }

    $note = rafabru_wall_read_note($publicId);
    if ($note === null) {
        throw new RuntimeException('The note was saved but could not be reloaded.');
    }
    return $note;
}

function rafabru_wall_move_note(string $publicId, mixed $claimedAuthor, mixed $xValue, mixed $yValue): array
{
    rafabru_wall_find_owned_row($publicId, $claimedAuthor);
    $x = min(0.96, max(0.04, is_numeric($xValue) ? (float) $xValue : 0.5));
    $y = min(100000, max(130, is_numeric($yValue) ? (int) $yValue : 220));
    $statement = rafabru_wall_database()->prepare(
        'UPDATE wall_notes SET x_ratio = :x, y_position = :y, updated_at = :updated_at WHERE public_id = :public_id AND deleted_at IS NULL'
    );
    $statement->execute(['x' => $x, 'y' => $y, 'updated_at' => gmdate('c'), 'public_id' => $publicId]);
    return rafabru_wall_read_note($publicId) ?? throw new RuntimeException('The note could not be reloaded.');
}

function rafabru_wall_update_note(string $publicId, mixed $claimedAuthor, array $input): array
{
    $existing = rafabru_wall_find_owned_row($publicId, $claimedAuthor);
    $type = rafabru_wall_note_type($existing['type'] ?? 'write');
    $title = rafabru_wall_clean_text($input['title'] ?? $existing['title'], 80);
    $body = $type === 'write'
        ? rafabru_wall_clean_text($input['body'] ?? $existing['body'], 15000)
        : (string) ($existing['body'] ?? '');
    $checklist = $type === 'check'
        ? rafabru_wall_clean_checklist($input['checklist'] ?? $existing['checklist'])
        : [];
    $color = (string) ($input['color'] ?? $existing['color']);
    if (!in_array($color, rafabru_wall_colors(), true)) {
        $color = (string) $existing['color'];
    }
    $preview = $type === 'check'
        ? $title
        : mb_substr(preg_replace('/\s+/u', ' ', $body) ?? $body, 0, 220, 'UTF-8');

    $statement = rafabru_wall_database()->prepare(
        'UPDATE wall_notes
         SET title = :title, body = :body, preview = :preview, checklist_json = :checklist_json, color_key = :color_key, updated_at = :updated_at
         WHERE public_id = :public_id AND deleted_at IS NULL'
    );
    $statement->execute([
        'title' => $title,
        'body' => $body,
        'preview' => $preview,
        'checklist_json' => json_encode($checklist, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
        'color_key' => $color,
        'updated_at' => gmdate('c'),
        'public_id' => $publicId,
    ]);
    return rafabru_wall_read_note($publicId) ?? throw new RuntimeException('The note could not be reloaded.');
}

function rafabru_wall_set_checklist_item(string $publicId, mixed $claimedAuthor, int $index, bool $checked): array
{
    $existing = rafabru_wall_find_owned_row($publicId, $claimedAuthor);
    if (($existing['type'] ?? 'write') !== 'check') {
        throw new InvalidArgumentException('That note is not a checklist.');
    }
    $checklist = rafabru_wall_clean_checklist($existing['checklist'] ?? []);
    if (!array_key_exists($index, $checklist) || trim((string) ($checklist[$index]['text'] ?? '')) === '') {
        throw new InvalidArgumentException('That checklist item does not exist.');
    }
    $checklist[$index]['checked'] = $checked;
    return rafabru_wall_update_note($publicId, $claimedAuthor, ['title' => $existing['title'], 'checklist' => $checklist]);
}

function rafabru_wall_turnstile_site_key(): string
{
    return trim((string) (rafabru_config()['turnstile_site_key'] ?? ''));
}

function rafabru_wall_turnstile_secret_key(): string
{
    return trim((string) (rafabru_config()['turnstile_secret_key'] ?? ''));
}

function rafabru_wall_turnstile_ready(): bool
{
    return rafabru_wall_turnstile_site_key() !== '' && rafabru_wall_turnstile_secret_key() !== '';
}

function rafabru_wall_verify_turnstile(string $token): bool
{
    $secret = rafabru_wall_turnstile_secret_key();
    if ($secret === '' || $token === '' || strlen($token) > 2048) {
        return false;
    }

    $payload = ['secret' => $secret, 'response' => $token];
    $remoteAddress = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    if ($remoteAddress !== '') {
        $payload['remoteip'] = $remoteAddress;
    }

    $endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    $response = false;
    if (function_exists('curl_init')) {
        $curl = curl_init($endpoint);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $response = curl_exec($curl);
        curl_close($curl);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => http_build_query($payload),
                'timeout' => 12,
            ],
        ]);
        $response = @file_get_contents($endpoint, false, $context);
    }

    if (!is_string($response) || $response === '') {
        return false;
    }
    $decoded = json_decode($response, true);
    return is_array($decoded) && ($decoded['success'] ?? false) === true;
}

function rafabru_wall_issue_publish_token(): string
{
    rafabru_start_session();
    $token = bin2hex(random_bytes(24));
    $_SESSION['wall_publish_permission'] = [
        'token_hash' => hash('sha256', $token),
        'expires_at' => time() + 900,
    ];
    return $token;
}

function rafabru_wall_publish_token_valid(string $token): bool
{
    rafabru_start_session();
    $permission = $_SESSION['wall_publish_permission'] ?? null;
    if (!is_array($permission) || (int) ($permission['expires_at'] ?? 0) < time()) {
        unset($_SESSION['wall_publish_permission']);
        return false;
    }

    $expected = (string) ($permission['token_hash'] ?? '');
    return $expected !== '' && hash_equals($expected, hash('sha256', $token));
}

function rafabru_wall_consume_publish_token(): void
{
    rafabru_start_session();
    unset($_SESSION['wall_publish_permission']);
}

function rafabru_wall_json_input(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || $raw === '') {
        return [];
    }

    try {
        $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        return is_array($decoded) ? $decoded : [];
    } catch (JsonException) {
        return [];
    }
}

function rafabru_wall_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
