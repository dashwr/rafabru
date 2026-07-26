(() => {
    'use strict';

    let activeMoveGesture = false;

    const clearMovementVisuals = () => {
        document.body.classList.remove('is-moving-owned-note');
        document.querySelectorAll('.wall-postit.is-being-moved').forEach((note) => {
            note.classList.remove('is-being-moved');
        });
        if (window.rafabruWallExtras) window.rafabruWallExtras.moving = null;
    };

    const openNote = (noteId) => {
        const openViewer = window.rafabruOpenPublishedNote;
        if (typeof openViewer === 'function') {
            Promise.resolve(openViewer(noteId)).catch(() => {
                document.body.classList.remove('is-published-note-open', 'is-modal-open');
            });
            return;
        }

        /* A missing viewer should not leave the cursor or page in a claimed state. */
        document.body.classList.remove('is-published-note-open', 'is-modal-open');
        const url = new URL(window.location.href);
        url.searchParams.set('note', noteId);
        window.location.assign(url.toString());
    };

    document.addEventListener('click', (event) => {
        const moveControl = event.target.closest?.('[data-move-note]');
        if (moveControl) {
            activeMoveGesture = true;
            window.setTimeout(() => {
                if (!document.body.classList.contains('is-moving-owned-note')) activeMoveGesture = false;
            }, 0);
            return;
        }

        const note = event.target.closest?.('.wall-postit');
        if (!note) return;

        /* A real move operation owns the placement click. Stale CSS classes do not. */
        if (activeMoveGesture && document.body.classList.contains('is-moving-owned-note')) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        activeMoveGesture = false;
        clearMovementVisuals();

        const noteId = String(note.dataset.noteId || '');
        if (!noteId) return;
        openNote(noteId);
    }, true);

    const bodyObserver = new MutationObserver(() => {
        if (document.body.classList.contains('is-moving-owned-note')) return;
        activeMoveGesture = false;
        document.querySelectorAll('.wall-postit.is-being-moved').forEach((note) => {
            note.classList.remove('is-being-moved');
        });
    });

    const clearOnReady = () => {
        activeMoveGesture = false;
        clearMovementVisuals();
        bodyObserver.observe(document.body, {attributes: true, attributeFilter: ['class']});
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', clearOnReady, {once: true});
    } else {
        clearOnReady();
    }

    window.addEventListener('pageshow', clearOnReady);
})();
