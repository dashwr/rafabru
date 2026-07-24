<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if (!rafabru_is_admin()) {
    rafabru_wall_json(['ok' => false, 'error' => 'not_authorized'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$input = rafabru_wall_json_input();
if (!rafabru_verify_csrf(isset($input['csrf']) ? (string) $input['csrf'] : null)) {
    rafabru_wall_json(['ok' => false, 'error' => 'csrf_failed', 'message' => 'The form expired. Please reload the page.'], 403);
}

$publicId = trim((string) ($input['id'] ?? ''));
$action = trim((string) ($input['action'] ?? 'save'));
if (preg_match('/^note_[a-f0-9]{24}$/', $publicId) !== 1) {
    rafabru_wall_json(['ok' => false, 'error' => 'invalid_note'], 422);
}

$database = rafabru_wall_database();
$exists = $database->prepare('SELECT id FROM wall_notes WHERE public_id = :public_id LIMIT 1');
$exists->execute(['public_id' => $publicId]);
if ($exists->fetchColumn() === false) {
    rafabru_wall_json(['ok' => false, 'error' => 'note_not_found'], 404);
}

try {
    if ($action === 'delete') {
        $statement = $database->prepare('UPDATE wall_notes SET deleted_at = :deleted_at, updated_at = :updated_at WHERE public_id = :public_id');
        $timestamp = gmdate('c');
        $statement->execute(['deleted_at' => $timestamp, 'updated_at' => $timestamp, 'public_id' => $publicId]);
    } elseif ($action === 'restore') {
        $statement = $database->prepare('UPDATE wall_notes SET deleted_at = NULL, updated_at = :updated_at WHERE public_id = :public_id');
        $statement->execute(['updated_at' => gmdate('c'), 'public_id' => $publicId]);
    } elseif ($action === 'save') {
        $title = rafabru_wall_clean_text($input['title'] ?? '', 80);
        $author = rafabru_wall_clean_text($input['author'] ?? '', 80);
        $x = min(0.96, max(0.04, (float) ($input['x'] ?? 0.5)));
        $y = min(100000, max(130, (int) ($input['y'] ?? 220)));
        $statement = $database->prepare(
            'UPDATE wall_notes
             SET title = :title, author = :author, x_ratio = :x_ratio, y_position = :y_position, updated_at = :updated_at
             WHERE public_id = :public_id'
        );
        $statement->execute([
            'title' => $title,
            'author' => $author,
            'x_ratio' => $x,
            'y_position' => $y,
            'updated_at' => gmdate('c'),
            'public_id' => $publicId,
        ]);
    } else {
        rafabru_wall_json(['ok' => false, 'error' => 'unknown_action'], 422);
    }
} catch (InvalidArgumentException $error) {
    rafabru_wall_json(['ok' => false, 'error' => 'invalid_note', 'message' => $error->getMessage()], 422);
}

rafabru_wall_json(['ok' => true]);
