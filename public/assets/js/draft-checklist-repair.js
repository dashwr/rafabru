(() => {
    'use strict';

    const DRAFT_KEY = 'rafabru_checklist_draft_v1';
    const TYPE_KEY = 'rafabru_note_type_v1';
    const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
    const state = () => window.rafabruWallExtras || null;

    const showToast = (message, duration = 3200) => {
        const toast = document.querySelector('[data-wall-toast]');
        if (!toast) return;
        toast.textContent = message;
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, duration);
    };

    const normalizeItems = (items) => {
        const result = (Array.isArray(items) ? items : []).slice(0, 100).map((item) => ({
            text: String(item?.text || '').slice(0, 180),
            checked: item?.checked === true,
        }));
        while (result.length < 5) result.push({text: '', checked: false});
        return result;
    };

    const persist = () => {
        const extras = state();
        if (!extras) return;
        extras.checklist = normalizeItems(extras.checklist);
        try {
            localStorage.setItem(TYPE_KEY, extras.noteType === 'check' ? 'check' : 'write');
            localStorage.setItem(DRAFT_KEY, JSON.stringify(extras.checklist));
        } catch (_) {
        }
    };

    const setup = () => {
        const extras = state();
        const editor = document.querySelector('.checklist-editor');
        const itemsRoot = editor?.querySelector('[data-checklist-items]');
        const createButton = document.querySelector('[data-create-note]');
        const checkToggle = document.querySelector('[data-note-type="check"]');
        const writeToggle = document.querySelector('[data-note-type="write"]');
        if (!extras || !editor || !itemsRoot) return;

        let rendering = false;
        const render = (focusIndex = null) => {
            if (rendering) return;
            rendering = true;
            extras.checklist = normalizeItems(extras.checklist);
            itemsRoot.replaceChildren();

            extras.checklist.forEach((item, index) => {
                const row = document.createElement('label');
                row.className = 'checklist-editor__row';
                row.classList.toggle('is-checked', item.checked === true);

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.checked === true;
                checkbox.disabled = item.text.trim() === '';
                checkbox.addEventListener('change', () => {
                    extras.checklist[index].checked = checkbox.checked;
                    row.classList.toggle('is-checked', checkbox.checked);
                    persist();
                });

                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 180;
                input.value = item.text;
                input.placeholder = `${localT('Item', 'Item')} ${index + 1}`;
                input.addEventListener('input', () => {
                    extras.checklist[index].text = input.value.slice(0, 180);
                    checkbox.disabled = input.value.trim() === '';
                    if (checkbox.disabled) {
                        checkbox.checked = false;
                        extras.checklist[index].checked = false;
                        row.classList.remove('is-checked');
                    }
                    if (index === extras.checklist.length - 2 && input.value.trim() !== '' && extras.checklist.length < 100) {
                        extras.checklist.push({text: '', checked: false});
                        persist();
                        render(index);
                        return;
                    }
                    persist();
                });

                row.append(checkbox, input);
                itemsRoot.appendChild(row);
            });
            rendering = false;

            if (focusIndex !== null) {
                requestAnimationFrame(() => {
                    const input = itemsRoot.querySelectorAll('input[type="text"]')[focusIndex];
                    input?.focus();
                    input?.setSelectionRange(input.value.length, input.value.length);
                });
            }
        };

        const refreshAfterLegacyHandler = () => window.setTimeout(() => {
            if (!editor.hidden && extras.noteType === 'check') render();
        }, 0);

        checkToggle?.addEventListener('change', refreshAfterLegacyHandler);
        writeToggle?.addEventListener('change', refreshAfterLegacyHandler);
        createButton?.addEventListener('click', refreshAfterLegacyHandler);

        const observer = new MutationObserver(() => {
            if (!editor.hidden && extras.noteType === 'check') render();
        });
        observer.observe(editor, {attributes: true, attributeFilter: ['hidden']});

        window.addEventListener('rafabru-wall-note', (event) => {
            if (event.detail?.type !== 'check' || extras.noteType !== 'check') return;
            extras.checklist = Array.from({length: 5}, () => ({text: '', checked: false}));
            try {
                localStorage.removeItem(DRAFT_KEY);
                localStorage.removeItem(TYPE_KEY);
            } catch (_) {
            }
            render();
        });

        render();
    };

    /* This listener is registered before the legacy publishing listener. */
    document.addEventListener('click', (event) => {
        const button = event.target.closest?.('[data-publish-draft]');
        const extras = state();
        if (!button || !extras || extras.noteType !== 'check') return;
        extras.checklist = normalizeItems(extras.checklist);
        if (extras.checklist.some((item) => item.text.trim() !== '')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showToast(localT('Add at least one checklist item before publishing.', 'Adicione pelo menos um item antes de publicar.'));
    }, true);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once: true});
    else setup();
})();
