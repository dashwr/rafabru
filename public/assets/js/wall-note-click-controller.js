(() => {
    'use strict';

    const movementIsActuallyActive = () => Boolean(
        document.querySelector('.wall-postit.is-being-moved')
        || window.rafabruWallExtras?.moving?.element
    );

    const clearStaleMovementState = () => {
        if (movementIsActuallyActive()) return false;

        document.body.classList.remove('is-moving-owned-note');
        document.querySelectorAll('.wall-postit.is-being-moved').forEach((note) => {
            note.classList.remove('is-being-moved');
        });
        if (window.rafabruWallExtras) window.rafabruWallExtras.moving = null;
        return true;
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
        const note = event.target.closest?.('.wall-postit');
        if (!note) return;

        /* A real move operation owns the placement click. A stale cursor class does not. */
        if (movementIsActuallyActive()) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        clearStaleMovementState();

        const noteId = String(note.dataset.noteId || '');
        if (!noteId) return;
        openNote(noteId);
    }, true);

    const clearOnReady = () => clearStaleMovementState();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', clearOnReady, {once: true});
    } else {
        clearOnReady();
    }

    window.addEventListener('pageshow', clearOnReady);
})();
