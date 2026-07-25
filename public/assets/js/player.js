(() => {
    'use strict';

    const root = document.querySelector('[data-player]');
    if (!root) return;

    const t = (text) => window.rafabruI18n?.t(text) || text;
    const playlist = JSON.parse(root.dataset.playlist || '[]');
    const mode = root.dataset.mode === 'random' ? 'random' : 'sequential';
    const configuredVolume = Math.min(1, Math.max(0, Number(root.dataset.volume || 0.45)));
    const storedVolume = Number(localStorage.getItem('rafabru_music_volume'));
    const initialVolume = Number.isFinite(storedVolume)
        ? Math.min(1, Math.max(0, storedVolume))
        : configuredVolume;

    const audio = new Audio();
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

    let index = 0;
    let hasStartedPlayback = false;
    let isSeeking = false;
    let trackNumber = null;
    let trackWindow = null;

    audio.preload = 'metadata';
    audio.volume = initialVolume;

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
    progress.setAttribute('aria-label', 'Song position');

    const time = document.createElement('span');
    time.className = 'player-time';
    time.textContent = '0:00 / 0:00';

    const volume = document.createElement('input');
    volume.className = 'player-range';
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.step = '1';
    volume.value = String(Math.round(initialVolume * 100));
    volume.setAttribute('aria-label', 'Music volume');

    const volumeOutput = document.createElement('output');
    volumeOutput.textContent = `${volume.value}%`;

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
        trackNumber.textContent = 'TRACK 01';

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

    const setButtons = (enabled) => {
        if (playButton) playButton.disabled = !enabled;
        if (nextButton) nextButton.disabled = !enabled;
        progress.disabled = !enabled;
        volume.disabled = !enabled;
    };

    const currentTrack = () => playlist[index] || null;

    const updateTrackNumber = () => {
        if (!trackNumber) return;
        trackNumber.textContent = `TRACK ${String(index + 1).padStart(2, '0')}`;
    };

    const updateDisplayedTrack = () => {
        const track = currentTrack();
        if (!track) {
            setStatus('no music available', true);
            return;
        }
        if (!hasStartedPlayback) {
            setStatus('press play to start', true);
            return;
        }
        setStatus(track.title || t('untitled song'));
    };

    const updateTime = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        if (!isSeeking) {
            progress.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : '0';
        }
        time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    };

    const updatePlayButton = () => {
        if (!playButton) return;
        const playing = !audio.paused && !audio.ended;
        playButton.textContent = playing ? 'Ⅱ' : '▶';
        playButton.setAttribute('aria-label', t(playing ? 'Pause music' : 'Play music'));
    };

    const chooseRandomIndex = () => {
        if (playlist.length <= 1) return 0;
        let nextIndex = index;
        while (nextIndex === index) nextIndex = Math.floor(Math.random() * playlist.length);
        return nextIndex;
    };

    const loadTrack = (nextIndex) => {
        if (!playlist.length) return;
        index = ((nextIndex % playlist.length) + playlist.length) % playlist.length;
        const track = currentTrack();
        audio.src = track.src;
        progress.value = '0';
        time.textContent = '0:00 / 0:00';
        updateTrackNumber();
        updateDisplayedTrack();
    };

    const play = async () => {
        if (!playlist.length) return;
        if (!audio.src) loadTrack(index);

        try {
            await audio.play();
            hasStartedPlayback = true;
            updateDisplayedTrack();
            updatePlayButton();
            localStorage.setItem('rafabru_music_choice', 'play');
        } catch (_) {
            setStatus('press play to start', true);
            updatePlayButton();
        }
    };

    const pause = () => {
        audio.pause();
        updatePlayButton();
        updateDisplayedTrack();
    };

    const next = async () => {
        if (!playlist.length) return;
        loadTrack(mode === 'random' ? chooseRandomIndex() : index + 1);
        if (hasStartedPlayback) await play();
    };

    volume.addEventListener('input', () => {
        const nextVolume = Math.min(1, Math.max(0, Number(volume.value) / 100));
        audio.volume = nextVolume;
        volumeOutput.textContent = `${volume.value}%`;
        localStorage.setItem('rafabru_music_volume', String(nextVolume));
    });

    progress.addEventListener('input', () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        isSeeking = true;
        const previewTime = (Number(progress.value) / 1000) * audio.duration;
        time.textContent = `${formatTime(previewTime)} / ${formatTime(audio.duration)}`;
    });

    progress.addEventListener('change', () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
            isSeeking = false;
            return;
        }
        audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
        isSeeking = false;
        updateTime();
    });

    if (!playlist.length) {
        setStatus('no music available', true);
        setButtons(false);
        if (dialog) dialog.hidden = true;
        return;
    }

    setButtons(true);
    loadTrack(0);

    playButton?.addEventListener('click', () => {
        if (audio.paused) play();
        else pause();
    });

    nextButton?.addEventListener('click', next);
    audio.addEventListener('ended', next);
    audio.addEventListener('play', () => {
        hasStartedPlayback = true;
        updatePlayButton();
        updateDisplayedTrack();
    });
    audio.addEventListener('pause', updatePlayButton);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateTime);
    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('error', () => {
        setStatus('this song could not be played', true);
        pause();
    });

    acceptButton?.addEventListener('click', async () => {
        if (dialog) dialog.hidden = true;
        await play();
    });

    declineButton?.addEventListener('click', () => {
        if (dialog) dialog.hidden = true;
        localStorage.setItem('rafabru_music_choice', 'pause');
    });

    const savedChoice = localStorage.getItem('rafabru_music_choice');
    if (dialog) dialog.hidden = savedChoice !== null;
    if (savedChoice === 'play') play();
})();