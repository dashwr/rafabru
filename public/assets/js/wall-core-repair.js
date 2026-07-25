(() => {
    'use strict';

    const PAGE_BREAK_TOKEN = '⟦RAFABRU_PAGE_BREAK⟧';
    const normalizeName = (value) => String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32)
        .toLocaleLowerCase();

    /* Register before DOMContentLoaded so the obsolete dblclick handler never wins. */
    document.addEventListener('dblclick', (event) => {
        if (!event.target.closest?.('.wall-postit')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);

    const setup = () => {
        const extras = window.rafabruWallExtras;
        const wall = document.querySelector('[data-wall]');
        const notesRoot = document.querySelector('[data-wall-notes]');
        const navigation = document.querySelector('.notebook-navigation');
        if (!extras || !wall || !notesRoot || !navigation) return;

        const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
        const owns = (note) => {
            const identity = normalizeName(extras.identity);
            return identity !== '' && normalizeName(note?.author) === identity;
        };
        const showMessage = (message) => {
            const toast = document.querySelector('[data-wall-toast]');
            if (!toast) return;
            toast.textContent = message;
            toast.hidden = false;
            window.setTimeout(() => { toast.hidden = true; }, 3000);
        };

        /* Stabilize the Write / Check controls created by the checklist layer. */
        let typeSwitch = navigation.querySelector('.note-type-switch');
        if (!typeSwitch) {
            typeSwitch = document.createElement('div');
            typeSwitch.className = 'note-type-switch';
            typeSwitch.innerHTML = `
                <label><input type="checkbox" data-note-type="write"> <span>${localT('Write', 'Escrever')}</span></label>
                <label><input type="checkbox" data-note-type="check"> <span>${localT('Check', 'Lista')}</span></label>
            `;
            navigation.insertBefore(typeSwitch, navigation.querySelector('[data-page-counter]'));

            const applyFallbackType = (type) => {
                extras.noteType = type === 'check' ? 'check' : 'write';
                localStorage.setItem('rafabru_note_type_v1', extras.noteType);
                const write = typeSwitch.querySelector('[data-note-type="write"]');
                const check = typeSwitch.querySelector('[data-note-type="check"]');
                if (write) write.checked = extras.noteType === 'write';
                if (check) check.checked = extras.noteType === 'check';
                const viewport = document.querySelector('[data-notebook-viewport]');
                const checklist = document.querySelector('.checklist-editor');
                if (viewport) viewport.hidden = extras.noteType === 'check';
                if (checklist) checklist.hidden = extras.noteType !== 'check';
                navigation.querySelectorAll('[data-page-previous], [data-page-next], [data-page-counter]').forEach((element) => {
                    element.classList.toggle('is-checklist-hidden', extras.noteType === 'check');
                });
            };
            typeSwitch.querySelector('[data-note-type="write"]')?.addEventListener('change', () => applyFallbackType('write'));
            typeSwitch.querySelector('[data-note-type="check"]')?.addEventListener('change', () => applyFallbackType('check'));
            applyFallbackType(extras.noteType);
        }
        typeSwitch.dataset.noteTypeSwitch = '';
        typeSwitch.hidden = false;

        /* Remove legacy page markers from old drafts and owner edit boxes. */
        const cleanPageBreaks = (root = document) => {
            root.querySelectorAll?.('.notebook-page-editor, .wall-detail-notebook').forEach((editor) => {
                if (!(editor instanceof HTMLTextAreaElement) || !editor.value.includes(PAGE_BREAK_TOKEN)) return;
                const selectionStart = editor.selectionStart;
                const cleaned = editor.value.replace(/\s*⟦RAFABRU_PAGE_BREAK⟧\s*/g, '\n\n');
                editor.value = cleaned;
                const caret = Math.min(selectionStart, cleaned.length);
                editor.setSelectionRange(caret, caret);
                editor.dispatchEvent(new Event('input', {bubbles: true}));
            });
        };

        /* Explicit owner-only Move controls. Normal note clicks remain untouched. */
        const controls = new Map();
        let syncQueued = false;
        const queueSync = () => {
            if (syncQueued) return;
            syncQueued = true;
            requestAnimationFrame(() => {
                syncQueued = false;
                syncMoveControls();
                cleanPageBreaks();
            });
        };

        const positionControl = (control, postit) => {
            const left = postit.style.left;
            const top = postit.style.top;
            if (control.style.left !== left) control.style.left = left;
            if (control.style.top !== top) control.style.top = top;
            control.hidden = postit.classList.contains('is-being-moved');
        };

        const syncMoveControls = () => {
            const liveIds = new Set();
            notesRoot.querySelectorAll('.wall-postit').forEach((postit) => {
                const id = String(postit.dataset.noteId || '');
                const note = extras.noteMap.get(id);
                if (!id || !note || !owns(note)) return;
                liveIds.add(id);

                let control = controls.get(id);
                if (!control || !control.isConnected) {
                    control = document.createElement('button');
                    control.type = 'button';
                    control.className = 'wall-note-move-control window';
                    control.dataset.moveNote = id;
                    control.textContent = '↔';
                    control.title = localT('Move this note', 'Mover esta nota');
                    control.setAttribute('aria-label', control.title);
                    notesRoot.appendChild(control);
                    controls.set(id, control);
                }
                postit.classList.add('is-owned-note');
                postit.title = localT('Click to open. Use the arrow button to move.', 'Clique para abrir. Use o botão de seta para mover.');
                positionControl(control, postit);
            });

            controls.forEach((control, id) => {
                if (liveIds.has(id)) return;
                control.remove();
                controls.delete(id);
            });
        };

        document.addEventListener('click', (event) => {
            const control = event.target.closest?.('[data-move-note]');
            if (!control) return;
            event.preventDefault();
            event.stopImmediatePropagation();

            const id = String(control.dataset.moveNote || '');
            const note = extras.noteMap.get(id);
            const postit = notesRoot.querySelector(`.wall-postit[data-note-id="${CSS.escape(id)}"]`);
            if (!note || !postit || !owns(note) || extras.moving) return;

            const pointerX = event.clientX;
            const pointerY = event.clientY;
            window.setTimeout(() => {
                if (extras.moving || !postit.isConnected) return;
                const rect = postit.getBoundingClientRect();
                extras.moving = {
                    note,
                    element: postit,
                    offsetX: Math.min(rect.width - 8, Math.max(8, pointerX - rect.left)),
                    offsetY: Math.min(rect.height - 8, Math.max(8, pointerY - rect.top)),
                    wallRect: wall.getBoundingClientRect(),
                    originalLeft: postit.style.left,
                    originalTop: postit.style.top,
                };
                postit.classList.add('is-being-moved');
                document.body.classList.add('is-moving-owned-note');
                control.hidden = true;
                showMessage(localT('Move the note, then click once to place it.', 'Mova a nota e clique uma vez para colocá-la.'));
            }, 0);
        }, true);

        document.addEventListener('pointermove', () => {
            if (!extras.moving) return;
            const control = controls.get(String(extras.moving.note?.id || ''));
            if (control) positionControl(control, extras.moving.element);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !extras.moving) return;
            event.preventDefault();
            const moving = extras.moving;
            extras.moving = null;
            moving.element.style.left = moving.originalLeft;
            moving.element.style.top = moving.originalTop;
            moving.element.classList.remove('is-being-moved');
            document.body.classList.remove('is-moving-owned-note');
            queueSync();
            showMessage(localT('Move cancelled.', 'Movimento cancelado.'));
        }, true);

        const observer = new MutationObserver(queueSync);
        observer.observe(notesRoot, {childList: true, subtree: true});
        const bodyObserver = new MutationObserver(() => cleanPageBreaks());
        bodyObserver.observe(document.body, {childList: true, subtree: true});

        window.addEventListener('rafabru-wall-notes', queueSync);
        window.addEventListener('rafabru-wall-note', queueSync);
        window.addEventListener('rafabru-wall-identity', queueSync);
        queueSync();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once: true});
    else setup();
})();
