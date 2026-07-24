<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    rafabru_wall_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

if (!rafabru_wall_turnstile_ready()) {
    rafabru_wall_json([
        'ok' => false,
        'error' => 'captcha_not_configured',
        'message' => 'Publishing is waiting for the CAPTCHA keys.',
    ], 503);
}

$input = rafabru_wall_json_input();
$captchaToken = trim((string) ($input['captchaToken'] ?? ''));

if (!rafabru_wall_verify_turnstile($captchaToken)) {
    rafabru_wall_json([
        'ok' => false,
        'error' => 'captcha_failed',
        'message' => 'The CAPTCHA could not be confirmed. Please try again.',
    ], 422);
}

rafabru_wall_json([
    'ok' => true,
    'publishToken' => rafabru_wall_issue_publish_token(),
    'expiresIn' => 900,
]);
