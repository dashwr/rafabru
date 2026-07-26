(() => {
    'use strict';

    const MAX_PAGES = 12;
    const MAX_CHARACTERS = 14500;
    const PAGE_STEP = 388;
    const PAGE_SEPARATOR = '\n⟦RAFABRU_PAGE_BREAK⟧\n';

    const modalLayer = document.querySelector('[data-modal-layer]');
    const notebookModal = document.querySelector('[data-notebook-modal]');
    const notebookShell = document.querySelector('[data-notebook-shell]');
    const notebookViewport = document.querySelector('[data-notebook-viewport]');
    const paperTrack = document.querySelector('[data-paper-track]');
    const pageTrack = document.querySelector('[data-notebook-flow]');
    const previousButton = document.querySelector('[data-page-previous]');
    const nextButton = document.querySelector('[data-page-next]');
    const pageCounter = document.querySelector('[data-page-counter]');
    const navigation = document.querySelector('.notebook-navigation');
    const notebookStatus = document.querySelector('[data-notebook-status]');
    const editorActions = document.querySelector('[data-editor-actions]');
    const viewerActions = document.querySelector('[data-viewer-actions]');
    const modalSections = [
        notebookModal,
        document.querySelector('[data-discard-dialog]'),
        document.querySelector('[data-captcha-dialog]'),
        document.querySelector('[data-postit-designer]'),
    ].filter(Boolean);

    if (!modalLayer || !notebookModal || !notebookShell || !notebookViewport || !paperTrack || !pageTrack
        || !previousButton || !nextButton || !pageCounter || !navigation || !notebookStatus
        || !editorActions || !viewerActions) {
        return;
    }

    const normalizeName = (value) => String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32)
        .toLocaleLowerCase();
    const normalizeText = (value) => String(value ?? '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .replace(/\u200B/g, '');
    const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
    const extras = () => window.rafabruWallExtras || null;
    const identity = () => String(extras()?.identity || '');
    const owns = (note) => normalizeName(identity()) !== '' && normalizeName(note?.author) === normalizeName(identity());

    const state = {
        active: false,
        mode: 'view',
        note: null,
        pages: ['', ''],
        checklist: [],
        currentSpread: 0,
        activePage: 0,
        saving: false,
    };

    const titleRow = document.createElement('label');
    titleRow.className = 'published-notebook-title-row window';
    titleRow.hidden = true;
    titleRow.innerHTML = `
        <span>${localT('Title', 'Título')}</span>
        <input class="published-note-title-input" type="text" maxlength="80" autocomplete="off">
    `;
    notebookStatus.insertAdjacentElement('beforebegin', titleRow);
    const titleInput = titleRow.querySelector('input');

    const measurement = document.createElement('textarea');
    measurement.className = 'published-page-measure';
    measurement.tabIndex = -1;
    measurement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(measurement);

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

    const ensureEvenPages = (pages, minimum = 2) => {
        const result = (Array.isArray(pages) ? pages : []).slice(0, MAX_PAGES).map(normalizeText);
        while (result.length < minimum) result.push('');
        if (result.length % 2 !== 0 && result.length < MAX_PAGES) result.push('');
        return result.slice(0, MAX_PAGES);
    };

    const totalCharacters = () => state.pages.reduce((total, page) => total + page.length, 0);

    const textFitsPage = (text) => {
        measurement.value = text;
        return measurement.scrollHeight <= measurement.clientHeight + 1;
    };

    const splitTextToFit = (text) => {
        if (textFitsPage(text)) return [text, ''];
        let low = 0;
        let high = text.length;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (textFitsPage(text.slice(0, middle))) low = middle;
            else high = middle - 1;
        }
        let splitIndex = Math.max(1, low);
        const nearbyBreak = Math.max(
            text.lastIndexOf('\n', splitIndex),
            text.lastIndexOf(' ', splitIndex),
            text.lastIndexOf('\t', splitIndex),
        );
        if (nearbyBreak > Math.max(0, splitIndex - 72)) splitIndex = nearbyBreak + 1;
        return [
            text.slice(0, splitIndex).replace(/[ \t]+$/g, ''),
            text.slice(splitIndex).replace(/^[ \t]+/g, ''),
        ];
    };

    const paginatePlainText = (body) => {
        const pages = [];
        let remaining = normalizeText(body);
        if (!remaining) return ['', ''];
        while (remaining && pages.length < MAX_PAGES) {
            const [page, overflow] = splitTextToFit(remaining);
            pages.push(page);
            if (!overflow || overflow === remaining) break;
            remaining = overflow;
        }
        if (remaining && pages.length === MAX_PAGES) pages[MAX_PAGES - 1] += remaining;
        return ensureEvenPages(pages);
    };

    const decodePages = (body) => {
        const normalized = normalizeText(body);
        if (normalized.includes('⟦RAFABRU_PAGE_BREAK⟧')) {
            return ensureEvenPages(normalized.split(/\s*⟦RAFABRU_PAGE_BREAK⟧\s*/g));
        }
        return paginatePlainText(normalized);
    };

    const encodePages = () => {
        const pages = state.pages.slice();
        while (pages.length > 2 && pages[pages.length - 1].trim() === '' && pages[pages.length - 2].trim() === '') {
            pages.splice(-2, 2);
        }
        return ensureEvenPages(pages).join(PAGE_SEPARATOR);
    };

    const ensureChecklist = (items) => {
        const result = (Array.isArray(items) ? items : []).slice(0, 100).map((item) => ({
            text: String(item?.text || '').slice(0, 180),
            checked: item?.checked === true,
        }));
        while (result.length < 5) result.push({text: '', checked: false});
        return result;
    };

    const playPageSound = (direction) => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            playPageSound.context ||= new AudioContextClass();
            const context = playPageSound.context;
            const duration = 0.18;
            const frameCount = Math.floor(context.sampleRate * duration);
            const buffer = context.createBuffer(1, frameCount, context.sampleRate);
            const channel = buffer.getChannelData(0);
            for (let index = 0; index < frameCount; index += 1) {
                const envelope = 1 - index / frameCount;
                channel[index] = (Math.random() * 2 - 1) * envelope * (direction === 'next' ? 0.16 : 0.13);
            }
            const source = context.createBufferSource();
            const filter = context.createBiquadFilter();
            const gain = context.createGain();
            filter.type = 'bandpass';
            filter.frequency.value = direction === 'next' ? 1100 : 850;
            filter.Q.value = 0.8;
            gain.gain.value = 0.32;
            source.buffer = buffer;
            source.connect(filter).connect(gain).connect(context.destination);
            source.start();
        } catch (_) {
        }
    };

    const counterText = () => {
        if (state.note?.type === 'check') return localT('published checklist', 'lista publicada');
        const total = Math.max(2, state.pages.length);
        const first = state.currentSpread * 2 + 1;
        const second = Math.min(total, first + 1);
        return document.documentElement.lang === 'pt-BR'
            ? `páginas ${first}–${second} de ${total}`
            : `pages ${first}–${second} of ${total}`;
    };

    const updateNavigation = (direction = '') => {
        const offset = state.currentSpread * 2 * PAGE_STEP;
        paperTrack.style.transform = `translateX(${-offset}px)`;
        pageTrack.style.transform = `translateX(${-offset}px)`;
        pageCounter.textContent = counterText();
        previousButton.classList.remove('is-checklist-hidden');
        nextButton.classList.remove('is-checklist-hidden');
        pageCounter.classList.remove('is-checklist-hidden');
        previousButton.disabled = state.note?.type === 'check' || state.currentSpread <= 0;
        if (state.note?.type === 'check') {
            nextButton.disabled = true;
        } else if (state.mode === 'edit') {
            nextButton.disabled = state.currentSpread >= (MAX_PAGES / 2) - 1;
        } else {
            nextButton.disabled = state.currentSpread >= Math.max(0, Math.ceil(state.pages.length / 2) - 1);
        }

        if (direction) {
            notebookShell.classList.remove('is-turning-next', 'is-turning-previous');
            void notebookShell.offsetWidth;
            notebookShell.classList.add(direction === 'next' ? 'is-turning-next' : 'is-turning-previous');
            window.setTimeout(() => notebookShell.classList.remove('is-turning-next', 'is-turning-previous'), 560);
            playPageSound(direction);
        }
    };

    const focusPage = (index, position = 'end') => {
        const editor = pageTrack.querySelector(`[data-published-page="${index}"]`);
        if (!(editor instanceof HTMLTextAreaElement)) return;
        editor.focus();
        const caret = position === 'start' ? 0 : editor.value.length;
        editor.setSelectionRange(caret, caret);
        state.activePage = index;
    };

    const pushOverflowForward = (startIndex) => {
        let index = startIndex;
        let focusIndex = startIndex;
        let caretPosition = null;
        while (index < state.pages.length && index < MAX_PAGES) {
            if (textFitsPage(state.pages[index])) break;
            const [fitting, overflow] = splitTextToFit(state.pages[index]);
            if (!overflow || fitting === state.pages[index]) break;
            state.pages[index] = fitting;
            if (index + 1 >= MAX_PAGES) return {overflowed: true, focusIndex, caretPosition};
            if (index + 1 >= state.pages.length) state.pages.push('');
            state.pages[index + 1] = overflow + state.pages[index + 1];
            focusIndex = index + 1;
            caretPosition = overflow.length;
            index += 1;
        }
        state.pages = ensureEvenPages(state.pages);
        return {overflowed: false, focusIndex, caretPosition};
    };

    const renderWritingPages = ({focusIndex = null, caret = 'end'} = {}) => {
        pageTrack.replaceChildren();
        const fragment = document.createDocumentFragment();
        state.pages.forEach((page, index) => {
            const editor = document.createElement('textarea');
            editor.className = 'notebook-page-editor published-notebook-page';
            editor.dataset.publishedPage = String(index);
            editor.value = page;
            editor.readOnly = state.mode !== 'edit';
            editor.spellcheck = state.mode === 'edit';
            editor.maxLength = MAX_CHARACTERS;
            editor.setAttribute('aria-label', `${localT('Notebook writing', 'Texto do caderno')} — ${localT('page', 'página')} ${index + 1}`);
            editor.addEventListener('focus', () => { state.activePage = index; });
            editor.addEventListener('drop', (event) => event.preventDefault());
            editor.addEventListener('input', () => {
                if (!state.active || state.mode !== 'edit') return;
                const previousPages = state.pages.slice();
                const previous = state.pages[index] || '';
                const candidate = normalizeText(editor.value);
                const projected = totalCharacters() - previous.length + candidate.length;
                if (projected > MAX_CHARACTERS) {
                    editor.value = previous;
                    notebookStatus.textContent = localT('This notebook has reached its last page.', 'Este caderno chegou à última página.');
                    return;
                }
                state.pages[index] = candidate;
                notebookStatus.textContent = `${state.note.title} — ${localT('by:', 'por:')} ${state.note.author}`;
                if (editor.scrollHeight <= editor.clientHeight + 1) return;
                const result = pushOverflowForward(index);
                if (result.overflowed) {
                    state.pages = previousPages;
                    notebookStatus.textContent = localT('This notebook has reached its last page.', 'Este caderno chegou à última página.');
                    renderWritingPages({focusIndex: index});
                    return;
                }
                state.currentSpread = Math.floor(result.focusIndex / 2);
                renderWritingPages({focusIndex: result.focusIndex});
                if (result.caretPosition !== null) {
                    requestAnimationFrame(() => {
                        const target = pageTrack.querySelector(`[data-published-page="${result.focusIndex}"]`);
                        if (target instanceof HTMLTextAreaElement) target.setSelectionRange(result.caretPosition, result.caretPosition);
                    });
                }
            });
            fragment.appendChild(editor);
        });
        pageTrack.appendChild(fragment);
        updateNavigation();
        if (focusIndex !== null) requestAnimationFrame(() => focusPage(focusIndex, caret));
    };

    const renderChecklist = () => {
        const checklistEditor = document.querySelector('.checklist-editor');
        const root = checklistEditor?.querySelector('[data-checklist-items]');
        if (!checklistEditor || !root) return;
        root.replaceChildren();
        state.checklist = ensureChecklist(state.checklist);
        state.checklist.forEach((item, index) => {
            if (state.mode === 'view' && item.text.trim() === '') return;
            const row = document.createElement('label');
            row.className = 'checklist-editor__row published-checklist-row';
            row.classList.toggle('is-checked', item.checked === true);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.checked === true;
            checkbox.disabled = state.mode !== 'edit' || item.text.trim() === '';
            checkbox.addEventListener('change', () => {
                if (state.mode !== 'edit') return;
                state.checklist[index].checked = checkbox.checked;
                row.classList.toggle('is-checked', checkbox.checked);
            });
            const text = document.createElement('input');
            text.type = 'text';
            text.maxLength = 180;
            text.value = item.text;
            text.readOnly = state.mode !== 'edit';
            text.placeholder = state.mode === 'edit' ? `${localT('Item', 'Item')} ${index + 1}` : '';
            text.addEventListener('input', () => {
                if (state.mode !== 'edit') return;
                state.checklist[index].text = text.value.slice(0, 180);
                checkbox.disabled = text.value.trim() === '';
                if (checkbox.disabled) {
                    checkbox.checked = false;
                    state.checklist[index].checked = false;
                    row.classList.remove('is-checked');
                }
                if (index === state.checklist.length - 2 && text.value.trim() !== '' && state.checklist.length < 100) {
                    state.checklist.push({text: '', checked: false});
                    renderChecklist();
                    requestAnimationFrame(() => {
                        const input = root.querySelectorAll('input[type="text"]')[index];
                        input?.focus();
                        input?.setSelectionRange(input.value.length, input.value.length);
                    });
                }
            });
            row.append(checkbox, text);
            root.appendChild(row);
        });
        if (!root.children.length) {
            const empty = document.createElement('p');
            empty.className = 'published-note-empty';
            empty.textContent = localT('This checklist has no items.', 'Esta lista não tem itens.');
            root.appendChild(empty);
        }
    };

    const configureNotebookSurface = () => {
        const checklistEditor = document.querySelector('.checklist-editor');
        const typeSwitch = navigation.querySelector('.note-type-switch');
        notebookModal.classList.add('is-published-unified');
        notebookModal.classList.toggle('is-published-checklist', state.note?.type === 'check');
        if (typeSwitch) typeSwitch.hidden = true;
        if (state.note?.type === 'check') {
            notebookViewport.hidden = true;
            if (checklistEditor) checklistEditor.hidden = false;
            renderChecklist();
        } else {
            notebookViewport.hidden = false;
            if (checklistEditor) checklistEditor.hidden = true;
            renderWritingPages();
        }
        updateNavigation();
    };

    const makeButton = (label, handler, primary = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `retro-action${primary ? ' retro-action--primary' : ''}`;
        button.textContent = label;
        button.addEventListener('click', handler);
        return button;
    };

    const setActions = (buttons) => {
        viewerActions.replaceChildren(...buttons);
        viewerActions.hidden = false;
        editorActions.hidden = true;
    };

    const showNotebook = () => {
        modalSections.forEach((section) => { section.hidden = section !== notebookModal; });
        modalLayer.hidden = false;
        document.body.classList.add('is-modal-open', 'is-published-note-open');
    };

    const renderViewState = () => {
        if (!state.note) return;
        state.mode = 'view';
        state.currentSpread = Math.min(state.currentSpread, Math.max(0, Math.ceil(state.pages.length / 2) - 1));
        titleRow.hidden = true;
        titleInput.value = state.note.title;
        notebookStatus.textContent = `${state.note.title} — ${localT('by:', 'por:')} ${state.note.author}`;
        configureNotebookSurface();
        const close = makeButton(localT('Close', 'Fechar'), () => closeViewer());
        if (owns(state.note)) {
            const edit = makeButton(localT('Edit', 'Editar'), () => renderEditState(), true);
            setActions([edit, close]);
        } else {
            setActions([close]);
        }
    };

    const renderEditState = () => {
        if (!state.note || !owns(state.note)) {
            renderViewState();
            return;
        }
        state.mode = 'edit';
        titleRow.hidden = false;
        titleInput.value = state.note.title;
        notebookStatus.textContent = `${state.note.title} — ${localT('by:', 'por:')} ${state.note.author}`;
        configureNotebookSurface();
        const save = makeButton(localT('Save changes', 'Salvar alterações'), () => savePublishedChanges(), true);
        const cancel = makeButton(localT('Cancel', 'Cancelar'), () => {
            state.pages = decodePages(state.note.body || '');
            state.checklist = ensureChecklist(state.note.checklist);
            state.currentSpread = 0;
            renderViewState();
        });
        setActions([save, cancel]);
        requestAnimationFrame(() => {
            titleInput.focus();
            titleInput.select();
        });
    };

    const syncWallCard = (note) => {
        const extraState = extras();
        if (extraState?.noteMap && note?.id) extraState.noteMap.set(String(note.id), note);
        const card = document.querySelector(`.wall-postit[data-note-id="${CSS.escape(String(note.id || ''))}"]`);
        if (card instanceof HTMLElement) {
            Array.from(card.classList).forEach((name) => {
                if (name.startsWith('postit-color--')) card.classList.remove(name);
            });
            card.classList.add(`postit-color--${note.color}`);
            card.style.setProperty('--note-rotation', `${Number(note.rotation) || 0}deg`);
            card.replaceChildren();
            if (note.type === 'check') {
                card.classList.add('wall-checklist');
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

    const savePublishedChanges = async () => {
        if (!state.note || state.saving || !owns(state.note)) return;
        const title = titleInput.value.trim();
        if (!title) {
            notebookStatus.textContent = localT('Give the note a title.', 'Dê um título à nota.');
            titleInput.focus();
            return;
        }
        if (state.note.type === 'check' && !state.checklist.some((item) => item.text.trim() !== '')) {
            notebookStatus.textContent = localT('Add at least one checklist item.', 'Adicione pelo menos um item à lista.');
            return;
        }
        state.saving = true;
        notebookStatus.textContent = localT('Saving...', 'Salvando...');
        viewerActions.querySelectorAll('button').forEach((button) => { button.disabled = true; });
        try {
            const payload = {
                id: state.note.id,
                author: identity(),
                title,
            };
            if (state.note.type === 'check') payload.checklist = state.checklist;
            else payload.body = encodePages();
            const result = await jsonRequest('/api/wall/update.php', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            state.note = result.note;
            state.pages = decodePages(result.note.body || '');
            state.checklist = ensureChecklist(result.note.checklist);
            state.currentSpread = 0;
            syncWallCard(result.note);
            renderViewState();
            showToast(localT('Published note updated.', 'Nota publicada atualizada.'));
        } catch (error) {
            notebookStatus.textContent = error.message;
            viewerActions.querySelectorAll('button').forEach((button) => { button.disabled = false; });
        } finally {
            state.saving = false;
        }
    };

    function closeViewer(replaceHistory = true) {
        if (!state.active) return;
        state.active = false;
        state.mode = 'view';
        state.note = null;
        state.pages = ['', ''];
        state.checklist = [];
        state.currentSpread = 0;
        modalLayer.hidden = true;
        modalSections.forEach((section) => { section.hidden = true; });
        notebookModal.classList.remove('is-published-unified', 'is-published-checklist');
        titleRow.hidden = true;
        document.body.classList.remove('is-modal-open', 'is-published-note-open');
        const typeSwitch = navigation.querySelector('.note-type-switch');
        if (typeSwitch) typeSwitch.hidden = false;
        if (replaceHistory && new URL(window.location.href).searchParams.has('note')) updateHistory('', true);
    }

    const openViewer = async (noteId, pushHistory = true) => {
        state.active = true;
        showNotebook();
        notebookStatus.textContent = localT('Loading published note...', 'Carregando nota publicada...');
        setActions([makeButton(localT('Close', 'Fechar'), () => closeViewer())]);
        try {
            const payload = await jsonRequest(`/api/wall/read.php?id=${encodeURIComponent(noteId)}`);
            state.note = payload.note;
            state.pages = decodePages(payload.note.body || '');
            state.checklist = ensureChecklist(payload.note.checklist);
            state.currentSpread = 0;
            renderViewState();
            if (pushHistory) updateHistory(payload.note.id);
        } catch (error) {
            notebookStatus.textContent = error.message;
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

    previousButton.addEventListener('click', (event) => {
        if (!state.active) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (state.note?.type === 'check' || state.currentSpread <= 0) return;
        state.currentSpread -= 1;
        updateNavigation('previous');
        if (state.mode === 'edit') requestAnimationFrame(() => focusPage(state.currentSpread * 2));
    }, true);

    nextButton.addEventListener('click', (event) => {
        if (!state.active) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (state.note?.type === 'check') return;
        const nextSpread = state.currentSpread + 1;
        if (state.mode === 'edit') {
            if (nextSpread >= MAX_PAGES / 2) return;
            while (state.pages.length < (nextSpread + 1) * 2) state.pages.push('');
            state.pages = ensureEvenPages(state.pages);
            state.currentSpread = nextSpread;
            renderWritingPages({focusIndex: nextSpread * 2, caret: 'start'});
            updateNavigation('next');
            return;
        }
        if (nextSpread >= Math.ceil(state.pages.length / 2)) return;
        state.currentSpread = nextSpread;
        updateNavigation('next');
    }, true);

    modalLayer.addEventListener('click', (event) => {
        if (!state.active || !event.target.classList.contains('modal-backdrop')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (state.mode === 'edit') renderViewState();
        else closeViewer();
    }, true);

    window.addEventListener('popstate', () => {
        const noteId = new URL(window.location.href).searchParams.get('note');
        if (noteId) openViewer(noteId, false);
        else if (state.active) closeViewer(false);
    });

    window.addEventListener('rafabru-wall-identity', () => {
        if (state.active && state.note && state.mode === 'view') renderViewState();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !state.active) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (state.mode === 'edit') renderViewState();
        else closeViewer();
    }, true);
})();
