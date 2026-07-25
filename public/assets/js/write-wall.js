(() => {
    'use strict';

    const wall = document.querySelector('[data-wall]');
    const notesRoot = document.querySelector('[data-wall-notes]');
    const loading = document.querySelector('[data-wall-loading]');
    const createButton = document.querySelector('[data-create-note]');
    const modalLayer = document.querySelector('[data-modal-layer]');
    const notebookModal = document.querySelector('[data-notebook-modal]');
    const notebookShell = document.querySelector('[data-notebook-shell]');
    const paperTrack = document.querySelector('[data-paper-track]');
    const pageTrack = document.querySelector('[data-notebook-flow]');
    const previousButton = document.querySelector('[data-page-previous]');
    const nextButton = document.querySelector('[data-page-next]');
    const pageCounter = document.querySelector('[data-page-counter]');
    const notebookStatus = document.querySelector('[data-notebook-status]');
    const editorActions = document.querySelector('[data-editor-actions]');
    const viewerActions = document.querySelector('[data-viewer-actions]');
    const discardDialog = document.querySelector('[data-discard-dialog]');
    const captchaDialog = document.querySelector('[data-captcha-dialog]');
    const captchaSlot = document.querySelector('[data-turnstile-slot]');
    const captchaMessage = document.querySelector('[data-captcha-message]');
    const captchaContinue = document.querySelector('[data-captcha-continue]');
    const designer = document.querySelector('[data-postit-designer]');
    const designerPostit = document.querySelector('[data-designer-postit]');
    const designerTitle = document.querySelector('[data-postit-title]');
    const designerPreview = document.querySelector('[data-postit-preview]');
    const designerAuthor = document.querySelector('[data-postit-author]');
    const designerMessage = document.querySelector('[data-designer-message]');
    const placementToolbar = document.querySelector('[data-placement-toolbar]');
    const placementPostit = document.querySelector('[data-placement-postit]');
    const placementTitle = document.querySelector('[data-placement-title]');
    const placementPreview = document.querySelector('[data-placement-preview]');
    const placementAuthor = document.querySelector('[data-placement-author]');
    const toast = document.querySelector('[data-wall-toast]');

    if (!wall || !notesRoot || !modalLayer || !pageTrack || !paperTrack) return;
    pageTrack.removeAttribute('contenteditable');
    pageTrack.removeAttribute('role');
    pageTrack.removeAttribute('aria-multiline');

    const MAX_PAGES = 12;
    const MAX_CHARACTERS = 14500;
    const PAGE_STEP = 388;
    const PAGES_PER_SPREAD = 2;
    const PAGE_SEPARATOR = '\n⟦RAFABRU_PAGE_BREAK⟧\n';
    const DRAFT_KEY = 'rafabru_wall_draft_v2';
    const LEGACY_DRAFT_KEY = 'rafabru_wall_draft_v1';
    const COLOR_CLASSES = [
        'blue-1', 'blue-2', 'blue-3',
        'light-blue-1', 'light-blue-2', 'light-blue-3',
        'pink-1', 'pink-2', 'pink-3',
        'light-pink-1', 'light-pink-2', 'light-pink-3',
        'white-1', 'white-2', 'white-3',
        'yellow-classic',
    ];

    const state = {
        notes: [],
        pages: ['', ''],
        currentSpread: 0,
        mode: 'edit',
        nextNumber: 1,
        publishToken: '',
        captchaToken: '',
        turnstileWidgetId: null,
        selectedColor: 'yellow-classic',
        defaultTitle: '',
        placing: false,
        savingPlacement: false,
        currentViewerId: '',
        activePage: 0,
    };

    const t = (value) => window.rafabruI18n?.t(value) || value;
    const isPortuguese = () => window.rafabruI18n?.language === 'pt';

    const paperFragment = document.createDocumentFragment();
    for (let index = 0; index < MAX_PAGES; index += 1) {
        const paper = document.createElement('div');
        paper.className = 'notebook-paper';
        paper.dataset.page = String(index + 1);
        paperFragment.appendChild(paper);
    }
    paperTrack.appendChild(paperFragment);

    const measurement = document.createElement('textarea');
    measurement.className = 'notebook-page-editor notebook-page-measure';
    measurement.tabIndex = -1;
    measurement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(measurement);

    const normalizeText = (value) => String(value ?? '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .replace(/\u200B/g, '');

    const totalCharacters = (pages = state.pages) => pages.reduce((sum, page) => sum + page.length, 0);

    const ensureEvenPages = (pages, minimum = 2) => {
        const result = pages.slice(0, MAX_PAGES).map((page) => normalizeText(page));
        while (result.length < minimum) result.push('');
        if (result.length % 2 !== 0 && result.length < MAX_PAGES) result.push('');
        return result.slice(0, MAX_PAGES);
    };

    const trimTrailingBlankPages = (pages) => {
        const result = pages.slice();
        while (result.length > 2 && result[result.length - 1].trim() === '' && result[result.length - 2].trim() === '') {
            result.splice(-2, 2);
        }
        return ensureEvenPages(result);
    };

    const encodePages = (pages = state.pages) => trimTrailingBlankPages(pages).join(PAGE_SEPARATOR);

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
            text.lastIndexOf('\t', splitIndex)
        );
        if (nearbyBreak > Math.max(0, splitIndex - 72)) splitIndex = nearbyBreak + 1;

        const head = text.slice(0, splitIndex).replace(/[ \t]+$/g, '');
        const tail = text.slice(splitIndex).replace(/^[ \t]+/g, '');
        return [head, tail];
    };

    const paginatePlainText = (body) => {
        const remainingPages = [];
        let remaining = normalizeText(body);
        if (remaining === '') return ['', ''];

        while (remaining !== '' && remainingPages.length < MAX_PAGES) {
            const [page, overflow] = splitTextToFit(remaining);
            remainingPages.push(page);
            if (overflow === remaining) break;
            remaining = overflow;
        }

        if (remaining !== '' && remainingPages.length === MAX_PAGES) {
            remainingPages[MAX_PAGES - 1] += remaining;
        }
        return ensureEvenPages(remainingPages);
    };

    const decodeBody = (body) => {
        const normalized = normalizeText(body);
        if (normalized.includes(PAGE_SEPARATOR)) {
            return ensureEvenPages(normalized.split(PAGE_SEPARATOR));
        }
        return paginatePlainText(normalized);
    };

    const jsonRequest = async (url, options = {}) => {
        const response = await fetch(url, {
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
            const error = new Error(payload.message || payload.error || 'Request failed.');
            error.code = payload.error || 'request_failed';
            throw error;
        }
        return payload;
    };

    let toastTimer = 0;
    const showToast = (message, duration = 3200) => {
        if (!toast) return;
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => { toast.hidden = true; }, duration);
    };

    const setWallHeight = () => {
        const lowest = state.notes.reduce((maximum, note) => Math.max(maximum, Number(note.y) || 0), 0);
        const minimum = Math.max(1320, window.innerHeight - 20);
        wall.style.minHeight = `${Math.max(minimum, lowest + 430)}px`;
        notesRoot.style.minHeight = `${Math.max(1100, lowest + 270)}px`;
    };

    const noteRotation = (number) => {
        const rotations = [-1.4, 0.8, -0.4, 1.2, -0.9, 0.3];
        return rotations[Math.abs(Number(number) || 0) % rotations.length];
    };

    const createNoteElement = (note) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `wall-postit postit-color--${note.color}`;
        button.dataset.noteId = note.id;
        button.dataset.i18nSkip = '';
        button.style.left = `calc(${Math.min(0.96, Math.max(0.04, Number(note.x) || 0.5)) * 100}% - 107px)`;
        button.style.top = `${Math.max(130, Number(note.y) || 130)}px`;
        button.style.zIndex = String(10 + (Number(note.number) || 0));
        button.style.setProperty('--note-rotation', `${noteRotation(note.number)}deg`);

        const title = document.createElement('strong');
        title.className = 'wall-postit__title';
        title.textContent = note.title;

        const preview = document.createElement('p');
        preview.className = 'wall-postit__preview';
        preview.textContent = note.preview;

        const author = document.createElement('small');
        author.className = 'wall-postit__author';
        author.textContent = `${t('by:')} ${note.author}`;

        button.append(title, preview, author);
        button.addEventListener('click', () => openPublishedNotebook(note.id));
        return button;
    };

    const renderWall = () => {
        notesRoot.replaceChildren();
        const fragment = document.createDocumentFragment();
        state.notes.forEach((note) => fragment.appendChild(createNoteElement(note)));
        notesRoot.appendChild(fragment);
        setWallHeight();
    };

    const loadWall = async () => {
        try {
            const payload = await jsonRequest('/api/wall/list.php');
            state.notes = Array.isArray(payload.notes) ? payload.notes : [];
            state.nextNumber = Number(payload.nextNumber) || 1;
            renderWall();
            if (loading) loading.hidden = true;

            const requestedId = new URLSearchParams(window.location.search).get('note');
            if (requestedId) openPublishedNotebook(requestedId, false);
        } catch (_) {
            if (loading) loading.textContent = t('The wall could not be loaded.');
            showToast(t('The wall could not be loaded.'));
        }
    };

    const modalSections = [notebookModal, discardDialog, captchaDialog, designer].filter(Boolean);
    const showModalSection = (section) => {
        modalSections.forEach((item) => { item.hidden = item !== section; });
        modalLayer.hidden = false;
        document.body.classList.add('is-modal-open');
    };

    const closeModalLayer = () => {
        modalLayer.hidden = true;
        modalSections.forEach((item) => { item.hidden = true; });
        document.body.classList.remove('is-modal-open');
    };

    const counterText = () => {
        const total = Math.max(2, state.pages.length);
        const first = state.currentSpread * 2 + 1;
        const second = Math.min(total, first + 1);
        return isPortuguese()
            ? `páginas ${first}–${second} de ${total}`
            : `pages ${first}–${second} of ${total}`;
    };

    let audioContext = null;
    const playPageSound = (direction) => {
        try {
            audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
            const duration = 0.18;
            const frameCount = Math.floor(audioContext.sampleRate * duration);
            const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
            const channel = buffer.getChannelData(0);
            for (let index = 0; index < frameCount; index += 1) {
                const envelope = 1 - index / frameCount;
                channel[index] = (Math.random() * 2 - 1) * envelope * (direction === 'next' ? 0.16 : 0.13);
            }
            const source = audioContext.createBufferSource();
            const filter = audioContext.createBiquadFilter();
            const gain = audioContext.createGain();
            filter.type = 'bandpass';
            filter.frequency.value = direction === 'next' ? 1100 : 850;
            filter.Q.value = 0.8;
            gain.gain.value = 0.32;
            source.buffer = buffer;
            source.connect(filter).connect(gain).connect(audioContext.destination);
            source.start();
        } catch (_) {
            // Decorative only.
        }
    };

    const updateNavigation = (animateDirection = '') => {
        const offset = state.currentSpread * PAGES_PER_SPREAD * PAGE_STEP;
        paperTrack.style.transform = `translateX(${-offset}px)`;
        pageTrack.style.transform = `translateX(${-offset}px)`;
        pageCounter.textContent = counterText();
        previousButton.disabled = state.currentSpread <= 0;

        if (state.mode === 'edit') {
            nextButton.disabled = state.currentSpread >= (MAX_PAGES / 2) - 1;
        } else {
            nextButton.disabled = state.currentSpread >= Math.max(0, Math.ceil(state.pages.length / 2) - 1);
        }

        if (animateDirection && notebookShell) {
            notebookShell.classList.remove('is-turning-next', 'is-turning-previous');
            void notebookShell.offsetWidth;
            notebookShell.classList.add(animateDirection === 'next' ? 'is-turning-next' : 'is-turning-previous');
            window.setTimeout(() => notebookShell.classList.remove('is-turning-next', 'is-turning-previous'), 560);
            playPageSound(animateDirection);
        }
    };

    const saveDraft = () => {
        if (state.mode !== 'edit') return;
        if (state.pages.every((page) => page.trim() === '')) {
            localStorage.removeItem(DRAFT_KEY);
            localStorage.removeItem(LEGACY_DRAFT_KEY);
            return;
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
            pages: state.pages,
            spread: state.currentSpread,
            updatedAt: Date.now(),
        }));
        localStorage.removeItem(LEGACY_DRAFT_KEY);
    };

    const loadDraft = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
            if (saved && Array.isArray(saved.pages)) {
                return {
                    pages: ensureEvenPages(saved.pages),
                    spread: Math.max(0, Number(saved.spread) || 0),
                };
            }

            const legacy = JSON.parse(localStorage.getItem(LEGACY_DRAFT_KEY) || 'null');
            if (legacy && typeof legacy.body === 'string') {
                return {
                    pages: decodeBody(legacy.body),
                    spread: Math.max(0, Number(legacy.spread) || 0),
                };
            }
        } catch (_) {
            return null;
        }
        return null;
    };

    const focusPage = (index, caret = 'end') => {
        const editor = pageTrack.querySelector(`[data-page-editor="${index}"]`);
        if (!(editor instanceof HTMLTextAreaElement)) return;
        editor.focus();
        const position = caret === 'start' ? 0 : editor.value.length;
        editor.setSelectionRange(position, position);
        state.activePage = index;
    };

    const placeCaretByClick = (editor, event) => {
        if (state.mode !== 'edit') return;
        const rect = editor.getBoundingClientRect();
        const style = getComputedStyle(editor);
        const paddingTop = Number.parseFloat(style.paddingTop) || 0;
        const lineHeight = Number.parseFloat(style.lineHeight) || 24;
        const clickedLine = Math.max(0, Math.floor((event.clientY - rect.top - paddingTop) / lineHeight));

        window.setTimeout(() => {
            if (editor.selectionStart !== editor.value.length) return;
            const explicitLines = editor.value === '' ? 1 : editor.value.split('\n').length;
            if (clickedLine < explicitLines) return;
            const additions = Math.min(17, clickedLine + 1) - explicitLines;
            if (additions <= 0) return;
            editor.value += '\n'.repeat(additions);
            editor.setSelectionRange(editor.value.length, editor.value.length);
            editor.dispatchEvent(new Event('input', {bubbles: true}));
        }, 0);
    };

    const renderPages = ({focusIndex = null, caret = 'end'} = {}) => {
        pageTrack.replaceChildren();
        const fragment = document.createDocumentFragment();

        state.pages.forEach((page, index) => {
            const editor = document.createElement('textarea');
            editor.className = 'notebook-page-editor';
            editor.dataset.pageEditor = String(index);
            editor.value = page;
            editor.readOnly = state.mode !== 'edit';
            editor.spellcheck = state.mode === 'edit';
            editor.setAttribute('aria-label', `${t('Notebook writing')} — ${isPortuguese() ? 'página' : 'page'} ${index + 1}`);
            editor.addEventListener('focus', () => { state.activePage = index; });
            editor.addEventListener('pointerdown', (event) => placeCaretByClick(editor, event));
            editor.addEventListener('drop', (event) => event.preventDefault());
            editor.addEventListener('input', () => handlePageInput(index, editor));
            fragment.appendChild(editor);
        });

        pageTrack.appendChild(fragment);
        updateNavigation();
        if (focusIndex !== null) requestAnimationFrame(() => focusPage(focusIndex, caret));
    };

    const pushOverflowForward = (startIndex) => {
        let index = startIndex;
        let focusIndex = startIndex;
        let caretPosition = null;
        let overflowedPastLimit = false;

        while (index < state.pages.length && index < MAX_PAGES) {
            const pageText = state.pages[index];
            if (textFitsPage(pageText)) break;

            const [fitting, overflow] = splitTextToFit(pageText);
            if (overflow === '' || fitting === pageText) break;
            state.pages[index] = fitting;

            if (index + 1 >= MAX_PAGES) {
                overflowedPastLimit = true;
                break;
            }

            if (index + 1 >= state.pages.length) state.pages.push('');
            const existingNext = state.pages[index + 1];
            state.pages[index + 1] = overflow + existingNext;
            focusIndex = index + 1;
            caretPosition = overflow.length;
            index += 1;
        }

        state.pages = ensureEvenPages(state.pages);
        return {focusIndex, caretPosition, overflowedPastLimit};
    };

    const handlePageInput = (index, editor) => {
        if (state.mode !== 'edit') return;
        const previousPages = state.pages.slice();
        const previous = state.pages[index] || '';
        const candidate = normalizeText(editor.value);
        const projectedTotal = totalCharacters() - previous.length + candidate.length;

        if (projectedTotal > MAX_CHARACTERS) {
            editor.value = previous;
            notebookStatus.textContent = t('This notebook has reached its last page.');
            return;
        }

        state.pages[index] = candidate;
        notebookStatus.textContent = '';

        if (editor.scrollHeight > editor.clientHeight + 1) {
            const result = pushOverflowForward(index);
            if (result.overflowedPastLimit) {
                state.pages = previousPages;
                notebookStatus.textContent = t('This notebook has reached its last page.');
                renderPages({focusIndex: index});
                return;
            }
            const targetSpread = Math.floor(result.focusIndex / 2);
            state.currentSpread = Math.min((MAX_PAGES / 2) - 1, targetSpread);
            renderPages({focusIndex: result.focusIndex});
            const target = pageTrack.querySelector(`[data-page-editor="${result.focusIndex}"]`);
            if (target instanceof HTMLTextAreaElement && result.caretPosition !== null) {
                requestAnimationFrame(() => target.setSelectionRange(result.caretPosition, result.caretPosition));
            }
        } else {
            saveDraft();
            updateNavigation();
        }
    };

    const setNotebookPages = (pages, spread = 0) => {
        state.pages = ensureEvenPages(pages);
        state.currentSpread = Math.min(Math.max(0, spread), Math.max(0, Math.ceil(state.pages.length / 2) - 1));
        renderPages();
    };

    const setNotebookMode = (mode) => {
        state.mode = mode;
        const editing = mode === 'edit';
        editorActions.hidden = !editing;
        viewerActions.hidden = editing;
    };

    const openEditor = () => {
        setNotebookMode('edit');
        state.currentViewerId = '';
        notebookStatus.textContent = '';
        const draft = loadDraft();
        setNotebookPages(draft?.pages || ['', ''], draft?.spread || 0);
        showModalSection(notebookModal);
        requestAnimationFrame(() => {
            renderPages({focusIndex: Math.min(state.currentSpread * 2, state.pages.length - 1)});
            if (draft?.pages?.some((page) => page.trim() !== '')) {
                showToast(t('Your unfinished notebook was restored.'));
            }
        });
    };

    const openPublishedNotebook = async (publicId, pushHistory = true) => {
        try {
            const payload = await jsonRequest(`/api/wall/read.php?id=${encodeURIComponent(publicId)}`);
            const note = payload.note;
            setNotebookMode('view');
            state.currentViewerId = note.id;
            notebookStatus.textContent = `${note.title} — ${t('by:')} ${note.author}`;
            setNotebookPages(decodeBody(note.body || ''), 0);
            showModalSection(notebookModal);

            if (pushHistory) {
                const url = new URL(window.location.href);
                url.searchParams.set('note', note.id);
                history.pushState({note: note.id}, '', url);
            }
        } catch (_) {
            showToast(t('That notebook could not be opened.'));
        }
    };

    const closeViewer = () => {
        closeModalLayer();
        state.currentViewerId = '';
        const url = new URL(window.location.href);
        if (url.searchParams.has('note')) {
            url.searchParams.delete('note');
            history.replaceState({}, '', url);
        }
    };

    previousButton?.addEventListener('click', () => {
        if (state.currentSpread <= 0) return;
        state.currentSpread -= 1;
        updateNavigation('previous');
        if (state.mode === 'edit') {
            saveDraft();
            requestAnimationFrame(() => focusPage(state.currentSpread * 2));
        }
    });

    nextButton?.addEventListener('click', () => {
        const nextSpread = state.currentSpread + 1;
        if (state.mode === 'edit') {
            if (nextSpread >= MAX_PAGES / 2) return;
            const requiredPages = (nextSpread + 1) * 2;
            while (state.pages.length < requiredPages) state.pages.push('');
            state.pages = ensureEvenPages(state.pages);
            state.currentSpread = nextSpread;
            renderPages({focusIndex: nextSpread * 2, caret: 'start'});
            updateNavigation('next');
            saveDraft();
            return;
        }

        const maximumSpread = Math.max(0, Math.ceil(state.pages.length / 2) - 1);
        if (nextSpread > maximumSpread) return;
        state.currentSpread = nextSpread;
        updateNavigation('next');
    });

    createButton?.addEventListener('click', openEditor);
    document.querySelector('[data-close-viewer]')?.addEventListener('click', closeViewer);

    if (editorActions && !editorActions.querySelector('[data-save-close]')) {
        const saveCloseButton = document.createElement('button');
        saveCloseButton.className = 'retro-action';
        saveCloseButton.type = 'button';
        saveCloseButton.dataset.saveClose = '';
        saveCloseButton.textContent = isPortuguese() ? 'Salvar e fechar' : 'Save & close';
        const nevermindButton = editorActions.querySelector('[data-nevermind]');
        editorActions.insertBefore(saveCloseButton, nevermindButton || null);
        saveCloseButton.addEventListener('click', () => {
            saveDraft();
            closeModalLayer();
            showToast(isPortuguese() ? 'Rascunho salvo. Você pode continuar depois.' : 'Draft saved. You can continue later.');
        });
    }

    document.querySelector('[data-nevermind]')?.addEventListener('click', () => showModalSection(discardDialog));
    document.querySelector('[data-cancel-discard]')?.addEventListener('click', () => showModalSection(notebookModal));
    document.querySelector('[data-confirm-discard]')?.addEventListener('click', () => {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(LEGACY_DRAFT_KEY);
        state.pages = ['', ''];
        state.currentSpread = 0;
        closeModalLayer();
        showToast(t('The unfinished notebook was discarded.'));
    });

    const resetTurnstile = () => {
        state.captchaToken = '';
        captchaContinue.disabled = true;
        if (state.turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(state.turnstileWidgetId);
    };

    const renderTurnstile = (attempt = 0) => {
        const siteKey = document.body.dataset.turnstileSiteKey || '';
        captchaMessage.textContent = '';
        captchaContinue.disabled = true;

        if (!siteKey) {
            captchaMessage.textContent = t('Publishing is waiting for the CAPTCHA keys.');
            return;
        }
        if (!window.turnstile) {
            if (attempt < 30) window.setTimeout(() => renderTurnstile(attempt + 1), 150);
            else captchaMessage.textContent = t('The CAPTCHA could not be loaded.');
            return;
        }
        if (state.turnstileWidgetId !== null) {
            window.turnstile.reset(state.turnstileWidgetId);
            return;
        }

        state.turnstileWidgetId = window.turnstile.render(captchaSlot, {
            sitekey: siteKey,
            theme: 'light',
            callback: (token) => {
                state.captchaToken = token;
                captchaContinue.disabled = false;
                captchaMessage.textContent = '';
            },
            'expired-callback': () => {
                state.captchaToken = '';
                captchaContinue.disabled = true;
                captchaMessage.textContent = t('The CAPTCHA expired. Please try again.');
            },
            'error-callback': () => {
                state.captchaToken = '';
                captchaContinue.disabled = true;
                captchaMessage.textContent = t('The CAPTCHA could not be loaded.');
            },
        });
    };

    document.querySelector('[data-publish-draft]')?.addEventListener('click', () => {
        if (state.pages.every((page) => page.trim() === '')) {
            notebookStatus.textContent = t('Write something before publishing.');
            focusPage(state.activePage || 0);
            return;
        }
        saveDraft();
        showModalSection(captchaDialog);
        renderTurnstile();
    });

    document.querySelector('[data-captcha-back]')?.addEventListener('click', () => showModalSection(notebookModal));

    const openDesigner = () => {
        state.defaultTitle = `Post-it #${String(state.nextNumber).padStart(2, '0')}`;
        designerTitle.value = state.defaultTitle;
        designerPreview.value = state.defaultTitle;
        designerAuthor.value = designerAuthor.value || '';
        designerMessage.textContent = '';
        setDesignerColor(state.selectedColor);
        showModalSection(designer);
        requestAnimationFrame(() => designerAuthor.focus());
    };

    captchaContinue?.addEventListener('click', async () => {
        if (!state.captchaToken) return;
        captchaContinue.disabled = true;
        captchaMessage.textContent = t('Checking CAPTCHA...');
        try {
            const payload = await jsonRequest('/api/wall/begin-publish.php', {
                method: 'POST',
                body: JSON.stringify({captchaToken: state.captchaToken}),
            });
            state.publishToken = payload.publishToken;
            resetTurnstile();
            openDesigner();
        } catch (error) {
            captchaMessage.textContent = t(error.message || 'The CAPTCHA could not be confirmed. Please try again.');
            resetTurnstile();
        }
    });

    const setDesignerColor = (color) => {
        if (!COLOR_CLASSES.includes(color)) color = 'yellow-classic';
        state.selectedColor = color;
        COLOR_CLASSES.forEach((item) => designerPostit.classList.remove(`postit-color--${item}`));
        designerPostit.classList.add(`postit-color--${color}`);
        document.querySelectorAll('[data-color]').forEach((button) => {
            button.classList.toggle('is-selected', button.dataset.color === color);
        });
    };

    document.querySelectorAll('[data-color]').forEach((button) => {
        button.addEventListener('click', () => setDesignerColor(button.dataset.color || 'yellow-classic'));
    });

    document.querySelector('[data-designer-back]')?.addEventListener('click', () => showModalSection(notebookModal));

    const designerValues = () => ({
        title: designerTitle.value.trim() === state.defaultTitle ? '' : designerTitle.value.trim(),
        visualTitle: designerTitle.value.trim() || state.defaultTitle,
        preview: designerTitle.value.trim() || state.defaultTitle,
        author: designerAuthor.value.trim(),
        color: state.selectedColor,
    });

    const enterPlacement = () => {
        const values = designerValues();
        if (!values.author) {
            designerMessage.textContent = t('Write who authored this post-it.');
            designerAuthor.focus();
            return;
        }
        if (!state.publishToken) {
            designerMessage.textContent = t('The publishing permission expired. Complete the CAPTCHA again.');
            return;
        }

        placementTitle.textContent = values.visualTitle;
        placementPreview.textContent = values.preview;
        placementAuthor.textContent = values.author;
        COLOR_CLASSES.forEach((item) => placementPostit.classList.remove(`postit-color--${item}`));
        placementPostit.classList.add(`postit-color--${values.color}`);

        state.placing = true;
        closeModalLayer();
        placementToolbar.hidden = false;
        placementPostit.hidden = false;
        document.body.classList.add('is-placing-note');
        placementPostit.style.left = `${window.innerWidth / 2}px`;
        placementPostit.style.top = `${Math.max(160, window.innerHeight / 2)}px`;
    };

    document.querySelector('[data-enter-placement]')?.addEventListener('click', enterPlacement);

    const cancelPlacement = (returnToDesigner = true) => {
        state.placing = false;
        state.savingPlacement = false;
        placementToolbar.hidden = true;
        placementPostit.hidden = true;
        document.body.classList.remove('is-placing-note');
        if (returnToDesigner) showModalSection(designer);
    };

    document.querySelector('[data-cancel-placement]')?.addEventListener('click', () => cancelPlacement(true));

    document.addEventListener('pointermove', (event) => {
        if (!state.placing || state.savingPlacement) return;
        placementPostit.style.left = `${event.clientX}px`;
        placementPostit.style.top = `${event.clientY}px`;
    });

    wall.addEventListener('click', async (event) => {
        if (!state.placing || state.savingPlacement) return;
        if (event.target.closest('.create-box, .wall-postit, .wall-baseboard')) return;

        const wallRect = wall.getBoundingClientRect();
        const x = Math.min(0.96, Math.max(0.04, (event.clientX - wallRect.left) / wallRect.width));
        const y = Math.max(130, Math.round(event.clientY - wallRect.top - 95));
        const values = designerValues();
        state.savingPlacement = true;
        placementToolbar.querySelector('span').textContent = t('Saving the post-it...');

        try {
            const payload = await jsonRequest('/api/wall/create.php', {
                method: 'POST',
                body: JSON.stringify({
                    publishToken: state.publishToken,
                    title: values.title,
                    author: values.author,
                    preview: values.preview,
                    body: encodePages(),
                    color: values.color,
                    x,
                    y,
                }),
            });

            state.notes.push(payload.note);
            state.nextNumber = Math.max(state.nextNumber + 1, Number(payload.note.number) + 1);
            state.publishToken = '';
            localStorage.removeItem(DRAFT_KEY);
            localStorage.removeItem(LEGACY_DRAFT_KEY);
            state.pages = ['', ''];
            state.currentSpread = 0;
            cancelPlacement(false);
            renderWall();
            showToast(t('The post-it is now on the wall.'));
        } catch (error) {
            state.savingPlacement = false;
            placementToolbar.querySelector('span').textContent = t('Move the post-it and click the wall to place it.');
            showToast(t(error.message || 'The post-it could not be saved. Please try again.'), 4800);
        }
    });

    window.addEventListener('popstate', () => {
        const requestedId = new URLSearchParams(window.location.search).get('note');
        if (requestedId) openPublishedNotebook(requestedId, false);
        else if (state.mode === 'view' && !modalLayer.hidden) closeModalLayer();
    });

    window.addEventListener('resize', setWallHeight);
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (state.placing) {
            cancelPlacement(true);
            return;
        }
        if (!discardDialog.hidden || !captchaDialog.hidden || !designer.hidden) {
            showModalSection(notebookModal);
            return;
        }
        if (!notebookModal.hidden && state.mode === 'view') {
            closeViewer();
            return;
        }
        if (!notebookModal.hidden && state.mode === 'edit') {
            saveDraft();
            closeModalLayer();
        }
    });

    loadWall();
})();