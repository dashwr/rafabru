(() => {
    'use strict';

    /* Registered before the legacy checklist listeners. */
    window.addEventListener('rafabru-wall-note', (event) => {
        const editor = document.querySelector('.published-note-layer:not([hidden]) .published-note-title-input');
        if (!editor) return;
        event.stopImmediatePropagation();
    });
})();
