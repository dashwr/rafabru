(() => {
    'use strict';

    const adminContent = document.querySelector('.admin-content');
    const tabs = document.querySelector('.tabs');
    const dashboard = document.querySelector('.dashboard-grid');
    if (!adminContent || !tabs || !dashboard) return;

    const csrf = document.querySelector('input[name="csrf"]')?.value || '';
    const t = (value) => window.rafabruI18n?.t(value) || value;

    const tab = document.createElement('a');
    tab.className = 'tab-link';
    tab.href = '#wall';
    tab.textContent = t('wall');
    tabs.appendChild(tab);

    const panel = document.createElement('section');
    panel.className = 'panel panel--wide wall-admin-panel';
    panel.id = 'wall';
    panel.innerHTML = `
        <h2 class="panel__title">${t('wall post-its')}</h2>
        <div class="panel__body">
            <p class="note">${t('Edit placement details or hide a post-it from the public wall.')}</p>
            <div class="wall-admin-status" data-wall-admin-status>${t('Loading post-its...')}</div>
            <div class="wall-admin-records" data-wall-admin-records></div>
        </div>
    `;
    dashboard.appendChild(panel);

    const status = panel.querySelector('[data-wall-admin-status]');
    const recordsRoot = panel.querySelector('[data-wall-admin-records]');

    const request = async (url, options = {}) => {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                ...(options.body ? {'Content-Type': 'application/json'} : {}),
            },
            ...options,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) {
            throw new Error(payload.message || payload.error || t('Request failed.'));
        }
        return payload;
    };

    const field = (labelText, input) => {
        const wrapper = document.createElement('label');
        wrapper.className = 'wall-admin-field';
        const label = document.createElement('span');
        label.textContent = labelText;
        wrapper.append(label, input);
        return wrapper;
    };

    const createRecord = (note) => {
        const record = document.createElement('article');
        record.className = `wall-admin-record${note.deletedAt ? ' is-deleted' : ''}`;
        record.dataset.noteId = note.id;

        const header = document.createElement('div');
        header.className = 'wall-admin-record__header';
        const identity = document.createElement('strong');
        identity.textContent = `#${note.number} · ${note.title}`;
        const date = document.createElement('small');
        date.textContent = new Date(note.createdAt).toLocaleString();
        header.append(identity, date);

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.maxLength = 80;
        titleInput.value = note.title;

        const authorInput = document.createElement('input');
        authorInput.type = 'text';
        authorInput.maxLength = 80;
        authorInput.value = note.author;

        const xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.min = '0.04';
        xInput.max = '0.96';
        xInput.step = '0.01';
        xInput.value = String(note.x);

        const yInput = document.createElement('input');
        yInput.type = 'number';
        yInput.min = '130';
        yInput.max = '100000';
        yInput.step = '10';
        yInput.value = String(note.y);

        const fields = document.createElement('div');
        fields.className = 'wall-admin-fields';
        fields.append(
            field(t('Title'), titleInput),
            field(t('Author'), authorInput),
            field(t('Horizontal position'), xInput),
            field(t('Vertical position'), yInput),
        );

        const preview = document.createElement('p');
        preview.className = 'wall-admin-preview';
        preview.textContent = note.preview;

        const actions = document.createElement('div');
        actions.className = 'form-actions wall-admin-actions';

        const open = document.createElement('a');
        open.className = 'button';
        open.href = `/write/?note=${encodeURIComponent(note.id)}`;
        open.target = '_blank';
        open.rel = 'noopener';
        open.textContent = t('open notebook');

        const save = document.createElement('button');
        save.className = 'button button--primary';
        save.type = 'button';
        save.textContent = t('save');

        const visibility = document.createElement('button');
        visibility.className = note.deletedAt ? 'button' : 'button button--danger';
        visibility.type = 'button';
        visibility.textContent = note.deletedAt ? t('restore') : t('hide');

        actions.append(open, save, visibility);
        record.append(header, fields, preview, actions);

        const mutate = async (action) => {
            save.disabled = true;
            visibility.disabled = true;
            try {
                await request('/api/wall/admin-update.php', {
                    method: 'POST',
                    body: JSON.stringify({
                        csrf,
                        action,
                        id: note.id,
                        title: titleInput.value,
                        author: authorInput.value,
                        x: Number(xInput.value),
                        y: Number(yInput.value),
                    }),
                });
                status.textContent = t('The wall was updated.');
                await loadRecords();
            } catch (error) {
                status.textContent = error.message;
                save.disabled = false;
                visibility.disabled = false;
            }
        };

        save.addEventListener('click', () => mutate('save'));
        visibility.addEventListener('click', () => mutate(note.deletedAt ? 'restore' : 'delete'));
        return record;
    };

    const loadRecords = async () => {
        status.textContent = t('Loading post-its...');
        try {
            const payload = await request('/api/wall/admin-list.php');
            recordsRoot.replaceChildren();
            if (!Array.isArray(payload.notes) || payload.notes.length === 0) {
                status.textContent = t('No post-its have been published yet.');
                return;
            }
            const fragment = document.createDocumentFragment();
            payload.notes.forEach((note) => fragment.appendChild(createRecord(note)));
            recordsRoot.appendChild(fragment);
            status.textContent = `${payload.notes.length} ${t('post-it records')}`;
        } catch (error) {
            status.textContent = error.message;
        }
    };

    loadRecords();
})();
