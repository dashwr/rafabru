<?php

declare(strict_types=1);

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$sourcePath = __DIR__ . '/assets/js/write-wall.js';
$source = @file_get_contents($sourcePath);
if (!is_string($source)) {
    http_response_code(500);
    echo "console.error('The writing-wall script could not be loaded.');\n";
    exit;
}

$replacements = [
    <<<'SEARCH'
        placementPostit.classList.add(`postit-color--${values.color}`);

        state.placing = true;
SEARCH
    => <<<'REPLACE'
        placementPostit.classList.add(`postit-color--${values.color}`);
        placementPostit.style.setProperty('--placement-rotation', `${noteRotation(state.nextNumber)}deg`);

        state.placing = true;
REPLACE,
    <<<'SEARCH'
        placementPostit.style.left = `${window.innerWidth / 2}px`;
        placementPostit.style.top = `${Math.max(160, window.innerHeight / 2)}px`;
SEARCH
    => <<<'REPLACE'
        placementPostit.style.left = `${Math.max(8, window.innerWidth / 2 - 107)}px`;
        placementPostit.style.top = `${Math.max(130, window.innerHeight / 2 - 95)}px`;
REPLACE,
    <<<'SEARCH'
    document.addEventListener('pointermove', (event) => {
        if (!state.placing || state.savingPlacement) return;
        placementPostit.style.left = `${event.clientX}px`;
        placementPostit.style.top = `${event.clientY}px`;
    });
SEARCH
    => <<<'REPLACE'
    document.addEventListener('pointermove', (event) => {
        if (!state.placing || state.savingPlacement) return;
        placementPostit.style.left = `${event.clientX}px`;
        placementPostit.style.top = `${event.clientY}px`;
    });
REPLACE,
    <<<'SEARCH'
        const wallRect = wall.getBoundingClientRect();
        const x = Math.min(0.96, Math.max(0.04, (event.clientX - wallRect.left) / wallRect.width));
        const y = Math.max(130, Math.round(event.clientY - wallRect.top - 95));
        const values = designerValues();
SEARCH
    => <<<'REPLACE'
        const wallRect = wall.getBoundingClientRect();
        const noteWidth = placementPostit.offsetWidth || 214;
        const noteHeight = placementPostit.offsetHeight || 190;
        const requestedLeft = event.clientX - wallRect.left;
        const requestedTop = event.clientY - wallRect.top;
        const maximumLeft = Math.max(0, wallRect.width - noteWidth);
        const maximumTop = Math.max(130, wallRect.height - noteHeight - 125);
        const savedLeft = Math.min(maximumLeft, Math.max(0, requestedLeft));
        const savedTop = Math.min(maximumTop, Math.max(130, requestedTop));
        const x = Math.min(0.96, Math.max(0.04, (savedLeft + noteWidth / 2) / wallRect.width));
        const y = Math.round(savedTop);
        placementPostit.style.left = `${wallRect.left + savedLeft}px`;
        placementPostit.style.top = `${wallRect.top + savedTop}px`;
        const values = designerValues();
REPLACE,
];

foreach ($replacements as $search => $replacement) {
    if (!str_contains($source, $search)) {
        http_response_code(500);
        echo "console.error('The writing-wall placement patch no longer matches its source file.');\n";
        exit;
    }
    $source = str_replace($search, $replacement, $source);
}

echo $source;
