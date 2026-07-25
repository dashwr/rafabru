(() => {
    'use strict';

    const clean = (value) => String(value || '').replace(/[<>]/g, '');
    const attach = () => {
        const title = document.querySelector('[data-postit-title]');
        if (!title) return;
        title.addEventListener('input', () => {
            const next = clean(title.value);
            if (next !== title.value) title.value = next;
        });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, {once: true});
    else attach();
})();
