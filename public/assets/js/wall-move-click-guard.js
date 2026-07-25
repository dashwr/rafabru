(() => {
    'use strict';

    window.rafabruMoveClickGuard = window.rafabruMoveClickGuard || {ignoreUntil: 0};

    document.addEventListener('click', (event) => {
        const guard = window.rafabruMoveClickGuard;
        const extras = window.rafabruWallExtras;
        if (!guard || !extras?.moving) return;
        if (performance.now() > Number(guard.ignoreUntil || 0)) return;

        guard.ignoreUntil = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);
})();
