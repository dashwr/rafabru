(() => {
    'use strict';

    const normalizeName = (value) => String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32)
        .toLocaleLowerCase();
    const cleanBody = (value) => String(value || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\s*⟦RAFABRU_PAGE_BREAK⟧\s*/g, '\n\n');
    const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
    const extras = () => window.rafabruWallExtras || null;
    const identity = () => String(extras()?.identity || '');
    const owns = (note) => normalizeName(identity()) !== '' && normalizeName(note?.author) === normalizeName(identity());

    let currentNote = null;
    let editing = false;
    let layer = null;
    let caption = null;
    let body = null;
    let status = null;

    const showToast = (message, duration = 3200) => {
        const toast = document.querySelector('[data-wall-toast]');
        if (!toast) return;
        toast.textContent = message;
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, duration);
    };

    const jsonRequest = async (url, options = {}) => {
        const response = await window.fetch(url, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                ...(options.body ? {'Content-Type': 'application/json'} : {}),
                ...(options.headers || {}),
            },
            ...options,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) {
            throw new Error(payload.message || payload.error || localT('Request failed.', 'A solicitação falhou.'));
        }
        return payload;
    };

    const updateHistory = (noteId = '', replace = false) => {
        const url = new URL(window.location.href);
        if (noteId) url.searchParams.set('note', noteId);
        else url.searchParams.delete('note');
        const method = replace ? 'replaceState' : 'pushState';
        history[method]({note: noteId}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    const ensureLayer = () => {
        if (layer?.isConnected) return;
        layer = document.createElement('div');
        layer.className = 'published-note-layer';
        layer.hidden = true;
        layer.innerHTML = `
            <section class="published-note-window window" role="dialog" aria-modal="true" aria-label="${localT('Published note', 'Nota publicada')}">
                <header class="titlebar published-note-titlebar">
                    <span data-published-caption></span>
                    <button class="site-popup__control" type="button" data-published-close aria-label="${localT('Close', 'Fechar')}">×</button>
                </header>
                <div class="published-note-body" data-published-body></div>
                <p class="published-note-status" data-published-status aria-live="polite"></p>
            </section>
        `;
        document.body.appendChild(layer);
        caption = layer.querySelector('[data-published-caption]');
        body = layer.querySelector('[data-published-body]');
        status = layer.querySelector('[data-published-status]');
        layer.querySelector('[data-published-close]')?.addEventListener('click', () => closeViewer());
        layer.addEventListener('click', (event) => {
            if (event.target === layer) closeViewer();
        });
    };

    const closeViewer = (replaceHistory = true) => {
        ensureLayer();
        layer.hidden = true;
        editing = false;
        currentNote = null;
        document.body.classList.remove('is-published-note-open');
        if (replaceHistory && new URL(window.location.href).searchParams.has('note')) updateHistory('', true);
    };

    const syncWallCard = (note) => {
        const state = extras();
        if (state?.noteMap && note?.id) state.noteMap.set(String(note.id), note);
        const card = document.querySelector(`.wall-postit[data-note-id="${CSS.escape(String(note.id || ''))}"]`);
        if (card instanceof HTMLElement) {
            Array.from(card.classList).forEach((name) => {
                if (name.startsWith('postit-color--')) card.classList.remove(name);
            });
            card.classList.add(`postit-color--${note.color}`);
            card.style.setProperty('--note-rotation', `${Number(note.rotation) || 0}deg`);
            if (note.type === 'check') {
                card.classList.add('wall-checklist');
                card.replaceChildren();
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
                card.append(line, author);
            } else {
                card.classList.remove('wall-checklist');
                card.replaceChildren();
                const title = document.createElement('strong');
                title.className = 'wall-postit__title';
                title.textContent = note.title;
                const preview = document.createElement('p');
                preview.className = 'wall-postit__preview';
                preview.textContent = note.preview || '';
                const author = document.createElement('small');
                author.className = 'wall-postit__author';
                author.textContent = `${localT('by:', 'por:')} ${note.author}`;
                card.append(title, preview, author);
            }
        }
        window.dispatchEvent(new CustomEvent('rafabru-wall-note', {detail: note}));
    };

    const makeActions = (...buttons) => {
        const actions = document.createElement('div');
        actions.className = 'published-note-actions';
        buttons.forEach((button) => actions.appendChild(button));
        return actions;
    };

    const actionButton = (label, handler, primary = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `retro-action${primary ? ' retro-action--primary' : ''}`;
        button.textContent = label;
        button.addEventListener('click', handler);
        return button;
    };

    const renderChecklistView = (note) => {
        const list = document.createElement('div');
        list.className = 'published-checklist published-checklist--view';
        const items = Array.isArray(note.checklist) ? note.checklist : [];
        items.filter((item) => String(item?.text || '').trim() !== '').forEach((item) => {
            const row = document.createElement('label');
            row.className = 'published-checklist__row';
            row.classList.toggle('is-checked', item.checked === true);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.checked === true;
            checkbox.disabled = true;
            const text = document.createElement('span');
            text.textContent = String(item.text || '');
            row.append(checkbox, text);
            list.appendChild(row);
        });
        if (!list.children.length) {
            const empty = document.createElement('p');
            empty.className = 'published-note-empty';
            empty.textContent = localT('This checklist has no items.', 'Esta lista não tem itens.');
            list.appendChild(empty);
        }
        return list;
    };

    const renderView = (note) => {
        ensureLayer();
        editing = false;
        currentNote = note;
        status.textContent = '';
        caption.textContent = note.type === 'check'
            ? localT('Published checklist', 'Lista publicada')
            : localT('Published notebook', 'Caderno publicado');
        body.replaceChildren();

        const heading = document.createElement('h2');
        heading.className = 'published-note-heading';
        heading.textContent = note.title;
        const meta = document.createElement('p');
        meta.className = 'published-note-meta';
        meta.textContent = `${localT('by:', 'por:')} ${note.author}`;
        body.append(heading, meta);

        if (note.type === 'check') {
            body.appendChild(renderChecklistView(note));
        } else {
            const paper = document.createElement('div');
            paper.className = 'published-writing-paper';
            paper.textContent = cleanBody(note.body);
            body.appendChild(paper);
        }

        const close = actionButton(localT('Close', 'Fechar'), () => closeViewer());
        if (owns(note)) {
            const edit = actionButton(localT('Edit', 'Editar'), () => renderEdit(note), true);
            body.appendChild(makeActions(edit, close));
        } else {
            body.appendChild(makeActions(close));
        }
    };

    const ensureChecklistItems = (value) => {
        const result = (Array.isArray(value) ? value : []).slice(0, 100).map((item) => ({
            text: String(item?.text || '').slice(0, 180),
            checked: item?.checked === true,
        }));
        while (result.length < 5) result.push({text: '', checked: false});
        return result;
    };

    const renderEdit = (note) => {
        if (!owns(note)) {
            renderView(note);
            return;
        }
        ensureLayer();
        editing = true;
        status.textContent = '';
        caption.textContent = note.type === 'check'
            ? localT('Edit published checklist', 'Editar lista publicada')
            : localT('Edit published notebook', 'Editar caderno publicado');
        body.replaceChildren();

        const title = document.createElement('input');
        title.className = 'published-note-title-input';
        title.type = 'text';
        title.maxLength = 80;
        title.value = note.title;
        body.appendChild(title);

        let writing = null;
        let checklist = null;
        if (note.type === 'check') {
            checklist = ensureChecklistItems(note.checklist);
            const list = document.createElement('div');
            list.className = 'published-checklist published-checklist--edit';

            const renderRows = (focusIndex = null) => {
                list.replaceChildren();
                checklist.forEach((item, index) => {
                    const row = document.createElement('label');
                    row.className = 'published-checklist__row';
                    row.classList.toggle('is-checked', item.checked === true);
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = item.checked === true;
                    checkbox.disabled = String(item.text || '').trim() === '';
                    checkbox.addEventListener('change', () => {
                        checklist[index].checked = checkbox.checked;
                        row.classList.toggle('is-checked', checkbox.checked);
                    });
                    const text = document.createElement('input');
                    text.type = 'text';
                    text.maxLength = 180;
                    text.value = item.text;
                    text.placeholder = `${localT('Item', 'Item')} ${index + 1}`;
                    text.addEventListener('input', () => {
                        checklist[index].text = text.value.slice(0, 180);
                        checkbox.disabled = text.value.trim() === '';
                        if (checkbox.disabled) {
                            checkbox.checked = false;
                            checklist[index].checked = false;
                            row.classList.remove('is-checked');
                        }
                        if (index === checklist.length - 2 && text.value.trim() !== '' && checklist.length < 100) {
                            checklist.push({text: '', checked: false});
                            renderRows(index);
                        }
                    });
                    row.append(checkbox, text);
                    list.appendChild(row);
                });
                if (focusIndex !== null) {
                    requestAnimationFrame(() => {
                        const input = list.querySelectorAll('input[type="text"]')[focusIndex];
                        input?.focus();
                        input?.setSelectionRange(input.value.length, input.value.length);
                    });
                }
            };
            renderRows();
            body.appendChild(list);
        } else {
            writing = document.createElement('textarea');
            writing.className = 'published-writing-editor';
            writing.maxLength = 15000;
            writing.value = cleanBody(note.body);
            body.appendChild(writing);
        }

        const cancel = actionButton(localT('Cancel', 'Cancelar'), () => renderView(note));
        const save = actionButton(localT('Save changes', 'Salvar alterações'), async () => {
            const nextTitle = title.value.trim();
            if (!nextTitle) {
                status.textContent = localT('Give the note a title.', 'Dê um título à nota.');
                title.focus();
                return;
            }
            if (note.type === 'check' && !checklist.some((item) => item.text.trim() !== '')) {
                status.textContent = localT('Add at least one checklist item.', 'Adicione pelo menos um item à lista.');
                return;
            }
            save.disabled = true;
            status.textContent = localT('Saving...', 'Salvando...');
            try {
                const payload = {
                    id: note.id,
                    author: identity(),
                    title: nextTitle,
                };
                if (note.type === 'check') payload.checklist = checklist;
                else payload.body = writing.value;
                const result = await jsonRequest('/api/wall/update.php', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                currentNote = result.note;
                syncWallCard(result.note);
                renderView(result.note);
                showToast(localT('Published note updated.', 'Nota publicada atualizada.'));
            } catch (error) {
                status.textContent = error.message;
                save.disabled = false;
            }
        }, true);
        body.appendChild(makeActions(save, cancel));
        requestAnimationFrame(() => title.focus());
    };

    const openViewer = async (noteId, pushHistory = true) => {
        ensureLayer();
        layer.hidden = false;
        document.body.classList.add('is-published-note-open');
        caption.textContent = localT('Loading published note...', 'Carregando nota publicada...');
        body.replaceChildren();
        status.textContent = '';
        try {
            const payload = await jsonRequest(`/api/wall/read.php?id=${encodeURIComponent(noteId)}`);
            currentNote = payload.note;
            renderView(payload.note);
            if (pushHistory) updateHistory(payload.note.id);
        } catch (error) {
            caption.textContent = localT('Published note', 'Nota publicada');
            status.textContent = error.message;
        }
    };

    window.rafabruOpenPublishedNote = openViewer;

    document.addEventListener('click', (event) => {
        const postit = event.target.closest?.('.wall-postit');
        if (!postit || document.body.classList.contains('is-moving-owned-note')) return;
        const noteId = String(postit.dataset.noteId || '');
        if (!noteId) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openViewer(noteId);
    }, true);

    window.addEventListener('popstate', () => {
        const noteId = new URL(window.location.href).searchParams.get('note');
        if (noteId) openViewer(noteId, false);
        else if (!layer?.hidden) closeViewer(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || layer?.hidden) return;
        if (editing && currentNote) renderView(currentNote);
        else closeViewer();
    });
})();
