(() => {
    'use strict';

    const t = (value) => window.rafabruI18n?.t(value) || value;
    const isPortuguese = () => document.documentElement.lang === 'pt-BR';
    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${remainder}`;
    };

    let zIndex = 16000;
    const windows = new Map();

    const bringToFront = (popup) => {
        zIndex += 1;
        popup.style.zIndex = String(zIndex);
    };

    const storageKey = (kind) => `rafabru_popup_position_${kind}`;
    const readPosition = (kind) => {
        try {
            const value = JSON.parse(localStorage.getItem(storageKey(kind)) || 'null');
            return value && Number.isFinite(value.left) && Number.isFinite(value.top) ? value : null;
        } catch (_) {
            return null;
        }
    };

    const savePosition = (kind, popup) => {
        if (popup.classList.contains('site-popup--maximized')) return;
        const rect = popup.getBoundingClientRect();
        try {
            localStorage.setItem(storageKey(kind), JSON.stringify({left: rect.left, top: rect.top}));
        } catch (_) {
            // Position persistence is decorative.
        }
    };

    const clampPopup = (popup, left, top) => {
        const width = popup.offsetWidth || 600;
        const titlebarHeight = 30;
        return {
            left: Math.min(Math.max(4, left), Math.max(4, window.innerWidth - Math.min(width, 160))),
            top: Math.min(Math.max(4, top), Math.max(4, window.innerHeight - titlebarHeight)),
        };
    };

    const setPopupPosition = (popup, left, top) => {
        const next = clampPopup(popup, left, top);
        popup.style.left = `${Math.round(next.left)}px`;
        popup.style.top = `${Math.round(next.top)}px`;
        popup.style.right = 'auto';
        popup.style.bottom = 'auto';
    };

    const makeDraggable = (popup, kind, titlebar) => {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let pointerId = null;

        titlebar.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || event.target.closest('[data-popup-control]')) return;
            if (popup.classList.contains('site-popup--maximized')) return;
            const rect = popup.getBoundingClientRect();
            dragging = true;
            pointerId = event.pointerId;
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;
            titlebar.setPointerCapture(pointerId);
            bringToFront(popup);
            event.preventDefault();
        });

        titlebar.addEventListener('pointermove', (event) => {
            if (!dragging || event.pointerId !== pointerId) return;
            setPopupPosition(popup, event.clientX - offsetX, event.clientY - offsetY);
        });

        const finish = (event) => {
            if (!dragging || event.pointerId !== pointerId) return;
            dragging = false;
            if (titlebar.hasPointerCapture(pointerId)) titlebar.releasePointerCapture(pointerId);
            pointerId = null;
            savePosition(kind, popup);
        };
        titlebar.addEventListener('pointerup', finish);
        titlebar.addEventListener('pointercancel', finish);
    };

    const popupLabel = (kind) => {
        if (kind === 'music') return isPortuguese() ? '♫ rádio e músicas' : '♫ radio & music';
        return isPortuguese() ? '▣ atalhos' : '▣ shortcuts';
    };

    const createPopup = (kind) => {
        const popup = document.createElement('section');
        popup.className = `site-popup site-popup--${kind} window`;
        popup.dataset.sitePopup = kind;
        popup.hidden = true;
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', popupLabel(kind));

        const titlebar = document.createElement('header');
        titlebar.className = 'titlebar site-popup__titlebar';

        const title = document.createElement('span');
        title.className = 'site-popup__title';
        title.textContent = popupLabel(kind);

        const controls = document.createElement('span');
        controls.className = 'site-popup__controls';
        const minimize = document.createElement('button');
        minimize.type = 'button';
        minimize.dataset.popupControl = 'minimize';
        minimize.className = 'site-popup__control';
        minimize.textContent = '_';
        minimize.setAttribute('aria-label', t('Minimize'));
        const maximize = document.createElement('button');
        maximize.type = 'button';
        maximize.dataset.popupControl = 'maximize';
        maximize.className = 'site-popup__control';
        maximize.textContent = '□';
        maximize.setAttribute('aria-label', t('Maximize'));
        const close = document.createElement('button');
        close.type = 'button';
        close.dataset.popupControl = 'close';
        close.className = 'site-popup__control';
        close.textContent = '×';
        close.setAttribute('aria-label', t('Close'));
        controls.append(minimize, maximize, close);
        titlebar.append(title, controls);

        const body = document.createElement('div');
        body.className = 'site-popup__body';
        popup.append(titlebar, body);
        document.body.appendChild(popup);

        makeDraggable(popup, kind, titlebar);
        popup.addEventListener('pointerdown', () => bringToFront(popup));

        minimize.addEventListener('click', () => {
            popup.classList.toggle('site-popup--collapsed');
            minimize.textContent = popup.classList.contains('site-popup--collapsed') ? '▴' : '_';
            bringToFront(popup);
        });

        maximize.addEventListener('click', () => {
            if (!popup.classList.contains('site-popup--maximized')) {
                const rect = popup.getBoundingClientRect();
                popup.dataset.restoreLeft = String(rect.left);
                popup.dataset.restoreTop = String(rect.top);
                popup.classList.add('site-popup--maximized');
            } else {
                popup.classList.remove('site-popup--maximized');
                setPopupPosition(
                    popup,
                    Number(popup.dataset.restoreLeft) || 40,
                    Number(popup.dataset.restoreTop) || 80
                );
            }
            bringToFront(popup);
        });

        close.addEventListener('click', () => closePopup(kind, true));
        windows.set(kind, {popup, body, titlebar});
        return windows.get(kind);
    };

    const setToolbarActive = (kind, active) => {
        document.querySelectorAll(`[data-site-window-target="${kind}"], .toolbar-menu-link[href^="/${kind}/"]`).forEach((link) => {
            link.classList.toggle('toolbar-menu-link--active', active);
        });
    };

    const writePopupToHistory = (kind = '') => {
        const url = new URL(window.location.href);
        if (kind) url.searchParams.set('popup', kind);
        else url.searchParams.delete('popup');
        history.pushState({popup: kind}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    const openPopup = (kind, updateHistory = true) => {
        const entry = windows.get(kind);
        if (!entry) return;
        const {popup} = entry;
        popup.hidden = false;
        popup.classList.remove('site-popup--collapsed');
        const stored = readPosition(kind);
        if (!popup.dataset.positioned) {
            const defaultLeft = kind === 'music' ? Math.max(26, (window.innerWidth - popup.offsetWidth) / 2) : 84;
            const defaultTop = kind === 'music' ? 86 : 122;
            setPopupPosition(popup, stored?.left ?? defaultLeft, stored?.top ?? defaultTop);
            popup.dataset.positioned = 'true';
        }
        bringToFront(popup);
        setToolbarActive(kind, true);
        if (updateHistory) writePopupToHistory(kind);
    };

    const closePopup = (kind, updateHistory = false) => {
        const entry = windows.get(kind);
        if (!entry) return;
        entry.popup.hidden = true;
        setToolbarActive(kind, false);
        if (updateHistory) {
            const url = new URL(window.location.href);
            if (url.searchParams.get('popup') === kind) writePopupToHistory('');
        }
    };

    const hashSlug = (value) => {
        let hash = 2166136261;
        for (const character of value) {
            hash ^= character.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    };

    const buildLinksWindow = (data) => {
        const {body} = createPopup('links');
        body.classList.add('site-popup__body--links');

        const intro = document.createElement('p');
        intro.className = 'site-popup__intro';
        intro.textContent = isPortuguese()
            ? 'Todos os redirecionamentos públicos aparecem aqui automaticamente.'
            : 'Every public redirect appears here automatically.';

        const cloudWindow = document.createElement('section');
        cloudWindow.className = 'window redirect-cloud-window site-popup__cloud-window';
        const header = document.createElement('header');
        header.className = 'titlebar';
        const headerText = document.createElement('span');
        headerText.textContent = popupLabel('links');
        header.appendChild(headerText);
        const cloud = document.createElement('div');
        cloud.className = 'redirect-cloud site-popup__redirect-cloud';

        const redirects = Array.isArray(data.redirects) ? data.redirects : [];
        if (!redirects.length) {
            const empty = document.createElement('div');
            empty.className = 'redirect-cloud__empty';
            empty.textContent = t('No redirects have been created.');
            cloud.appendChild(empty);
        } else {
            redirects.forEach((shortcut, index) => {
                const slug = String(shortcut.slug || '');
                const hash = hashSlug(slug);
                const x = 8 + (hash % 85);
                const y = 8 + (Math.floor(hash / 97) % 85);
                const rotation = ((hash % 901) / 100) - 4.5;
                const link = document.createElement('a');
                link.className = 'redirect-shortcut window';
                link.href = String(shortcut.href || `/${encodeURIComponent(slug)}`);
                link.textContent = `/${slug}`;
                link.dataset.i18nSkip = '';
                link.style.setProperty('--x', `${x}%`);
                link.style.setProperty('--y', `${y}%`);
                link.style.setProperty('--r', `${rotation.toFixed(2)}deg`);
                link.style.setProperty('--z', String(2 + (index % 60)));
                cloud.appendChild(link);
            });
        }

        cloudWindow.append(header, cloud);
        body.append(intro, cloudWindow);
    };

    const buildMusicWindow = (controller) => {
        const {body} = createPopup('music');
        body.classList.add('site-popup__body--music');

        const library = document.createElement('section');
        library.className = 'radio-library site-popup__radio-library';
        library.setAttribute('aria-label', isPortuguese() ? 'Biblioteca de música' : 'Music library');
        library.innerHTML = `
            <div class="radio-library__deck">
                <div class="radio-library__bezel">
                    <div class="radio-library__screen">
                        <div class="radio-library__status">
                            <span>${isPortuguese() ? 'TOCANDO AGORA' : 'NOW PLAYING'}</span>
                            <span class="radio-library__stereo">STEREO</span>
                            <span data-popup-track-number>TRACK --</span>
                        </div>
                        <div class="radio-library__track-window">
                            <span class="radio-library__track-name" data-popup-track-title data-i18n-skip></span>
                        </div>
                        <div class="radio-library__timeline">
                            <input class="player-range" type="range" min="0" max="1000" value="0" data-popup-progress aria-label="${t('Song position')}">
                            <span class="radio-library__time" data-popup-time>0:00 / 0:00</span>
                        </div>
                    </div>
                </div>
                <div class="radio-library__controls">
                    <button class="radio-library__button" type="button" data-popup-previous aria-label="${t('Previous song')}">◀◀</button>
                    <button class="radio-library__button" type="button" data-popup-play aria-label="${t('Play music')}">▶</button>
                    <button class="radio-library__button" type="button" data-popup-next aria-label="${t('Next song')}">▶▶</button>
                    <input class="player-range" type="range" min="0" max="100" step="1" data-popup-volume aria-label="${t('Music volume')}">
                    <output class="radio-library__volume-output" data-popup-volume-output>0%</output>
                </div>
            </div>
            <section class="window library-playlist">
                <header class="titlebar"><span>${isPortuguese() ? '♫ lista de músicas' : '♫ playlist'}</span></header>
                <div class="library-playlist__body" data-popup-playlist></div>
            </section>
        `;
        body.appendChild(library);

        const title = library.querySelector('[data-popup-track-title]');
        const number = library.querySelector('[data-popup-track-number]');
        const time = library.querySelector('[data-popup-time]');
        const progress = library.querySelector('[data-popup-progress]');
        const volume = library.querySelector('[data-popup-volume]');
        const volumeOutput = library.querySelector('[data-popup-volume-output]');
        const play = library.querySelector('[data-popup-play]');
        const previous = library.querySelector('[data-popup-previous]');
        const next = library.querySelector('[data-popup-next]');
        const playlistRoot = library.querySelector('[data-popup-playlist]');
        const rows = [];
        let seeking = false;

        controller.playlist.forEach((track, index) => {
            const row = document.createElement('article');
            row.className = 'library-track';
            row.dataset.trackIndex = String(index);
            const trackNumber = document.createElement('span');
            trackNumber.className = 'library-track__number';
            trackNumber.textContent = String(index + 1).padStart(2, '0');
            const trackTitle = document.createElement('strong');
            trackTitle.className = 'library-track__title';
            trackTitle.textContent = track.title;
            trackTitle.dataset.i18nSkip = '';
            const playButton = document.createElement('button');
            playButton.className = 'track-action';
            playButton.type = 'button';
            playButton.dataset.popupRowPlay = '';
            playButton.textContent = isPortuguese() ? 'Tocar' : 'Play';
            const download = document.createElement('a');
            download.className = 'track-action';
            download.href = track.download;
            download.download = '';
            download.textContent = isPortuguese() ? 'Baixar' : 'Download';
            row.append(trackNumber, trackTitle, playButton, download);
            playlistRoot.appendChild(row);
            rows.push(row);

            playButton.addEventListener('click', () => {
                const state = controller.snapshot();
                if (state.index === index && state.playing) controller.pause();
                else controller.play(index);
            });
        });

        if (!controller.playlist.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = t('no music available');
            playlistRoot.appendChild(empty);
        }

        const refreshMarquee = () => {
            if (!title?.parentElement) return;
            title.classList.remove('is-scrolling');
            title.style.removeProperty('--library-scroll-distance');
            requestAnimationFrame(() => {
                const distance = Math.max(0, title.scrollWidth - title.parentElement.clientWidth + 6);
                if (distance > 4) {
                    title.style.setProperty('--library-scroll-distance', `${distance}px`);
                    title.classList.add('is-scrolling');
                }
            });
        };

        const update = (state = controller.snapshot()) => {
            const track = state.track;
            if (title) {
                title.textContent = !track
                    ? t('no music available')
                    : state.started
                        ? track.title
                        : t('press play to start');
            }
            if (number) number.textContent = track ? `TRACK ${String(state.index + 1).padStart(2, '0')}` : 'TRACK --';
            if (time) time.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
            if (progress && !seeking) {
                progress.value = state.duration > 0 ? String(Math.round((state.currentTime / state.duration) * 1000)) : '0';
                progress.disabled = !track;
            }
            if (volume) volume.value = String(Math.round(state.volume * 100));
            if (volumeOutput) volumeOutput.textContent = `${Math.round(state.volume * 100)}%`;
            if (play) {
                play.textContent = state.playing ? 'Ⅱ' : '▶';
                play.disabled = !track;
                play.setAttribute('aria-label', t(state.playing ? 'Pause music' : 'Play music'));
            }
            if (previous) previous.disabled = !track;
            if (next) next.disabled = !track;
            rows.forEach((row, index) => {
                row.classList.toggle('is-active', index === state.index);
                const button = row.querySelector('[data-popup-row-play]');
                if (button) button.textContent = index === state.index && state.playing
                    ? (isPortuguese() ? 'Pausar' : 'Pause')
                    : (isPortuguese() ? 'Tocar' : 'Play');
            });
            refreshMarquee();
        };

        play?.addEventListener('click', () => controller.toggle());
        previous?.addEventListener('click', () => controller.previous());
        next?.addEventListener('click', () => controller.next());
        volume?.addEventListener('input', () => controller.setVolume(Number(volume.value) / 100));
        progress?.addEventListener('input', () => {
            seeking = true;
            const state = controller.snapshot();
            const preview = state.duration > 0 ? (Number(progress.value) / 1000) * state.duration : 0;
            if (time) time.textContent = `${formatTime(preview)} / ${formatTime(state.duration)}`;
        });
        progress?.addEventListener('change', () => {
            controller.seekRatio(Number(progress.value) / 1000);
            seeking = false;
        });
        controller.addEventListener('statechange', (event) => update(event.detail));
        update();
    };

    const buildResumePrompt = (controller) => {
        const prompt = document.createElement('button');
        prompt.type = 'button';
        prompt.className = 'site-audio-resume window';
        prompt.hidden = true;
        prompt.textContent = isPortuguese() ? '♫ clique para retomar a música' : '♫ click to resume music';
        prompt.addEventListener('click', () => controller.play());
        document.body.appendChild(prompt);

        const update = (state = controller.snapshot()) => {
            prompt.hidden = !state.needsResume;
        };
        controller.addEventListener('statechange', (event) => update(event.detail));
        update();
    };

    const bindToolbar = () => {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-site-window-target], .toolbar-menu-link[href^="/music/"], .toolbar-menu-link[href^="/links/"]');
            if (!link) return;
            const kind = link.dataset.siteWindowTarget
                || (link.getAttribute('href') || '').replace(/^\//, '').split('/')[0];
            if (!windows.has(kind)) return;
            event.preventDefault();
            openPopup(kind, true);
        });
    };

    const syncFromUrl = () => {
        const requested = new URL(window.location.href).searchParams.get('popup');
        if (requested === 'music' || requested === 'links') openPopup(requested, false);
        else {
            closePopup('music', false);
            closePopup('links', false);
        }
    };

    const initialize = (controller) => {
        buildLinksWindow(window.rafabruSiteData || {});
        buildMusicWindow(controller);
        buildResumePrompt(controller);
        bindToolbar();
        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        window.addEventListener('resize', () => {
            windows.forEach(({popup}) => {
                if (popup.hidden || popup.classList.contains('site-popup--maximized')) return;
                const rect = popup.getBoundingClientRect();
                setPopupPosition(popup, rect.left, rect.top);
            });
        });
    };

    if (window.rafabruAudio) initialize(window.rafabruAudio);
    else window.addEventListener('rafabru-audio-ready', (event) => initialize(event.detail), {once: true});
})();
