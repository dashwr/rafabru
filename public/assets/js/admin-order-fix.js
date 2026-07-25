(() => {
    'use strict';

    document.querySelectorAll('button[name="action"][value^="move_"]').forEach((button) => {
        button.formNoValidate = true;
        button.setAttribute('formnovalidate', '');
    });
})();
