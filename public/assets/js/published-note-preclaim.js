(() => {
    'use strict';

    const claimPublishedNotebook = () => {
        const modal = document.querySelector('[data-notebook-modal]');
        if (!modal) return;
        document.body.classList.add('is-published-note-open');
        modal.classList.add('is-published-unified');
        modal.classList.remove('is-draft-checklist');
    };

    document.addEventListener('click', (event) => {
        if (document.body.classList.contains('is-moving-owned-note')) return;
        if (!event.target.closest?.('.wall-postit')) return;
        claimPublishedNotebook();
    }, true);

    const requestedId = new URL(window.location.href).searchParams.get('note');
    if (requestedId) claimPublishedNotebook();
})();
