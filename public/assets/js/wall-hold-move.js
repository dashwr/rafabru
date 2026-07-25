(() => {
    'use strict';

    const HOLD_DELAY = 420;
    const CANCEL_DISTANCE = 12;

    const normalizeName = (value) => String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32)
        .toLocaleLowerCase();

    const attach = () => {
        const wall = document.querySelector('[data-wall]');
        const extras = window.rafabruWallExtras;
        if (!wall || !extras?.noteMap) return;

        let press = null;
        let holdTimer = 0;
        let suppressTrustedClicksUntil = 0;

        const owns = (note) => {
            const identity = normalizeName(extras.identity);
            return identity !== '' && normalizeName(note?.author) === identity;
        };

        const clearHold = () => {
            window.clearTimeout(holdTimer);
            holdTimer = 0;
        };

        const clearPress = () => {
            clearHold();
            press = null;
        };

        const showMessage = (message) => {
            const toast = document.querySelector('[data-wall-toast]');
            if (!toast) return;
            toast.textContent = message;
            toast.hidden = false;
            window.setTimeout(() => { toast.hidden = true; }, 2600);
        };

        const beginMoving = () => {
            if (!press || extras.moving || !press.postit.isConnected) return;

            const wallRect = wall.getBoundingClientRect();
            const postitRect = press.postit.getBoundingClientRect();
            extras.moving = {
                note: press.note,
                element: press.postit,
                offsetX: press.startX - postitRect.left,
                offsetY: press.startY - postitRect.top,
                wallRect,
            };
            press.grabbed = true;
            press.postit.classList.add('is-being-moved');
            document.body.classList.add('is-moving-owned-note');
            showMessage(document.documentElement.lang === 'pt-BR'
                ? 'Nota presa. Mova o cursor e clique para colocá-la.'
                : 'Note grabbed. Move the cursor and click to place it.');
        };

        document.addEventListener('pointerdown', (event) => {
            if (extras.moving || event.button !== 0) return;
            const postit = event.target.closest?.('.wall-postit');
            if (!postit) return;
            const note = extras.noteMap.get(postit.dataset.noteId);
            if (!note || !owns(note)) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            clearPress();

            press = {
                pointerId: event.pointerId,
                postit,
                note,
                startX: event.clientX,
                startY: event.clientY,
                grabbed: false,
            };
            holdTimer = window.setTimeout(beginMoving, HOLD_DELAY);
        }, true);

        document.addEventListener('pointermove', (event) => {
            if (!press || press.pointerId !== event.pointerId || press.grabbed) return;
            const distance = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
            if (distance > CANCEL_DISTANCE) clearHold();
        }, true);

        document.addEventListener('pointerup', (event) => {
            if (!press || press.pointerId !== event.pointerId) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            clearHold();

            const {postit, grabbed} = press;
            suppressTrustedClicksUntil = Date.now() + 350;
            press = null;

            if (grabbed) return;

            postit.dataset.rafabruHoldOpen = '1';
            window.setTimeout(() => {
                if (!postit.isConnected || extras.moving) return;
                postit.click();
                queueMicrotask(() => delete postit.dataset.rafabruHoldOpen);
            }, 0);
        }, true);

        document.addEventListener('pointercancel', clearPress, true);

        document.addEventListener('click', (event) => {
            if (!event.isTrusted && event.target.closest?.('.wall-postit')?.dataset.rafabruHoldOpen === '1') {
                return;
            }
            if (extras.moving) return;
            const postit = event.target.closest?.('.wall-postit');
            if (!postit) return;
            const note = extras.noteMap.get(postit.dataset.noteId);
            if (!note || !owns(note)) return;
            if (event.isTrusted && Date.now() <= suppressTrustedClicksUntil) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);

        const refreshHints = () => {
            document.querySelectorAll('.wall-postit').forEach((postit) => {
                const note = extras.noteMap.get(postit.dataset.noteId);
                if (!note || !owns(note)) return;
                postit.title = document.documentElement.lang === 'pt-BR'
                    ? 'Clique e segure para mover. Clique para abrir.'
                    : 'Click and hold to move. Click to open.';
            });
        };

        const observer = new MutationObserver(refreshHints);
        observer.observe(document.querySelector('[data-wall-notes]') || wall, {childList: true, subtree: true});
        window.addEventListener('rafabru-wall-notes', refreshHints);
        window.addEventListener('rafabru-wall-note', refreshHints);
        window.addEventListener('rafabru-wall-identity', refreshHints);
        refreshHints();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, {once: true});
    else attach();
})();
