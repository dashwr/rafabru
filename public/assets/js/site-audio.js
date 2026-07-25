(() => {
    'use strict';

    const DATA_URL = '/api/site-data.php';
    const STATE_KEY = 'rafabru_site_audio_state_v1';
    const VOLUME_KEY = 'rafabru_music_volume';
    const CHOICE_KEY = 'rafabru_music_choice';

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
    const parseStoredState = () => {
        try {
            const value = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
            return value && typeof value === 'object' ? value : {};
        } catch (_) {
            return {};
        }
    };

    class RafabruAudioController extends EventTarget {
        constructor(data) {
            super();
            this.playlist = Array.isArray(data?.music?.playlist) ? data.music.playlist : [];
            this.mode = data?.music?.mode === 'random' ? 'random' : 'sequential';
            this.audio = new Audio();
            this.audio.preload = 'metadata';
            this.index = 0;
            this.started = false;
            this.desiredPlaying = false;
            this.needsResume = false;
            this.pendingTime = 0;
            this.seeking = false;
            this.saveTimer = 0;
            this.resumeListenersInstalled = false;

            const stored = parseStoredState();
            const configuredVolume = clamp(Number(data?.music?.volume ?? 0.45), 0, 1);
            const legacyVolume = Number(localStorage.getItem(VOLUME_KEY));
            const storedVolume = Number(stored.volume);
            this.audio.volume = Number.isFinite(legacyVolume)
                ? clamp(legacyVolume, 0, 1)
                : Number.isFinite(storedVolume)
                    ? clamp(storedVolume, 0, 1)
                    : configuredVolume;

            if (this.playlist.length) {
                const storedId = String(stored.trackId || '');
                const restoredIndex = this.playlist.findIndex((track) => String(track.id) === storedId);
                this.index = restoredIndex >= 0
                    ? restoredIndex
                    : clamp(Number(stored.index) || 0, 0, this.playlist.length - 1);
                this.pendingTime = Math.max(0, Number(stored.currentTime) || 0);
                this.desiredPlaying = stored.playing === true
                    || (!Object.keys(stored).length && localStorage.getItem(CHOICE_KEY) === 'play');
                this.started = stored.started === true || this.pendingTime > 0 || this.desiredPlaying;
            }

            this.bindAudioEvents();
            if (this.playlist.length) {
                this.loadTrack(this.index, this.pendingTime, this.desiredPlaying);
            } else {
                this.emit();
            }

            window.addEventListener('pagehide', () => this.save());
            window.addEventListener('beforeunload', () => this.save());
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.save();
            });
        }

        bindAudioEvents() {
            this.audio.addEventListener('loadedmetadata', () => {
                if (this.pendingTime > 0 && Number.isFinite(this.audio.duration)) {
                    this.audio.currentTime = clamp(this.pendingTime, 0, Math.max(0, this.audio.duration - 0.15));
                }
                this.pendingTime = 0;
                this.emit();
                if (this.desiredPlaying) this.tryPlay(true);
            });

            this.audio.addEventListener('timeupdate', () => {
                this.emit();
                window.clearTimeout(this.saveTimer);
                this.saveTimer = window.setTimeout(() => this.save(), 650);
            });
            this.audio.addEventListener('durationchange', () => this.emit());
            this.audio.addEventListener('play', () => {
                this.started = true;
                this.desiredPlaying = true;
                this.needsResume = false;
                this.removeResumeListeners();
                localStorage.setItem(CHOICE_KEY, 'play');
                this.save();
                this.emit();
            });
            this.audio.addEventListener('pause', () => this.emit());
            this.audio.addEventListener('volumechange', () => {
                localStorage.setItem(VOLUME_KEY, String(this.audio.volume));
                this.save();
                this.emit();
            });
            this.audio.addEventListener('ended', async () => {
                this.desiredPlaying = true;
                this.loadTrack(this.nextIndex(), 0, true);
            });
            this.audio.addEventListener('error', () => {
                this.desiredPlaying = false;
                this.needsResume = false;
                this.save();
                this.emit();
            });
        }

        currentTrack() {
            return this.playlist[this.index] || null;
        }

        nextIndex() {
            if (this.playlist.length <= 1) return 0;
            if (this.mode === 'random') {
                let next = this.index;
                while (next === this.index) next = Math.floor(Math.random() * this.playlist.length);
                return next;
            }
            return (this.index + 1) % this.playlist.length;
        }

        previousIndex() {
            if (!this.playlist.length) return 0;
            return (this.index - 1 + this.playlist.length) % this.playlist.length;
        }

        loadTrack(index, currentTime = 0, autoplay = false) {
            if (!this.playlist.length) return;
            this.index = (Number(index) + this.playlist.length) % this.playlist.length;
            this.pendingTime = Math.max(0, Number(currentTime) || 0);
            this.desiredPlaying = autoplay || this.desiredPlaying;
            this.audio.src = this.currentTrack().src;
            this.audio.load();
            this.save();
            this.emit();
        }

        async tryPlay(fromRestore = false) {
            if (!this.playlist.length) return false;
            if (!this.audio.src) this.loadTrack(this.index, this.pendingTime, true);
            this.desiredPlaying = true;
            this.started = true;
            try {
                await this.audio.play();
                return true;
            } catch (_) {
                this.needsResume = true;
                if (!fromRestore) localStorage.setItem(CHOICE_KEY, 'play');
                this.installResumeListeners();
                this.save();
                this.emit();
                return false;
            }
        }

        async play(index = null) {
            if (Number.isInteger(index) && index !== this.index) {
                this.desiredPlaying = true;
                this.started = true;
                this.loadTrack(index, 0, true);
                return true;
            }
            return this.tryPlay(false);
        }

        pause() {
            this.desiredPlaying = false;
            this.needsResume = false;
            this.audio.pause();
            this.removeResumeListeners();
            localStorage.setItem(CHOICE_KEY, 'pause');
            this.save();
            this.emit();
        }

        async toggle() {
            if (!this.audio.paused && !this.audio.ended) {
                this.pause();
                return false;
            }
            return this.play();
        }

        async next() {
            if (!this.playlist.length) return;
            const shouldPlay = this.desiredPlaying || (!this.audio.paused && !this.audio.ended);
            this.loadTrack(this.nextIndex(), 0, shouldPlay);
        }

        async previous() {
            if (!this.playlist.length) return;
            const shouldPlay = this.desiredPlaying || (!this.audio.paused && !this.audio.ended);
            this.loadTrack(this.previousIndex(), 0, shouldPlay);
        }

        seekRatio(ratio) {
            if (!Number.isFinite(this.audio.duration) || this.audio.duration <= 0) return;
            this.audio.currentTime = clamp(Number(ratio) || 0, 0, 1) * this.audio.duration;
            this.save();
            this.emit();
        }

        setVolume(value) {
            this.audio.volume = clamp(Number(value) || 0, 0, 1);
        }

        installResumeListeners() {
            if (this.resumeListenersInstalled) return;
            this.resumeListenersInstalled = true;
            this.resumeFromGesture = async () => {
                const resumed = await this.tryPlay(true);
                if (resumed) this.removeResumeListeners();
            };
            document.addEventListener('pointerdown', this.resumeFromGesture, {capture: true});
            document.addEventListener('keydown', this.resumeFromGesture, {capture: true});
        }

        removeResumeListeners() {
            if (!this.resumeListenersInstalled) return;
            document.removeEventListener('pointerdown', this.resumeFromGesture, {capture: true});
            document.removeEventListener('keydown', this.resumeFromGesture, {capture: true});
            this.resumeListenersInstalled = false;
        }

        snapshot() {
            const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
            const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : this.pendingTime;
            return {
                playlist: this.playlist,
                track: this.currentTrack(),
                index: this.index,
                started: this.started,
                playing: !this.audio.paused && !this.audio.ended,
                desiredPlaying: this.desiredPlaying,
                needsResume: this.needsResume,
                currentTime,
                duration,
                volume: this.audio.volume,
            };
        }

        save() {
            const state = this.snapshot();
            try {
                localStorage.setItem(STATE_KEY, JSON.stringify({
                    trackId: state.track?.id || '',
                    index: state.index,
                    currentTime: state.currentTime,
                    volume: state.volume,
                    playing: state.desiredPlaying,
                    started: state.started,
                    updatedAt: Date.now(),
                }));
            } catch (_) {
                // Playback still works when storage is unavailable.
            }
        }

        emit() {
            this.dispatchEvent(new CustomEvent('statechange', {detail: this.snapshot()}));
        }
    }

    const start = async () => {
        let data = {music: {playlist: [], mode: 'sequential', volume: 0.45}, redirects: []};
        try {
            const response = await fetch(DATA_URL, {headers: {'Accept': 'application/json'}, cache: 'no-store'});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            data = await response.json();
        } catch (_) {
            // Empty fallback keeps the public interface usable.
        }

        window.rafabruSiteData = data;
        const controller = new RafabruAudioController(data);
        window.rafabruAudio = controller;
        window.dispatchEvent(new CustomEvent('rafabru-audio-ready', {detail: controller}));
    };

    start();
})();
