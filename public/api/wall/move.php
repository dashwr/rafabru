<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$input = rafabru_wall_json_input();
try {
    $note = rafabru_wall_move_note(
        trim((string) ($input['id'] ?? '')),
        $input['author'] ?? '',
        $input['x'] ?? 0.5,
        $input['y'] ?? 220
    );
    rafabru_wall_json(['ok' => true, 'note' => $note]);
} catch (DomainException $error) {
    rafabru_wall_json(['ok' => false, 'error' => 'not_owner', 'message' => $error->getMessage()], 403);
} catch (InvalidArgumentException $error) {
    rafabru_wall_json(['ok' => false, 'error' => 'invalid_note', 'message' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('Rafabru wall move failed: ' . $error->getMessage());
    rafabru_wall_json(['ok' => false, 'error' => 'move_failed', 'message' => 'The note could not be moved.'], 500);
}
