(() => {
    'use strict';

    /* Registered before the legacy checklist listeners. */
    window.addEventListener('rafabru-wall-note', (event) => {
        const editingPublishedNote = document.querySelector(
            '.notebook-modal.is-published-unified .published-notebook-title-row:not([hidden]) .published-note-title-input'
        );
        const movingPublishedNote = document.body.classList.contains('is-moving-owned-note');
        if (!editingPublishedNote && !movingPublishedNote) return;
        event.stopImmediatePropagation();
    });
})();
