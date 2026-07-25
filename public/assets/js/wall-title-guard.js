(() => {
    'use strict';

    const clean = (value) => String(value || '').replace(/[<>]/g, '');
    const normalizeName = (value) => String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32)
        .toLocaleLowerCase();

    const attach = () => {
        const title = document.querySelector('[data-postit-title]');
        if (title) {
            title.addEventListener('input', () => {
                const next = clean(title.value);
                if (next !== title.value) title.value = next;
            });
        }

        const spacing = document.createElement('style');
        spacing.textContent = '.wall-identity{top:154px!important;}';
        document.head.appendChild(spacing);

        const extras = window.rafabruWallExtras;
        if (!extras?.noteMap) return;

        let pendingOpen = 0;
        let pendingPostit = null;

        const clearPendingOpen = () => {
            window.clearTimeout(pendingOpen);
            pendingOpen = 0;
            pendingPostit = null;
        };

        const owns = (note) => {
            const identity = normalizeName(extras.identity);
            return identity !== '' && normalizeName(note?.author) === identity;
        };

        document.addEventListener('pointerdown', (event) => {
            if (!pendingPostit) return;
            const postit = event.target.closest?.('.wall-postit');
            if (postit !== pendingPostit || event.detail >= 2) clearPendingOpen();
        }, true);

        document.addEventListener('click', (event) => {
            const postit = event.target.closest?.('.wall-postit');
            if (!postit || extras.moving) return;

            const note = extras.noteMap.get(postit.dataset.noteId);
            if (!note || note.type === 'check' || !owns(note)) return;

            if (postit.dataset.rafabruAllowOwnedOpen === '1') {
                delete postit.dataset.rafabruAllowOwnedOpen;
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            clearPendingOpen();

            if (event.detail >= 2) return;

            pendingPostit = postit;
            pendingOpen = window.setTimeout(() => {
                pendingOpen = 0;
                pendingPostit = null;
                if (extras.moving || !postit.isConnected) return;
                postit.dataset.rafabruAllowOwnedOpen = '1';
                postit.click();
                queueMicrotask(() => delete postit.dataset.rafabruAllowOwnedOpen);
            }, 400);
        }, true);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, {once: true});
    else attach();
})();