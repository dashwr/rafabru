(() => {
    'use strict';

    const MIGRATION_KEY = 'rafabru_wall_client_schema';
    const CURRENT_SCHEMA = '20260726-1';

    try {
        if (localStorage.getItem(MIGRATION_KEY) === CURRENT_SCHEMA) return;

        /* Preserve identity and unfinished writing; only discard the incompatible
           checklist-mode state produced by the older overlapping controllers. */
        localStorage.removeItem('rafabru_note_type_v1');
        localStorage.removeItem('rafabru_checklist_draft_v1');
        localStorage.setItem(MIGRATION_KEY, CURRENT_SCHEMA);
    } catch (_) {
        /* Storage may be blocked. The mural must still be allowed to load. */
    }
})();
