(() => {
    'use strict';

    const TYPE_KEY = 'rafabru_note_type_v1';
    const CHECKLIST_DRAFT_KEY = 'rafabru_checklist_draft_v1';
    const WALL_DRAFT_KEY = 'rafabru_wall_draft_v2';
    const LEGACY_WALL_DRAFT_KEY = 'rafabru_wall_draft_v1';

    const setup = () => {
        const extras = window.rafabruWallExtras;
        const modal = document.querySelector('[data-notebook-modal]');
        const shell = document.querySelector('[data-notebook-shell]');
        const viewport = document.querySelector('[data-notebook-viewport]');
        const navigation = document.querySelector('.notebook-navigation');
        const createButton = document.querySelector('[data-create-note]');
        const pagePrevious = navigation?.querySelector('[data-page-previous]');
        const pageNext = navigation?.querySelector('[data-page-next]');
        const pageCounter = navigation?.querySelector('[data-page-counter]');
        let editor = shell?.querySelector('.checklist-editor');

        if (!extras || !modal || !shell || !viewport || !navigation || !createButton) return;

        if (!editor) {
            editor = document.createElement('section');
            editor.className = 'checklist-editor';
            editor.hidden = true;
            editor.innerHTML = '<div class="checklist-editor__paper"><div class="checklist-editor__items" data-checklist-items></div></div>';
            shell.appendChild(editor);
        }

        const paper = editor.querySelector('.checklist-editor__paper');
        const itemsRoot = editor.querySelector('[data-checklist-items]');
        if (!paper || !itemsRoot) return;

        const localT = (english, portuguese) => document.documentElement.lang === 'pt-BR' ? portuguese : english;
        let applying = false;
        let scheduled = false;

        const isPublishedState = () => document.body.classList.contains('is-published-note-open')
            || modal.classList.contains('is-published-unified');

        const emptyChecklist = () => Array.from({length: 5}, () => ({text: '', checked: false}));

        const normalizeItems = () => {
            const source = Array.isArray(extras.checklist) ? extras.checklist : [];
            extras.checklist = source.slice(0, 100).map((item) => ({
                text: String(item?.text || '').slice(0, 180),
                checked: item?.checked === true,
            }));
            while (extras.checklist.length < 5) extras.checklist.push({text: '', checked: false});
        };

        const persist = () => {
            normalizeItems();
            try {
                localStorage.setItem(TYPE_KEY, extras.noteType === 'check' ? 'check' : 'write');
                localStorage.setItem(CHECKLIST_DRAFT_KEY, JSON.stringify(extras.checklist));
            } catch (_) {
            }
        };

        const updateSheetHeight = () => {
            const rows = Math.max(5, extras.checklist.length);
            const sheetHeight = Math.max(260, 82 + rows * 32);
            paper.style.height = `${sheetHeight}px`;
            editor.style.height = `${sheetHeight}px`;
            shell.style.minHeight = `${sheetHeight}px`;
        };

        const ensureTrailingRows = (editedIndex) => {
            if (extras.checklist.length >= 100) return false;
            const lastIndex = extras.checklist.length - 1;
            if (editedIndex < lastIndex - 1) return false;
            if (String(extras.checklist[editedIndex]?.text || '').trim() === '') return false;

            let trailingEmpty = 0;
            for (let index = extras.checklist.length - 1; index >= 0; index -= 1) {
                if (String(extras.checklist[index]?.text || '').trim() !== '') break;
                trailingEmpty += 1;
            }

            let changed = false;
            while (trailingEmpty < 2 && extras.checklist.length < 100) {
                extras.checklist.push({text: '', checked: false});
                trailingEmpty += 1;
                changed = true;
            }
            return changed;
        };

        const renderRows = (focusIndex = null) => {
            normalizeItems();
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
                    const expanded = ensureTrailingRows(index);
                    persist();
                    if (expanded) {
                        renderRows(index);
                        return;
                    }
                    updateSheetHeight();
                });

                row.append(checkbox, input);
                itemsRoot.appendChild(row);
            });

            updateSheetHeight();
            if (focusIndex !== null) {
                requestAnimationFrame(() => {
                    const input = itemsRoot.querySelectorAll('input[type="text"]')[focusIndex];
                    input?.focus();
                    input?.setSelectionRange(input.value.length, input.value.length);
                });
            }
        };

        const setHidden = (element, hidden) => {
            if (element.hidden !== hidden) element.hidden = hidden;
            if (hidden) {
                if (element.style.display !== 'none') element.style.display = 'none';
            } else {
                element.removeAttribute('hidden');
                if (element.style.display !== 'block') element.style.display = 'block';
            }
        };

        const toggleNavigation = (isChecklist) => {
            navigation.classList.toggle('notebook-navigation--checklist', isChecklist);
            navigation.classList.toggle('notebook-navigation--sheet', isChecklist);
            [pagePrevious, pageNext, pageCounter].forEach((element) => {
                if (!element) return;
                element.classList.toggle('is-checklist-hidden', isChecklist);
                element.hidden = isChecklist;
            });
        };

        const restoreNavigation = () => {
            navigation.classList.remove('notebook-navigation--sheet');
            [pagePrevious, pageNext, pageCounter].forEach((element) => {
                if (!element) return;
                element.hidden = false;
            });
        };

        const resetDiscardedDraft = () => {
            extras.noteType = 'write';
            extras.checklist = emptyChecklist();
            try {
                localStorage.removeItem(TYPE_KEY);
                localStorage.removeItem(CHECKLIST_DRAFT_KEY);
                localStorage.removeItem(WALL_DRAFT_KEY);
                localStorage.removeItem(LEGACY_WALL_DRAFT_KEY);
            } catch (_) {
            }
            modal.classList.remove('is-draft-checklist');
            shell.style.removeProperty('min-height');
            editor.style.removeProperty('height');
            paper.style.removeProperty('height');
            setHidden(editor, true);
            setHidden(viewport, false);
            toggleNavigation(false);
            const writeToggle = navigation.querySelector('[data-note-type="write"]');
            const checkToggle = navigation.querySelector('[data-note-type="check"]');
            if (writeToggle) writeToggle.checked = true;
            if (checkToggle) checkToggle.checked = false;
            renderRows();
        };

        const applyDraftSurface = (requestedType = '') => {
            if (applying || isPublishedState()) return;
            applying = true;
            try {
                const writeToggle = navigation.querySelector('[data-note-type="write"]');
                const checkToggle = navigation.querySelector('[data-note-type="check"]');
                const type = requestedType === 'check'
                    || (!requestedType && (checkToggle?.checked || extras.noteType === 'check'))
                    ? 'check'
                    : 'write';
                const isChecklist = type === 'check';

                extras.noteType = type;
                if (writeToggle) writeToggle.checked = !isChecklist;
                if (checkToggle) checkToggle.checked = isChecklist;
                modal.classList.toggle('is-draft-checklist', isChecklist);
                setHidden(viewport, isChecklist);
                setHidden(editor, !isChecklist);
                toggleNavigation(isChecklist);

                if (isChecklist) {
                    renderRows();
                } else {
                    shell.style.removeProperty('min-height');
                    editor.style.removeProperty('height');
                    paper.style.removeProperty('height');
                }
                persist();
            } finally {
                applying = false;
            }
        };

        const scheduleApply = (type = '') => {
            if (scheduled) return;
            scheduled = true;
            window.setTimeout(() => {
                scheduled = false;
                applyDraftSurface(type);
            }, 0);
        };

        document.addEventListener('change', (event) => {
            const toggle = event.target.closest?.('[data-note-type]');
            if (!toggle || isPublishedState()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            applyDraftSurface(toggle.matches('[data-note-type="check"]') ? 'check' : 'write');
        }, true);

        document.addEventListener('click', (event) => {
            if (!event.target.closest?.('[data-confirm-discard]')) return;
            resetDiscardedDraft();
        }, true);

        createButton.addEventListener('click', () => {
            let savedType = 'write';
            try {
                savedType = localStorage.getItem(TYPE_KEY) === 'check' ? 'check' : 'write';
            } catch (_) {
            }
            scheduleApply(savedType);
        }, true);

        const observer = new MutationObserver(() => {
            if (applying) return;
            if (isPublishedState()) {
                modal.classList.remove('is-draft-checklist');
                restoreNavigation();
                return;
            }
            if (!modal.hidden && (extras.noteType === 'check' || navigation.querySelector('[data-note-type="check"]')?.checked)) {
                scheduleApply('check');
            }
        });
        observer.observe(modal, {attributes: true, attributeFilter: ['hidden', 'class']});
        observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
        observer.observe(editor, {attributes: true, attributeFilter: ['hidden', 'style']});
        observer.observe(viewport, {attributes: true, attributeFilter: ['hidden', 'style']});

        window.addEventListener('rafabru-wall-note', (event) => {
            if (event.detail?.type !== 'check' || extras.noteType !== 'check' || isPublishedState()) return;
            extras.checklist = emptyChecklist();
            renderRows();
            persist();
        });

        window.rafabruChecklistSurface = {
            show: () => applyDraftSurface('check'),
            hide: () => applyDraftSurface('write'),
            refresh: () => applyDraftSurface(extras.noteType),
            discard: resetDiscardedDraft,
        };
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once: true});
    else setup();
})();
