(() => {
    'use strict';

    const root = document.querySelector('[data-music-library]');
    if (!root) return;

    const playlist = JSON.parse(root.dataset.playlist || '[]');
    const configuredVolume = Math.min(1, Math.max(0, Number(root.dataset.volume || 0.45)));
    const storedVolume = Number(localStorage.getItem('rafabru_music_volume'));
    const audio = new Audio();
    const title = root.querySelector('[data-library-title]');
    const number = root.querySelector('[data-library-number]');
    const time = root.querySelector('[data-library-time]');
    const progress = root.querySelector('[data-library-progress]');
    const volume = root.querySelector('[data-library-volume]');
    const volumeOutput = root.querySelector('[data-library-volume-output]');
    const play = root.querySelector('[data-library-main-play]');
    const previous = root.querySelector('[data-library-previous]');
    const next = root.querySelector('[data-library-next]');
    const rows = Array.from(root.querySelectorAll('[data-track-index]'));

    let currentIndex = 0;
    let started = false;
    let seeking = false;

    audio.preload = 'metadata';
    audio.volume = Number.isFinite(storedVolume)
        ? Math.min(1, Math.max(0, storedVolume))
        : configuredVolume;

    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${remainder}`;
    };

    const updateScroll = () => {
        if (!title) return;
        requestAnimationFrame(() => {
            title.classList.remove('is-scrolling');
            title.style.removeProperty('--library-scroll-distance');
            const distance = Math.max(0, title.scrollWidth - title.parentElement.clientWidth + 6);
            if (distance > 4) {
                title.style.setProperty('--library-scroll-distance', `${distance}px`);
                title.classList.add('is-scrolling');
            }
        });
    };

    const updateRows = () => {
        rows.forEach((row, index) => {
            row.classList.toggle('is-active', index === currentIndex);
            const button = row.querySelector('[data-library-row-play]');
            if (button) button.textContent = index === currentIndex && !audio.paused ? 'Pause' : 'Play';
        });
    };

    const updateDisplay = () => {
        const track = playlist[currentIndex];
        if (!track) {
            if (title) title.textContent = 'no music available';
            if (number) number.textContent = 'TRACK --';
            return;
        }

        if (title) title.textContent = started ? track.title : 'press play to start';
        if (number) number.textContent = `TRACK ${String(currentIndex + 1).padStart(2, '0')}`;
        updateScroll();
        updateRows();
    };

    const updateTime = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        if (time) time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
        if (progress && !seeking) progress.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : '0';
    };

    const loadTrack = (index) => {
        if (!playlist.length) return;
        currentIndex = (index + playlist.length) % playlist.length;
        audio.src = playlist[currentIndex].src;
        audio.load();
        updateTime();
        updateDisplay();
    };

    const startPlayback = async () => {
        if (!playlist.length) return;
        if (!audio.src) loadTrack(currentIndex);
        try {
            await audio.play();
            started = true;
            if (play) play.textContent = 'Ⅱ';
            updateDisplay();
        } catch (_) {
            if (title) title.textContent = 'this song could not be played';
        }
    };

    const togglePlayback = async () => {
        if (audio.paused) await startPlayback();
        else audio.pause();
    };

    play?.addEventListener('click', togglePlayback);
    previous?.addEventListener('click', async () => {
        loadTrack(currentIndex - 1);
        if (started) await startPlayback();
    });
    next?.addEventListener('click', async () => {
        loadTrack(currentIndex + 1);
        if (started) await startPlayback();
    });

    rows.forEach((row, index) => {
        row.querySelector('[data-library-row-play]')?.addEventListener('click', async () => {
            if (currentIndex === index && !audio.paused) {
                audio.pause();
                return;
            }
            loadTrack(index);
            await startPlayback();
        });
    });

    volume?.addEventListener('input', () => {
        const nextVolume = Math.min(100, Math.max(0, Number(volume.value) || 0));
        audio.volume = nextVolume / 100;
        if (volumeOutput) volumeOutput.textContent = `${nextVolume}%`;
        localStorage.setItem('rafabru_music_volume', String(audio.volume));
    });

    progress?.addEventListener('input', () => {
        seeking = true;
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const preview = (Number(progress.value) / 1000) * audio.duration;
        if (time) time.textContent = `${formatTime(preview)} / ${formatTime(audio.duration)}`;
    });

    progress?.addEventListener('change', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
        }
        seeking = false;
        updateTime();
    });

    audio.addEventListener('play', () => {
        if (play) play.textContent = 'Ⅱ';
        updateRows();
    });
    audio.addEventListener('pause', () => {
        if (play) play.textContent = '▶';
        updateRows();
    });
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('durationchange', updateTime);
    audio.addEventListener('ended', async () => {
        loadTrack(currentIndex + 1);
        await startPlayback();
    });

    if (volume) volume.value = String(Math.round(audio.volume * 100));
    if (volumeOutput) volumeOutput.textContent = `${Math.round(audio.volume * 100)}%`;

    if (!playlist.length) {
        [play, previous, next, progress, volume].forEach((control) => { if (control) control.disabled = true; });
    } else {
        loadTrack(0);
    }
})();
