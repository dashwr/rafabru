(() => {
    'use strict';

    /* Avoid an observer loop when a checklist card is already rendered identically. */
    const nativeReplaceChildren = Element.prototype.replaceChildren;
    Element.prototype.replaceChildren = function (...nodes) {
        if (this.classList?.contains('wall-checklist') && nodes.length === 2) {
            const currentTitle = this.querySelector('.checklist-card__title')?.textContent || '';
            const nextTitle = nodes[0]?.querySelector?.('.checklist-card__title')?.textContent || '';
            const currentChecked = this.querySelector('.checklist-card__box')?.classList.contains('is-checked') === true;
            const nextChecked = nodes[0]?.querySelector?.('.checklist-card__box')?.classList.contains('is-checked') === true;
            const currentAuthor = this.querySelector('.wall-postit__author')?.textContent || '';
            const nextAuthor = nodes[1]?.textContent || '';
            if (currentTitle === nextTitle && currentChecked === nextChecked && currentAuthor === nextAuthor) {
                return;
            }
        }
        return nativeReplaceChildren.apply(this, nodes);
    };

    /* The broad note event is not needed: list rendering and direct update calls already refresh cards. */
    const nativeDispatchEvent = window.dispatchEvent.bind(window);
    window.dispatchEvent = (event) => {
        if (event instanceof CustomEvent && event.type === 'rafabru-wall-note') return true;
        return nativeDispatchEvent(event);
    };

    /* Clear only the checklist that was actually published, never one merely loaded from the wall. */
    const upstreamFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : String(input?.url || '');
        const response = await upstreamFetch(input, init);
        if (url.includes('/api/wall/create.php') && response.ok) {
            response.clone().json().then((payload) => {
                if (payload?.note?.type !== 'check') return;
                localStorage.removeItem('rafabru_checklist_draft_v1');
                localStorage.removeItem('rafabru_note_type_v1');
                const extras = window.rafabruWallExtras;
                if (extras) {
                    extras.noteType = 'write';
                    extras.checklist = Array.from({length: 5}, () => ({text: '', checked: false}));
                }
            }).catch(() => {});
        }
        return response;
    };

    const setup = () => {
        const extras = window.rafabruWallExtras;
        const wall = document.querySelector('[data-wall]');
        if (!extras || !wall) return;

        /* Empty checklists remain genuinely empty instead of receiving placeholder content. */
        document.querySelector('[data-publish-draft]')?.addEventListener('click', () => {
            if (extras.noteType !== 'check') return;
            const english = 'New checklist item';
            const portuguese = 'Novo item';
            const restEmpty = extras.checklist.slice(1).every((item) => String(item.text || '').trim() === '');
            if (restEmpty && [english, portuguese].includes(String(extras.checklist[0]?.text || '').trim())) {
                extras.checklist[0].text = '';
                const firstInput = document.querySelector('.checklist-editor__row input[type="text"]');
                if (firstInput) firstInput.value = '';
            }
        }, true);

        /* Distinguish a normal owner click from the requested double-click-to-grab gesture. */
        let allowNativeClick = false;
        const pendingClicks = new WeakMap();
        const owns = (note) => {
            const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
            return normalize(extras.identity) !== '' && normalize(extras.identity) === normalize(note?.author);
        };

        document.addEventListener('click', (event) => {
            const postit = event.target.closest('.wall-postit');
            if (!postit || allowNativeClick || extras.moving) return;
            const note = extras.noteMap.get(postit.dataset.noteId);
            if (!note || note.type === 'check' || !owns(note)) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            const existing = pendingClicks.get(postit);
            if (existing) window.clearTimeout(existing);
            if (event.detail > 1) {
                pendingClicks.delete(postit);
                return;
            }

            const timer = window.setTimeout(() => {
                pendingClicks.delete(postit);
                allowNativeClick = true;
                postit.click();
                allowNativeClick = false;
            }, 265);
            pendingClicks.set(postit, timer);
        }, true);

        document.addEventListener('dblclick', (event) => {
            const postit = event.target.closest('.wall-postit');
            if (!postit) return;
            const timer = pendingClicks.get(postit);
            if (timer) window.clearTimeout(timer);
            pendingClicks.delete(postit);

            requestAnimationFrame(() => {
                const moving = extras.moving;
                if (!moving || moving.element !== postit) return;
                const note = moving.note;
                const wallRect = wall.getBoundingClientRect();
                const width = postit.offsetWidth || 214;
                const anchorLeft = Math.min(
                    Math.max(0, (Number(note.x) || 0.5) * wallRect.width - width / 2),
                    Math.max(0, wallRect.width - width)
                );
                postit.style.left = `${anchorLeft}px`;
                postit.style.top = `${Math.max(130, Number(note.y) || 130)}px`;
                moving.offsetX = event.clientX - (wallRect.left + anchorLeft);
                moving.offsetY = event.clientY - (wallRect.top + Math.max(130, Number(note.y) || 130));
            });

            [120, 350, 800].forEach((delay) => {
                window.setTimeout(() => {
                    if (!extras.moving) return;
                    const layer = document.querySelector('[data-modal-layer]');
                    if (layer) layer.hidden = true;
                    document.body.classList.remove('is-modal-open');
                }, delay);
            });
        }, true);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once: true});
    else setup();
})();
