(() => {
    'use strict';

    const IDENTITY_KEY = 'rafabru_wall_identity_v1';
    const CHECKLIST_DRAFT_KEY = 'rafabru_checklist_draft_v1';
    const TYPE_DRAFT_KEY = 'rafabru_note_type_v1';
    const originalFetch = window.fetch.bind(window);

    const extras = {
        identity: '',
        noteType: 'write',
        checklist: Array.from({length: 5}, () => ({text: '', checked: false})),
        pendingRotation: 0,
        noteMap: new Map(),
        lastPlacement: null,
        moving: null,
    };

    const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    const identityKey = (value) => normalizeName(value).toLocaleLowerCase();
    const owns = (note) => identityKey(extras.identity) !== '' && identityKey(note?.author) === identityKey(extras.identity);
    const randomRotation = () => Math.round((Math.random() * 5.2 - 2.6) * 100) / 100;

    try {
        extras.identity = normalizeName(localStorage.getItem(IDENTITY_KEY) || '');
        extras.noteType = localStorage.getItem(TYPE_DRAFT_KEY) === 'check' ? 'check' : 'write';
        const savedChecklist = JSON.parse(localStorage.getItem(CHECKLIST_DRAFT_KEY) || 'null');
        if (Array.isArray(savedChecklist)) {
            extras.checklist = savedChecklist.slice(0, 100).map((item) => ({
                text: String(item?.text || '').slice(0, 180),
                checked: item?.checked === true,
            }));
            while (extras.checklist.length < 5) extras.checklist.push({text: '', checked: false});
        }
    } catch (_) {
        // Local identity and drafts are intentionally lightweight.
    }

    const saveIdentity = (value) => {
        extras.identity = normalizeName(value);
        if (extras.identity) localStorage.setItem(IDENTITY_KEY, extras.identity);
        else localStorage.removeItem(IDENTITY_KEY);
        window.dispatchEvent(new CustomEvent('rafabru-wall-identity', {detail: extras.identity}));
    };

    const saveChecklistDraft = () => {
        try {
            localStorage.setItem(TYPE_DRAFT_KEY, extras.noteType);
            localStorage.setItem(CHECKLIST_DRAFT_KEY, JSON.stringify(extras.checklist));
        } catch (_) {
        }
    };

    const clearChecklistDraft = () => {
        extras.checklist = Array.from({length: 5}, () => ({text: '', checked: false}));
        localStorage.removeItem(CHECKLIST_DRAFT_KEY);
        localStorage.removeItem(TYPE_DRAFT_KEY);
    };

    const mergeNote = (note) => {
        if (!note?.id) return;
        extras.noteMap.set(String(note.id), note);
        window.dispatchEvent(new CustomEvent('rafabru-wall-note', {detail: note}));
    };

    const absorbPayload = (url, payload) => {
        if (url.includes('/api/wall/list.php')) {
            (Array.isArray(payload?.notes) ? payload.notes : []).forEach(mergeNote);
            window.dispatchEvent(new CustomEvent('rafabru-wall-notes', {detail: Array.from(extras.noteMap.values())}));
        }
        if (payload?.note) mergeNote(payload.note);
    };

    window.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : String(input?.url || '');
        let options = init;

        if (url.includes('/api/wall/create.php') && typeof init.body === 'string') {
            try {
                const payload = JSON.parse(init.body);
                const placement = extras.lastPlacement;
                if (placement) {
                    payload.x = placement.x;
                    payload.y = placement.y;
                }
                payload.rotation = extras.pendingRotation;
                payload.noteType = extras.noteType;
                if (extras.noteType === 'check') {
                    payload.body = '';
                    payload.checklist = extras.checklist.map((item) => ({
                        text: String(item.text || '').slice(0, 180),
                        checked: item.checked === true,
                    }));
                    payload.preview = payload.title || payload.preview || 'Checklist';
                }
                if (!normalizeName(payload.author) && extras.identity) payload.author = extras.identity;
                if (!extras.identity && normalizeName(payload.author)) saveIdentity(payload.author);
                options = {...init, body: JSON.stringify(payload)};
            } catch (_) {
            }
        }

        const response = await originalFetch(input, options);
        if (url.includes('/api/wall/')) {
            response.clone().json().then((payload) => absorbPayload(url, payload)).catch(() => {});
        }
        return response;
    };

    window.rafabruWallExtras = extras;

    const jsonRequest = async (url, payload) => {
        const response = await originalFetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) throw new Error(result.message || result.error || 'Request failed.');
        if (result.note) mergeNote(result.note);
        return result;
    };

    const setup = () => {
        const wall = document.querySelector('[data-wall]');
        const notesRoot = document.querySelector('[data-wall-notes]');
        const createButton = document.querySelector('[data-create-note]');
        const notebookModal = document.querySelector('[data-notebook-modal]');
        const notebookShell = document.querySelector('[data-notebook-shell]');
        const notebookViewport = document.querySelector('[data-notebook-viewport]');
        const navigation = document.querySelector('.notebook-navigation');
        const pageTrack = document.querySelector('[data-notebook-flow]');
        const designer = document.querySelector('[data-postit-designer]');
        const designerTitle = document.querySelector('[data-postit-title]');
        const designerAuthor = document.querySelector('[data-postit-author]');
        const placementPostit = document.querySelector('[data-placement-postit]');
        const placementToolbar = document.querySelector('[data-placement-toolbar]');
        const modalLayer = document.querySelector('[data-modal-layer]');
        const viewerActions = document.querySelector('[data-viewer-actions]');
        if (!wall || !notesRoot || !createButton || !notebookShell || !navigation || !placementPostit) return;

        const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
        const showMessage = (message) => {
            const toast = document.querySelector('[data-wall-toast]');
            if (!toast) return;
            toast.textContent = message;
            toast.hidden = false;
            window.setTimeout(() => { toast.hidden = true; }, 3200);
        };

        /* Lightweight name identity. */
        const identityPanel = document.createElement('div');
        identityPanel.className = 'wall-identity';
        identityPanel.innerHTML = `
            <button class="wall-identity__prompt window" type="button" data-identity-prompt></button>
            <form class="wall-identity__form" data-identity-form hidden>
                <input type="text" maxlength="32" autocomplete="nickname" aria-label="${localT('Who are you?', 'Quem é você?')}">
                <button class="wall-identity__send window" type="submit" aria-label="${localT('Use this name', 'Usar este nome')}">→</button>
            </form>
        `;
        createButton.insertAdjacentElement('afterend', identityPanel);
        const identityPrompt = identityPanel.querySelector('[data-identity-prompt]');
        const identityForm = identityPanel.querySelector('[data-identity-form]');
        const identityInput = identityForm.querySelector('input');
        const updateIdentityPanel = () => {
            identityPrompt.textContent = extras.identity
                ? localT(`You are: ${extras.identity}`, `Você é: ${extras.identity}`)
                : localT('Who are you?', 'Quem é você?');
            identityInput.value = extras.identity;
            document.body.classList.toggle('has-wall-identity', Boolean(extras.identity));
            decorateAllNotes();
        };
        identityPrompt.addEventListener('click', () => {
            identityPrompt.hidden = true;
            identityForm.hidden = false;
            identityInput.focus();
            identityInput.select();
        });
        identityForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = normalizeName(identityInput.value);
            if (!value) return;
            saveIdentity(value);
            identityForm.hidden = true;
            identityPrompt.hidden = false;
            updateIdentityPanel();
        });
        updateIdentityPanel();

        /* Write / Check controls inside the notebook navigation strip. */
        const typeSwitch = document.createElement('div');
        typeSwitch.className = 'note-type-switch';
        typeSwitch.innerHTML = `
            <label><input type="checkbox" data-note-type="write"> <span>${localT('Write', 'Escrever')}</span></label>
            <label><input type="checkbox" data-note-type="check"> <span>${localT('Check', 'Lista')}</span></label>
        `;
        navigation.insertBefore(typeSwitch, navigation.firstChild);
        const writeToggle = typeSwitch.querySelector('[data-note-type="write"]');
        const checkToggle = typeSwitch.querySelector('[data-note-type="check"]');

        const checklistEditor = document.createElement('section');
        checklistEditor.className = 'checklist-editor';
        checklistEditor.hidden = true;
        checklistEditor.innerHTML = `<div class="checklist-editor__paper"><div class="checklist-editor__items" data-checklist-items></div></div>`;
        notebookShell.appendChild(checklistEditor);
        const checklistItems = checklistEditor.querySelector('[data-checklist-items]');

        const renderChecklistEditor = (focusIndex = null) => {
            checklistItems.replaceChildren();
            extras.checklist.forEach((item, index) => {
                const row = document.createElement('label');
                row.className = 'checklist-editor__row';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.checked === true;
                checkbox.addEventListener('change', () => {
                    extras.checklist[index].checked = checkbox.checked;
                    saveChecklistDraft();
                });
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 180;
                input.value = item.text || '';
                input.placeholder = localT(`Item ${index + 1}`, `Item ${index + 1}`);
                input.addEventListener('input', () => {
                    extras.checklist[index].text = input.value.slice(0, 180);
                    if (index === extras.checklist.length - 2 && input.value.trim() !== '' && extras.checklist.length < 100) {
                        extras.checklist.push({text: '', checked: false});
                        renderChecklistEditor(index);
                    }
                    saveChecklistDraft();
                });
                row.append(checkbox, input);
                checklistItems.appendChild(row);
            });
            if (focusIndex !== null) {
                requestAnimationFrame(() => checklistItems.querySelectorAll('input[type="text"]')[focusIndex]?.focus());
            }
        };

        const applyNoteType = (type) => {
            extras.noteType = type === 'check' ? 'check' : 'write';
            writeToggle.checked = extras.noteType === 'write';
            checkToggle.checked = extras.noteType === 'check';
            notebookViewport.hidden = extras.noteType === 'check';
            checklistEditor.hidden = extras.noteType !== 'check';
            navigation.classList.toggle('notebook-navigation--checklist', extras.noteType === 'check');
            navigation.querySelectorAll('[data-page-previous], [data-page-next], [data-page-counter]').forEach((element) => {
                element.classList.toggle('is-checklist-hidden', extras.noteType === 'check');
            });
            if (extras.noteType === 'check') renderChecklistEditor();
            saveChecklistDraft();
        };
        writeToggle.addEventListener('change', () => applyNoteType('write'));
        checkToggle.addEventListener('change', () => applyNoteType('check'));
        applyNoteType(extras.noteType);

        createButton.addEventListener('click', () => {
            applyNoteType(localStorage.getItem(TYPE_DRAFT_KEY) === 'check' ? 'check' : 'write');
            if (extras.noteType === 'check') renderChecklistEditor();
        }, true);

        /* Let the original CAPTCHA/designer flow publish checklists too. */
        document.querySelector('[data-publish-draft]')?.addEventListener('click', () => {
            if (extras.noteType !== 'check') return;
            const nonEmpty = extras.checklist.some((item) => item.text.trim() !== '');
            if (!nonEmpty) {
                extras.checklist[0].text = localT('New checklist item', 'Novo item');
                renderChecklistEditor(0);
            }
            const firstPage = pageTrack?.querySelector('[data-page-editor="0"]');
            if (firstPage instanceof HTMLTextAreaElement && firstPage.value.trim() === '') {
                firstPage.value = 'Checklist';
                firstPage.dispatchEvent(new Event('input', {bubbles: true}));
            }
            saveChecklistDraft();
        }, true);

        const designerObserver = new MutationObserver(() => {
            if (!designer || designer.hidden) return;
            if (extras.identity && designerAuthor && !designerAuthor.value.trim()) designerAuthor.value = extras.identity;
            if (extras.noteType === 'check' && designerTitle && /^Post-it #/i.test(designerTitle.value)) {
                designerTitle.value = designerTitle.value.replace(/^Post-it/i, localT('Checklist', 'Lista'));
            }
        });
        if (designer) designerObserver.observe(designer, {attributes: true, attributeFilter: ['hidden']});

        document.querySelector('[data-enter-placement]')?.addEventListener('click', () => {
            extras.pendingRotation = randomRotation();
            requestAnimationFrame(() => {
                placementPostit.style.setProperty('--placement-rotation', `${extras.pendingRotation}deg`);
                placementPostit.classList.toggle('placement-postit--checklist', extras.noteType === 'check');
                if (extras.noteType === 'check') {
                    placementPostit.querySelector('strong').innerHTML = `<span class="checklist-card__box" aria-hidden="true"></span><span>${designerTitle?.value || localT('Checklist', 'Lista')}</span>`;
                }
            });
        }, true);

        wall.addEventListener('click', () => {
            if (placementPostit.hidden) return;
            const wallRect = wall.getBoundingClientRect();
            const left = Number.parseFloat(placementPostit.style.left) || placementPostit.getBoundingClientRect().left;
            const top = Number.parseFloat(placementPostit.style.top) || placementPostit.getBoundingClientRect().top;
            const width = placementPostit.offsetWidth || 214;
            const maximumLeft = Math.max(0, wallRect.width - width);
            const savedLeft = Math.min(maximumLeft, Math.max(0, left - wallRect.left));
            extras.lastPlacement = {
                x: Math.min(0.96, Math.max(0.04, (savedLeft + width / 2) / wallRect.width)),
                y: Math.max(130, Math.round(top - wallRect.top)),
            };
        }, true);

        /* Checklist dialog and owner editor. */
        const detailLayer = document.createElement('div');
        detailLayer.className = 'wall-detail-layer';
        detailLayer.hidden = true;
        detailLayer.innerHTML = `
            <section class="wall-detail-window window" role="dialog" aria-modal="true">
                <header class="titlebar"><span data-detail-caption></span><button class="site-popup__control" type="button" data-detail-close>×</button></header>
                <div class="wall-detail-body" data-detail-body></div>
            </section>
        `;
        document.body.appendChild(detailLayer);
        const detailBody = detailLayer.querySelector('[data-detail-body]');
        const detailCaption = detailLayer.querySelector('[data-detail-caption]');
        detailLayer.querySelector('[data-detail-close]').addEventListener('click', () => { detailLayer.hidden = true; });
        detailLayer.addEventListener('click', (event) => { if (event.target === detailLayer) detailLayer.hidden = true; });

        const updateNoteMapAndDom = (note) => {
            mergeNote(note);
            decorateAllNotes();
        };

        const openChecklist = async (note) => {
            let complete = note;
            try {
                const response = await originalFetch(`/api/wall/read.php?id=${encodeURIComponent(note.id)}`, {cache: 'no-store'});
                const payload = await response.json();
                if (payload.note) complete = payload.note;
            } catch (_) {
            }
            mergeNote(complete);
            const owner = owns(complete);
            detailCaption.textContent = `${complete.title} — ${localT('by:', 'por:')} ${complete.author}`;
            detailBody.replaceChildren();

            const title = document.createElement('input');
            title.className = 'wall-detail-title';
            title.type = 'text';
            title.maxLength = 80;
            title.value = complete.title;
            title.readOnly = !owner;
            const list = document.createElement('div');
            list.className = 'wall-detail-checklist';
            const items = (Array.isArray(complete.checklist) ? complete.checklist : []).map((item) => ({...item}));

            const renderItems = () => {
                list.replaceChildren();
                items.forEach((item, index) => {
                    if (!owner && !item.text.trim()) return;
                    const row = document.createElement('label');
                    row.className = 'wall-detail-check-row';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = item.checked === true;
                    checkbox.disabled = !owner || !item.text.trim();
                    const text = document.createElement('input');
                    text.type = 'text';
                    text.maxLength = 180;
                    text.value = item.text;
                    text.readOnly = !owner;
                    checkbox.addEventListener('change', async () => {
                        try {
                            const result = await jsonRequest('/api/wall/check.php', {
                                id: complete.id,
                                author: extras.identity,
                                index,
                                checked: checkbox.checked,
                            });
                            complete = result.note;
                            updateNoteMapAndDom(result.note);
                        } catch (error) {
                            checkbox.checked = !checkbox.checked;
                            showMessage(error.message);
                        }
                    });
                    text.addEventListener('input', () => {
                        items[index].text = text.value;
                        if (owner && index === items.length - 2 && text.value.trim() && items.length < 100) {
                            items.push({text: '', checked: false});
                            renderItems();
                        }
                    });
                    row.append(checkbox, text);
                    list.appendChild(row);
                });
            };
            renderItems();
            detailBody.append(title, list);

            if (owner) {
                const actions = document.createElement('div');
                actions.className = 'wall-detail-actions';
                const save = document.createElement('button');
                save.className = 'retro-action retro-action--primary';
                save.type = 'button';
                save.textContent = localT('Save changes', 'Salvar alterações');
                save.addEventListener('click', async () => {
                    try {
                        const result = await jsonRequest('/api/wall/update.php', {
                            id: complete.id,
                            author: extras.identity,
                            title: title.value,
                            checklist: items,
                        });
                        complete = result.note;
                        updateNoteMapAndDom(result.note);
                        detailLayer.hidden = true;
                        showMessage(localT('Checklist saved.', 'Lista salva.'));
                    } catch (error) {
                        showMessage(error.message);
                    }
                });
                actions.appendChild(save);
                detailBody.appendChild(actions);
            }
            detailLayer.hidden = false;
        };

        const openWriteEditor = async (note) => {
            let complete = note;
            try {
                const response = await originalFetch(`/api/wall/read.php?id=${encodeURIComponent(note.id)}`, {cache: 'no-store'});
                const payload = await response.json();
                if (payload.note) complete = payload.note;
            } catch (_) {
            }
            detailCaption.textContent = localT('Edit notebook', 'Editar caderno');
            detailBody.replaceChildren();
            const title = document.createElement('input');
            title.className = 'wall-detail-title';
            title.type = 'text';
            title.maxLength = 80;
            title.value = complete.title;
            const body = document.createElement('textarea');
            body.className = 'wall-detail-notebook';
            body.maxLength = 15000;
            body.value = String(complete.body || '').replace(/\n⟦RAFABRU_PAGE_BREAK⟧\n/g, '\n\n');
            const actions = document.createElement('div');
            actions.className = 'wall-detail-actions';
            const save = document.createElement('button');
            save.className = 'retro-action retro-action--primary';
            save.type = 'button';
            save.textContent = localT('Save changes', 'Salvar alterações');
            save.addEventListener('click', async () => {
                try {
                    const result = await jsonRequest('/api/wall/update.php', {
                        id: complete.id,
                        author: extras.identity,
                        title: title.value,
                        body: body.value,
                    });
                    updateNoteMapAndDom(result.note);
                    detailLayer.hidden = true;
                    showMessage(localT('Notebook saved.', 'Caderno salvo.'));
                } catch (error) {
                    showMessage(error.message);
                }
            });
            actions.appendChild(save);
            detailBody.append(title, body, actions);
            detailLayer.hidden = false;
            body.focus();
        };

        const addOwnerEditButton = (note) => {
            if (!viewerActions || !owns(note) || note.type === 'check') return;
            viewerActions.querySelector('[data-owner-edit]')?.remove();
            const button = document.createElement('button');
            button.className = 'retro-action';
            button.type = 'button';
            button.dataset.ownerEdit = '';
            button.textContent = localT('Edit', 'Editar');
            button.addEventListener('click', () => {
                if (modalLayer) modalLayer.hidden = true;
                document.body.classList.remove('is-modal-open');
                openWriteEditor(note);
            });
            viewerActions.prepend(button);
        };

        document.addEventListener('click', (event) => {
            const postit = event.target.closest('.wall-postit');
            if (!postit || extras.moving) return;
            const note = extras.noteMap.get(postit.dataset.noteId);
            if (!note) return;
            if (note.type === 'check') {
                event.preventDefault();
                event.stopImmediatePropagation();
                openChecklist(note);
                return;
            }
            if (owns(note)) window.setTimeout(() => addOwnerEditButton(note), 220);
        }, true);

        /* Name-owned double-click movement. */
        const stopMoving = async () => {
            const moving = extras.moving;
            if (!moving) return;
            extras.moving = null;
            document.body.classList.remove('is-moving-owned-note');
            moving.element.classList.remove('is-being-moved');
            const wallRect = wall.getBoundingClientRect();
            const width = moving.element.offsetWidth || 214;
            const left = Number.parseFloat(moving.element.style.left) || 0;
            const top = Number.parseFloat(moving.element.style.top) || 130;
            const x = Math.min(0.96, Math.max(0.04, (left + width / 2) / wallRect.width));
            const y = Math.max(130, Math.round(top));
            try {
                const result = await jsonRequest('/api/wall/move.php', {
                    id: moving.note.id,
                    author: extras.identity,
                    x,
                    y,
                });
                updateNoteMapAndDom(result.note);
                showMessage(localT('Note moved.', 'Nota movida.'));
            } catch (error) {
                showMessage(error.message);
                decorateAllNotes();
            }
        };

        document.addEventListener('dblclick', (event) => {
            const postit = event.target.closest('.wall-postit');
            if (!postit) return;
            const note = extras.noteMap.get(postit.dataset.noteId);
            if (!note || !owns(note)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (modalLayer) modalLayer.hidden = true;
            document.body.classList.remove('is-modal-open');
            const wallRect = wall.getBoundingClientRect();
            const postitRect = postit.getBoundingClientRect();
            extras.moving = {
                note,
                element: postit,
                offsetX: event.clientX - postitRect.left,
                offsetY: event.clientY - postitRect.top,
                wallRect,
            };
            postit.classList.add('is-being-moved');
            document.body.classList.add('is-moving-owned-note');
        }, true);

        document.addEventListener('pointermove', (event) => {
            const moving = extras.moving;
            if (!moving) return;
            const wallRect = wall.getBoundingClientRect();
            const width = moving.element.offsetWidth || 214;
            const height = moving.element.offsetHeight || 190;
            const left = Math.min(Math.max(0, event.clientX - wallRect.left - moving.offsetX), Math.max(0, wallRect.width - width));
            const top = Math.max(130, event.clientY - wallRect.top - moving.offsetY);
            moving.element.style.left = `${left}px`;
            moving.element.style.top = `${Math.min(top, wall.scrollHeight - height - 130)}px`;
        });
        document.addEventListener('click', (event) => {
            if (!extras.moving) return;
            if (event.detail > 1) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            stopMoving();
        }, true);

        const decorateNote = (element) => {
            if (!(element instanceof HTMLElement)) return;
            const note = extras.noteMap.get(element.dataset.noteId);
            if (!note) return;
            element.style.setProperty('--note-rotation', `${Number(note.rotation) || 0}deg`);
            element.classList.toggle('is-owned-note', owns(note));
            element.title = owns(note)
                ? localT('Double-click to move. Click to open.', 'Clique duas vezes para mover. Clique para abrir.')
                : '';
            if (note.type !== 'check') return;
            element.classList.add('wall-checklist');
            element.replaceChildren();
            const line = document.createElement('span');
            line.className = 'checklist-card__line';
            const box = document.createElement('span');
            box.className = 'checklist-card__box';
            box.classList.toggle('is-checked', note.completed === true);
            const title = document.createElement('strong');
            title.className = 'checklist-card__title';
            title.textContent = note.title;
            line.append(box, title);
            const author = document.createElement('small');
            author.className = 'wall-postit__author';
            author.textContent = `${localT('by:', 'por:')} ${note.author}`;
            element.append(line, author);
        };

        function decorateAllNotes() {
            notesRoot.querySelectorAll('.wall-postit').forEach(decorateNote);
        }

        const observer = new MutationObserver(decorateAllNotes);
        observer.observe(notesRoot, {childList: true, subtree: true});
        window.addEventListener('rafabru-wall-notes', decorateAllNotes);
        window.addEventListener('rafabru-wall-note', decorateAllNotes);
        window.addEventListener('rafabru-wall-identity', updateIdentityPanel);
        decorateAllNotes();

        document.querySelector('[data-confirm-discard]')?.addEventListener('click', clearChecklistDraft);
        window.addEventListener('rafabru-wall-note', (event) => {
            if (event.detail?.author && extras.noteType === 'check' && event.detail.type === 'check') clearChecklistDraft();
        });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once: true});
    else setup();
})();
