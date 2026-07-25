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

        /* The old movement layer remains loaded for checklist support, but it no longer owns movement. */
        extras.moving = null;

        const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
        const owns = (note) => {
            const identity = normalizeName(extras.identity);
            return identity !== '' && normalizeName(note?.author) === identity;
        };
        const showMessage = (message, duration = 3000) => {
            const toast = document.querySelector('[data-wall-toast]');
            if (!toast) return;
            toast.textContent = message;
            toast.hidden = false;
            window.setTimeout(() => { toast.hidden = true; }, duration);
        };
        const jsonRequest = async (url, payload) => {
            const response = await window.fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.ok === false) {
                throw new Error(result.message || result.error || 'Request failed.');
            }
            return result;
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
        let activeMove = null;
        let savingMove = false;
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
            control.hidden = activeMove?.element === postit;
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

        const moveElementTo = (clientX, clientY) => {
            if (!activeMove || savingMove) return;
            const wallRect = wall.getBoundingClientRect();
            const width = activeMove.element.offsetWidth || 214;
            const height = activeMove.element.offsetHeight || 190;
            const maximumLeft = Math.max(0, wallRect.width - width);
            const maximumTop = Math.max(130, wall.scrollHeight - height - 130);
            const left = Math.min(maximumLeft, Math.max(0, clientX - wallRect.left - activeMove.offsetX));
            const top = Math.min(maximumTop, Math.max(130, clientY - wallRect.top - activeMove.offsetY));
            activeMove.element.style.left = `${Math.round(left)}px`;
            activeMove.element.style.top = `${Math.round(top)}px`;
        };

        const cancelMove = () => {
            if (!activeMove) return;
            const moving = activeMove;
            activeMove = null;
            savingMove = false;
            moving.element.style.left = moving.originalLeft;
            moving.element.style.top = moving.originalTop;
            moving.element.classList.remove('is-being-moved');
            document.body.classList.remove('is-moving-owned-note');
            queueSync();
            showMessage(localT('Move cancelled.', 'Movimento cancelado.'));
        };

        const finishMove = async () => {
            if (!activeMove || savingMove) return;
            const moving = activeMove;
            savingMove = true;
            const wallRect = wall.getBoundingClientRect();
            const width = moving.element.offsetWidth || 214;
            const left = Number.parseFloat(moving.element.style.left) || 0;
            const top = Number.parseFloat(moving.element.style.top) || 130;
            const x = Math.min(0.96, Math.max(0.04, (left + width / 2) / wallRect.width));
            const y = Math.max(130, Math.round(top));
            showMessage(localT('Saving the new position...', 'Salvando a nova posição...'), 5000);

            try {
                const result = await jsonRequest('/api/wall/move.php', {
                    id: moving.note.id,
                    author: extras.identity,
                    x,
                    y,
                });
                if (result.note?.id) {
                    extras.noteMap.set(String(result.note.id), result.note);
                    window.dispatchEvent(new CustomEvent('rafabru-wall-note', {detail: result.note}));
                }
                activeMove = null;
                savingMove = false;
                moving.element.classList.remove('is-being-moved');
                document.body.classList.remove('is-moving-owned-note');
                queueSync();
                showMessage(localT('Note moved.', 'Nota movida.'));
            } catch (error) {
                activeMove = null;
                savingMove = false;
                moving.element.style.left = moving.originalLeft;
                moving.element.style.top = moving.originalTop;
                moving.element.classList.remove('is-being-moved');
                document.body.classList.remove('is-moving-owned-note');
                queueSync();
                showMessage(error.message || localT('The note could not be moved.', 'A nota não pôde ser movida.'), 5000);
            }
        };

        document.addEventListener('click', (event) => {
            const control = event.target.closest?.('[data-move-note]');
            if (control) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (activeMove || savingMove) return;

                const id = String(control.dataset.moveNote || '');
                const note = extras.noteMap.get(id);
                const postit = notesRoot.querySelector(`.wall-postit[data-note-id="${CSS.escape(id)}"]`);
                if (!note || !postit || !owns(note)) {
                    showMessage(localT('This note does not belong to the current name.', 'Esta nota não pertence ao nome atual.'));
                    return;
                }

                const rect = postit.getBoundingClientRect();
                activeMove = {
                    note,
                    element: postit,
                    offsetX: rect.width / 2,
                    offsetY: 24,
                    originalLeft: postit.style.left,
                    originalTop: postit.style.top,
                };
                postit.classList.add('is-being-moved');
                document.body.classList.add('is-moving-owned-note');
                control.hidden = true;
                moveElementTo(event.clientX, event.clientY);
                showMessage(localT('Move the note, then click once to place it.', 'Mova a nota e clique uma vez para colocá-la.'), 5000);
                return;
            }

            if (!activeMove || savingMove) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            finishMove();
        }, true);

        document.addEventListener('pointermove', (event) => {
            moveElementTo(event.clientX, event.clientY);
        }, true);

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !activeMove) return;
            event.preventDefault();
            cancelMove();
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