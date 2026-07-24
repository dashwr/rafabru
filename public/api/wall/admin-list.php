<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if (!rafabru_is_admin()) {
    rafabru_wall_json(['ok' => false, 'error' => 'not_authorized'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$statement = rafabru_wall_database()->query(
    'SELECT public_id, post_number, title, author, preview, color_key, x_ratio, y_position, created_at, deleted_at
     FROM wall_notes
     ORDER BY post_number DESC'
);

$notes = array_map(static function (array $row): array {
    return [
        'id' => (string) $row['public_id'],
        'number' => (int) $row['post_number'],
        'title' => (string) $row['title'],
        'author' => (string) $row['author'],
        'preview' => (string) $row['preview'],
        'color' => (string) $row['color_key'],
        'x' => (float) $row['x_ratio'],
        'y' => (int) $row['y_position'],
        'createdAt' => (string) $row['created_at'],
        'deletedAt' => $row['deleted_at'] !== null ? (string) $row['deleted_at'] : null,
    ];
}, $statement->fetchAll());

rafabru_wall_json(['ok' => true, 'notes' => $notes]);
