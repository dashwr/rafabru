<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

try {
    rafabru_wall_json([
        'ok' => true,
        'notes' => rafabru_wall_list_notes(),
        'nextNumber' => rafabru_wall_next_number(),
        'captchaReady' => rafabru_wall_turnstile_ready(),
    ]);
} catch (Throwable $error) {
    error_log('Rafabru wall list failed: ' . $error->getMessage());
    rafabru_wall_json(['ok' => false, 'error' => 'wall_unavailable'], 500);
}
