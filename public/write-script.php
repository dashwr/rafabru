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
    "setNotebookBody(draft?.body || state.body || '');" => "setNotebookBody(draft?.body || '');",
    "state.currentSpread = Math.min(draft?.spread || 0, Math.max(0, Math.ceil(state.usedPages / 2) - 1));" => "state.currentSpread = Math.max(0, draft?.spread || 0);",
    "    createButton?.addEventListener('click', openEditor);" => <<<'JS'
    createButton?.addEventListener('click', openEditor);

    if (editorActions && !editorActions.querySelector('[data-save-close]')) {
        const saveCloseButton = document.createElement('button');
        saveCloseButton.className = 'retro-action';
        saveCloseButton.type = 'button';
        saveCloseButton.dataset.saveClose = '';
        saveCloseButton.textContent = isPortuguese() ? 'Salvar e fechar' : 'Save & close';
        const nevermindButton = editorActions.querySelector('[data-nevermind]');
        editorActions.insertBefore(saveCloseButton, nevermindButton || null);
        saveCloseButton.addEventListener('click', () => {
            state.body = normalizeBody(flow.innerText || '');
            state.lastValidBody = state.body;
            saveDraft();
            closeModalLayer();
            showToast(isPortuguese() ? 'Rascunho salvo. Você pode continuar depois.' : 'Draft saved. You can continue later.');
        });
    }
JS,
    "        if (!notebookModal.hidden && state.mode === 'view') closeViewer();" => <<<'JS'
        if (!notebookModal.hidden && state.mode === 'view') {
            closeViewer();
            return;
        }
        if (!notebookModal.hidden && state.mode === 'edit') {
            state.body = normalizeBody(flow.innerText || '');
            state.lastValidBody = state.body;
            saveDraft();
            closeModalLayer();
        }
JS,
];

foreach ($replacements as $search => $replacement) {
    if (!str_contains($source, $search)) {
        http_response_code(500);
        echo "console.error('The writing-wall patch no longer matches its source file.');\n";
        exit;
    }
    $source = str_replace($search, $replacement, $source);
}

echo $source;
