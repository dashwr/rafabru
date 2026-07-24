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
    const flow = document.querySelector('[data-notebook-flow]');
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

    if (!wall || !notesRoot || !modalLayer || !flow || !paperTrack) return;

    const MAX_PAGES = 12;
    const MAX_CHARACTERS = 15000;
    const PAGE_STEP = 388;
    const PAGES_PER_SPREAD = 2;
    const DRAFT_KEY = 'rafabru_wall_draft_v1';
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
        body: '',
        lastValidBody: '',
        currentSpread: 0,
        usedPages: 2,
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

    const normalizeBody = (value) => value
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .replace(/\n{4,}/g, '\n\n\n')
        .slice(0, MAX_CHARACTERS);

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
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, duration);
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
        } catch (error) {
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

    const saveDraft = () => {
        if (state.mode !== 'edit') return;
        if (state.body.trim() === '') {
            localStorage.removeItem(DRAFT_KEY);
            return;
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
            body: state.body,
            spread: state.currentSpread,
            updatedAt: Date.now(),
        }));
    };

    const loadDraft = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
            if (!saved || typeof saved.body !== 'string') return null;
            return {
                body: normalizeBody(saved.body),
                spread: Math.max(0, Number(saved.spread) || 0),
            };
        } catch (_) {
            return null;
        }
    };

    const getEndPage = () => {
        const body = flow.innerText || '';
        if (body.trim() === '') return 1;

        const range = document.createRange();
        range.selectNodeContents(flow);
        range.collapse(false);
        const rect = range.getBoundingClientRect();
        const flowRect = flow.getBoundingClientRect();
        const horizontal = Math.max(0, rect.left - flowRect.left + Math.max(1, rect.width));
        return Math.min(MAX_PAGES + 1, Math.max(1, Math.floor(horizontal / PAGE_STEP) + 1));
    };

    const getCaretPage = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !flow.contains(selection.anchorNode)) return null;
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        const rect = range.getBoundingClientRect();
        const flowRect = flow.getBoundingClientRect();
        const horizontal = Math.max(0, rect.left - flowRect.left);
        return Math.min(MAX_PAGES, Math.max(1, Math.floor(horizontal / PAGE_STEP) + 1));
    };

    const counterText = () => {
        const total = Math.max(2, state.usedPages);
        const first = state.currentSpread * 2 + 1;
        const second = Math.min(total, first + 1);
        if (isPortuguese()) return `páginas ${first}–${second} de ${total}`;
        return `pages ${first}–${second} of ${total}`;
    };

    const updateNotebookPosition = (animateDirection = '') => {
        const offset = state.currentSpread * PAGES_PER_SPREAD * PAGE_STEP;
        paperTrack.style.transform = `translateX(${-offset}px)`;
        flow.style.transform = `translateX(${-offset}px)`;
        pageCounter.textContent = counterText();
        previousButton.disabled = state.currentSpread <= 0;
        nextButton.disabled = (state.currentSpread + 1) * PAGES_PER_SPREAD >= state.usedPages;

        if (animateDirection && notebookShell) {
            notebookShell.classList.remove('is-turning-next', 'is-turning-previous');
            void notebookShell.offsetWidth;
            notebookShell.classList.add(animateDirection === 'next' ? 'is-turning-next' : 'is-turning-previous');
            window.setTimeout(() => notebookShell.classList.remove('is-turning-next', 'is-turning-previous'), 560);
            playPageSound(animateDirection);
        }
    };

    const recalculateNotebook = ({followCaret = false} = {}) => {
        state.usedPages = Math.max(2, getEndPage());
        const maximumSpread = Math.max(0, Math.ceil(state.usedPages / 2) - 1);
        if (followCaret) {
            const caretPage = getCaretPage();
            if (caretPage !== null) state.currentSpread = Math.floor((caretPage - 1) / 2);
        }
        state.currentSpread = Math.min(maximumSpread, Math.max(0, state.currentSpread));
        updateNotebookPosition();
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
                const grain = Math.random() * 2 - 1;
                channel[index] = grain * envelope * (direction === 'next' ? 0.16 : 0.13);
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
            // Sound is decorative; writing must continue even when WebAudio is unavailable.
        }
    };

    const setNotebookBody = (body) => {
        state.body = normalizeBody(body);
        state.lastValidBody = state.body;
        flow.textContent = state.body;
        requestAnimationFrame(() => recalculateNotebook());
    };

    const setNotebookMode = (mode) => {
        state.mode = mode;
        const editing = mode === 'edit';
        flow.contentEditable = editing ? 'true' : 'false';
        flow.setAttribute('aria-readonly', editing ? 'false' : 'true');
        editorActions.hidden = !editing;
        viewerActions.hidden = editing;
    };

    const openEditor = () => {
        setNotebookMode('edit');
        state.currentViewerId = '';
        notebookStatus.textContent = '';
        const draft = loadDraft();
        setNotebookBody(draft?.body || state.body || '');
        state.currentSpread = Math.min(draft?.spread || 0, Math.max(0, Math.ceil(state.usedPages / 2) - 1));
        showModalSection(notebookModal);
        requestAnimationFrame(() => {
            recalculateNotebook();
            flow.focus();
            if (draft?.body) showToast(t('Your unfinished notebook was restored.'));
        });
    };

    const openPublishedNotebook = async (publicId, pushHistory = true) => {
        try {
            const payload = await jsonRequest(`/api/wall/read.php?id=${encodeURIComponent(publicId)}`);
            const note = payload.note;
            setNotebookMode('view');
            state.currentViewerId = note.id;
            state.currentSpread = 0;
            setNotebookBody(note.body || '');
            notebookStatus.textContent = `${note.title} — ${t('by:')} ${note.author}`;
            showModalSection(notebookModal);
            requestAnimationFrame(() => recalculateNotebook());

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

    flow.addEventListener('paste', (event) => {
        if (state.mode !== 'edit') return;
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        document.execCommand('insertText', false, text);
    });

    flow.addEventListener('drop', (event) => event.preventDefault());

    flow.addEventListener('input', () => {
        if (state.mode !== 'edit') return;
        const candidate = normalizeBody(flow.innerText || '');
        requestAnimationFrame(() => {
            const pages = getEndPage();
            if (candidate.length > MAX_CHARACTERS || pages > MAX_PAGES) {
                flow.textContent = state.lastValidBody;
                state.body = state.lastValidBody;
                notebookStatus.textContent = t('This notebook has reached its last page.');
                requestAnimationFrame(() => recalculateNotebook({followCaret: false}));
                return;
            }

            state.body = candidate;
            state.lastValidBody = candidate;
            notebookStatus.textContent = '';
            recalculateNotebook({followCaret: true});
            saveDraft();
        });
    });

    previousButton?.addEventListener('click', () => {
        if (state.currentSpread <= 0) return;
        state.currentSpread -= 1;
        updateNotebookPosition('previous');
        if (state.mode === 'edit') saveDraft();
    });

    nextButton?.addEventListener('click', () => {
        const maximumSpread = Math.max(0, Math.ceil(state.usedPages / 2) - 1);
        if (state.currentSpread >= maximumSpread) return;
        state.currentSpread += 1;
        updateNotebookPosition('next');
        if (state.mode === 'edit') saveDraft();
    });

    createButton?.addEventListener('click', openEditor);
    document.querySelector('[data-close-viewer]')?.addEventListener('click', closeViewer);

    document.querySelector('[data-nevermind]')?.addEventListener('click', () => showModalSection(discardDialog));
    document.querySelector('[data-cancel-discard]')?.addEventListener('click', () => showModalSection(notebookModal));
    document.querySelector('[data-confirm-discard]')?.addEventListener('click', () => {
        localStorage.removeItem(DRAFT_KEY);
        state.body = '';
        state.lastValidBody = '';
        state.currentSpread = 0;
        flow.textContent = '';
        closeModalLayer();
        showToast(t('The unfinished notebook was discarded.'));
    });

    const resetTurnstile = () => {
        state.captchaToken = '';
        captchaContinue.disabled = true;
        if (state.turnstileWidgetId !== null && window.turnstile) {
            window.turnstile.reset(state.turnstileWidgetId);
        }
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
            if (attempt < 30) {
                window.setTimeout(() => renderTurnstile(attempt + 1), 150);
            } else {
                captchaMessage.textContent = t('The CAPTCHA could not be loaded.');
            }
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
        state.body = normalizeBody(flow.innerText || '');
        if (state.body.trim() === '') {
            notebookStatus.textContent = t('Write something before publishing.');
            flow.focus();
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
        designerPreview.value = (state.body.replace(/\s+/g, ' ').trim().slice(0, 220));
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
        preview: designerPreview.value.trim(),
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
        if (!values.preview) {
            designerMessage.textContent = t('Add a short preview to the post-it.');
            designerPreview.focus();
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
                    body: state.body,
                    color: values.color,
                    x,
                    y,
                }),
            });

            state.notes.push(payload.note);
            state.nextNumber = Math.max(state.nextNumber + 1, Number(payload.note.number) + 1);
            state.publishToken = '';
            localStorage.removeItem(DRAFT_KEY);
            state.body = '';
            state.lastValidBody = '';
            flow.textContent = '';
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
        if (!notebookModal.hidden && state.mode === 'view') closeViewer();
    });

    loadWall();
})();
