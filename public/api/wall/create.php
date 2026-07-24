<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$input = rafabru_wall_json_input();
$publishToken = trim((string) ($input['publishToken'] ?? ''));
if (!rafabru_wall_publish_token_valid($publishToken)) {
    rafabru_wall_json([
        'ok' => false,
        'error' => 'publish_permission_expired',
        'message' => 'The publishing permission expired. Complete the CAPTCHA again.',
    ], 403);
}

try {
    $note = rafabru_wall_create_note($input);
    rafabru_wall_consume_publish_token();
    rafabru_wall_json(['ok' => true, 'note' => $note], 201);
} catch (InvalidArgumentException $error) {
    rafabru_wall_json([
        'ok' => false,
        'error' => 'invalid_note',
        'message' => $error->getMessage(),
    ], 422);
} catch (Throwable $error) {
    error_log('Rafabru wall create failed: ' . $error->getMessage());
    rafabru_wall_json([
        'ok' => false,
        'error' => 'save_failed',
        'message' => 'The post-it could not be saved. Please try again.',
    ], 500);
}
