(() => {
    'use strict';

    const notesRoot = document.querySelector('[data-wall-notes]');
    const loading = document.querySelector('[data-wall-loading]');
    const wall = document.querySelector('[data-wall]');
    if (!notesRoot || !loading || !wall) return;

    const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const createRecoveredNote = (note) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `wall-postit postit-color--${String(note.color || 'yellow-classic')}`;
        button.dataset.noteId = String(note.id || '');
        button.dataset.i18nSkip = '';
        button.dataset.recoveredNote = 'true';
        const x = clamp(Number(note.x) || 0.5, 0.04, 0.96);
        button.style.left = `calc(${x * 100}% - 107px)`;
        button.style.top = `${Math.max(130, Number(note.y) || 130)}px`;
        button.style.zIndex = String(10 + (Number(note.number) || 0));
        button.style.setProperty('--note-rotation', `${Number(note.rotation) || 0}deg`);

        if (note.type === 'check') {
            button.classList.add('wall-checklist');
            const line = document.createElement('span');
            line.className = 'checklist-card__line';
            const box = document.createElement('span');
            box.className = 'checklist-card__box';
            box.classList.toggle('is-checked', note.completed === true);
            const title = document.createElement('strong');
            title.className = 'checklist-card__title';
            title.textContent = String(note.title || 'Checklist');
            line.append(box, title);
            button.appendChild(line);
        } else {
            const title = document.createElement('strong');
            title.className = 'wall-postit__title';
            title.textContent = String(note.title || 'Post-it');
            const preview = document.createElement('p');
            preview.className = 'wall-postit__preview';
            preview.textContent = String(note.preview || '');
            button.append(title, preview);
        }

        const author = document.createElement('small');
        author.className = 'wall-postit__author';
        author.textContent = `${localT('by:', 'por:')} ${String(note.author || '')}`;
        button.appendChild(author);

        button.addEventListener('click', () => {
            if (typeof window.rafabruOpenPublishedNote === 'function') {
                window.rafabruOpenPublishedNote(String(note.id || ''));
                return;
            }
            const url = new URL(window.location.href);
            url.searchParams.set('note', String(note.id || ''));
            window.location.assign(url.toString());
        });

        return button;
    };

    const recover = async () => {
        if (notesRoot.querySelector('.wall-postit') || loading.hidden) return;

        try {
            const response = await window.fetch(`/api/wall/list.php?recovery=${Date.now()}`, {
                cache: 'no-store',
                credentials: 'same-origin',
                headers: {Accept: 'application/json'},
            });
            const payload = await response.json();
            if (!response.ok || payload?.ok !== true || !Array.isArray(payload.notes)) {
                throw new Error('wall_unavailable');
            }

            if (!notesRoot.querySelector('.wall-postit')) {
                const fragment = document.createDocumentFragment();
                payload.notes.forEach((note) => fragment.appendChild(createRecoveredNote(note)));
                notesRoot.replaceChildren(fragment);
                wall.dataset.recoveredMural = 'true';
            }

            loading.hidden = true;
            payload.notes.forEach((note) => {
                window.dispatchEvent(new CustomEvent('rafabru-wall-note', {detail: note}));
            });
            window.dispatchEvent(new CustomEvent('rafabru-wall-notes', {detail: payload.notes}));
        } catch (_) {
            if (!notesRoot.querySelector('.wall-postit')) {
                loading.textContent = localT('The wall could not be loaded. Reload the page to try again.', 'O mural não pôde ser carregado. Recarregue a página para tentar novamente.');
                loading.hidden = false;
            }
        }
    };

    window.setTimeout(recover, 3500);
})();
