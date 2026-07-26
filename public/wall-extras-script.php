<?php

declare(strict_types=1);

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$sourcePath = __DIR__ . '/assets/js/wall-extras-preload.js';
$source = @file_get_contents($sourcePath);
if (!is_string($source)) {
    http_response_code(500);
    echo "console.error('The wall extras script could not be loaded.');\n";
    exit;
}

$needle = "        updateIdentityPanel();\n\n        /* Write / Check controls inside the notebook navigation strip. */";
$replacement = "        queueMicrotask(updateIdentityPanel);\n\n        /* Write / Check controls inside the notebook navigation strip. */";

if (!str_contains($source, $needle)) {
    http_response_code(500);
    echo "console.error('The wall extras initialization patch no longer matches its source file.');\n";
    exit;
}

echo str_replace($needle, $replacement, $source);
