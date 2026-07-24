(() => {
    const root = document.querySelector('[data-player]');
    if (!root) return;

    const playlist = JSON.parse(root.dataset.playlist || '[]');
    const mode = root.dataset.mode === 'random' ? 'random' : 'sequential';
    const volume = Math.min(1, Math.max(0, Number(root.dataset.volume || 0.45)));
    const audio = new Audio();
    const name = root.querySelector('[data-now-playing]');
    const playButton = root.querySelector('[data-play]');
    const nextButton = root.querySelector('[data-next]');
    const dialog = document.querySelector('[data-music-dialog]');
    const acceptButton = dialog?.querySelector('[data-music-accept]');
    const declineButton = dialog?.querySelector('[data-music-decline]');
    let index = 0;

    audio.preload = 'metadata';
    audio.volume = volume;

    const setStatus = (text) => {
        if (name) name.textContent = text;
    };

    const setButtons = (enabled) => {
        if (playButton) playButton.disabled = !enabled;
        if (nextButton) nextButton.disabled = !enabled;
    };

    const chooseRandomIndex = () => {
        if (playlist.length <= 1) return 0;
        let next = index;
        while (next === index) next = Math.floor(Math.random() * playlist.length);
        return next;
    };

    const loadTrack = (nextIndex) => {
        if (!playlist.length) return;
        index = ((nextIndex % playlist.length) + playlist.length) % playlist.length;
        const track = playlist[index];
        audio.src = track.src;
        setStatus(track.title || 'untitled song');
    };

    const play = async () => {
        if (!playlist.length) return;
        if (!audio.src) loadTrack(index);

        try {
            await audio.play();
            if (playButton) {
                playButton.textContent = 'Ⅱ';
                playButton.setAttribute('aria-label', 'Pause music');
            }
            localStorage.setItem('rafabru_music_choice', 'play');
        } catch (error) {
            setStatus('press play to start');
        }
    };

    const pause = () => {
        audio.pause();
        if (playButton) {
            playButton.textContent = '▶';
            playButton.setAttribute('aria-label', 'Play music');
        }
    };

    const next = async () => {
        if (!playlist.length) return;
        loadTrack(mode === 'random' ? chooseRandomIndex() : index + 1);
        await play();
    };

    if (!playlist.length) {
        setStatus('no music available');
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
    audio.addEventListener('error', () => {
        setStatus('this song could not be played');
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

    if (savedChoice === 'play') {
        play();
    }
})();
