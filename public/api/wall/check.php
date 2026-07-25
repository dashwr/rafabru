<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$input = rafabru_wall_json_input();
try {
    $note = rafabru_wall_set_checklist_item(
        trim((string) ($input['id'] ?? '')),
        $input['author'] ?? '',
        (int) ($input['index'] ?? -1),
        ($input['checked'] ?? false) === true
    );
    rafabru_wall_json(['ok' => true, 'note' => $note]);
} catch (DomainException $error) {
    rafabru_wall_json(['ok' => false, 'error' => 'not_owner', 'message' => $error->getMessage()], 403);
} catch (InvalidArgumentException $error) {
    rafabru_wall_json(['ok' => false, 'error' => 'invalid_item', 'message' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('Rafabru checklist update failed: ' . $error->getMessage());
    rafabru_wall_json(['ok' => false, 'error' => 'check_failed', 'message' => 'The checklist could not be updated.'], 500);
}
