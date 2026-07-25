(() => {
    'use strict';

    const root = document.querySelector('[data-player]');
    if (!root) return;

    const t = (text) => window.rafabruI18n?.t(text) || text;
    const body = root.querySelector('.music-panel__body');
    const nowPlaying = root.querySelector('.now-playing');
    const label = root.querySelector('.now-playing__label');
    const name = root.querySelector('[data-now-playing]');
    const playButton = root.querySelector('[data-play]');
    const nextButton = root.querySelector('[data-next]');
    const controls = root.querySelector('.player-controls');
    const dialog = document.querySelector('[data-music-dialog]');
    const acceptButton = dialog?.querySelector('[data-music-accept]');
    const declineButton = dialog?.querySelector('[data-music-decline]');

    let trackNumber = null;
    let trackWindow = null;
    let seeking = false;
    let attached = false;

    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${remainder}`;
    };

    const progress = document.createElement('input');
    progress.className = 'player-range player-progress';
    progress.type = 'range';
    progress.min = '0';
    progress.max = '1000';
    progress.value = '0';
    progress.disabled = true;
    progress.setAttribute('aria-label', t('Song position'));

    const time = document.createElement('span');
    time.className = 'player-time';
    time.textContent = '0:00 / 0:00';

    const volume = document.createElement('input');
    volume.className = 'player-range';
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.step = '1';
    volume.value = '45';
    volume.setAttribute('aria-label', t('Music volume'));

    const volumeOutput = document.createElement('output');
    volumeOutput.textContent = '45%';

    if (body && nowPlaying && label && name && controls) {
        const display = document.createElement('div');
        display.className = 'player-display';
        const bezel = document.createElement('div');
        bezel.className = 'radio-bezel';
        const screen = document.createElement('div');
        screen.className = 'radio-screen';
        const header = document.createElement('div');
        header.className = 'radio-screen__header';
        const stereo = document.createElement('span');
        stereo.className = 'radio-stereo';
        stereo.textContent = 'STEREO';
        trackNumber = document.createElement('span');
        trackNumber.className = 'radio-track-number';
        trackNumber.textContent = 'TRACK --';
        label.classList.add('radio-now-playing-label');
        header.append(label, stereo, trackNumber);
        trackWindow = document.createElement('div');
        trackWindow.className = 'radio-track-window';
        trackWindow.append(name);
        const timeline = document.createElement('div');
        timeline.className = 'player-timeline';
        timeline.append(progress, time);
        screen.append(header, trackWindow, timeline);
        bezel.append(screen);
        display.append(bezel);

        const transport = document.createElement('div');
        transport.className = 'player-transport';
        const volumeLabel = document.createElement('label');
        volumeLabel.className = 'player-volume';
        volumeLabel.innerHTML = '<span class="player-volume__icon" aria-hidden="true">VOL</span>';
        volumeLabel.append(volume, volumeOutput);
        transport.append(controls, volumeLabel);
        body.replaceChildren(display, transport);
    }

    const refreshMarquee = () => {
        if (!name || !trackWindow) return;
        name.classList.remove('is-scrolling');
        name.style.removeProperty('--radio-scroll-distance');
        requestAnimationFrame(() => {
            const overflow = Math.max(0, name.scrollWidth - trackWindow.clientWidth);
            if (overflow > 6) {
                name.style.setProperty('--radio-scroll-distance', `${overflow + 26}px`);
                name.classList.add('is-scrolling');
            }
        });
    };

    const setStatus = (text, translateText = false) => {
        if (!name) return;
        name.textContent = translateText ? t(text) : text;
        refreshMarquee();
    };

    const attach = (controller) => {
        if (attached || !controller) return;
        attached = true;

        const update = (state = controller.snapshot()) => {
            const track = state.track;
            if (!track) setStatus('no music available', true);
            else if (!state.started) setStatus('press play to start', true);
            else setStatus(track.title || t('untitled song'));

            if (trackNumber) {
                trackNumber.textContent = track ? `TRACK ${String(state.index + 1).padStart(2, '0')}` : 'TRACK --';
            }
            if (!seeking) {
                progress.value = state.duration > 0
                    ? String(Math.round((state.currentTime / state.duration) * 1000))
                    : '0';
            }
            time.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
            volume.value = String(Math.round(state.volume * 100));
            volumeOutput.textContent = `${Math.round(state.volume * 100)}%`;

            if (playButton) {
                playButton.disabled = !track;
                playButton.textContent = state.playing ? 'Ⅱ' : '▶';
                playButton.setAttribute('aria-label', t(state.playing ? 'Pause music' : 'Play music'));
            }
            if (nextButton) nextButton.disabled = !track;
            progress.disabled = !track;
            volume.disabled = !track;
        };

        playButton?.addEventListener('click', () => controller.toggle());
        nextButton?.addEventListener('click', () => controller.next());
        volume.addEventListener('input', () => controller.setVolume(Number(volume.value) / 100));
        progress.addEventListener('input', () => {
            seeking = true;
            const state = controller.snapshot();
            const previewTime = state.duration > 0 ? (Number(progress.value) / 1000) * state.duration : 0;
            time.textContent = `${formatTime(previewTime)} / ${formatTime(state.duration)}`;
        });
        progress.addEventListener('change', () => {
            controller.seekRatio(Number(progress.value) / 1000);
            seeking = false;
        });

        acceptButton?.addEventListener('click', async () => {
            if (dialog) dialog.hidden = true;
            await controller.play();
        });
        declineButton?.addEventListener('click', () => {
            if (dialog) dialog.hidden = true;
            controller.pause();
        });

        controller.addEventListener('statechange', (event) => update(event.detail));
        update();

        const savedChoice = localStorage.getItem('rafabru_music_choice');
        if (dialog) dialog.hidden = savedChoice !== null || !controller.playlist.length;
    };

    if (window.rafabruAudio) attach(window.rafabruAudio);
    else window.addEventListener('rafabru-audio-ready', (event) => attach(event.detail), {once: true});
})();
