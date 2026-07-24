<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$note = rafabru_wall_read_note(trim((string) ($_GET['id'] ?? '')));
if ($note === null) {
    rafabru_wall_json(['ok' => false, 'error' => 'note_not_found'], 404);
}

rafabru_wall_json(['ok' => true, 'note' => $note]);
