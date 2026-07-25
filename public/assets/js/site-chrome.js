(() => {
    'use strict';

    const portuguese = document.documentElement.lang === 'pt-BR';
    const path = window.location.pathname;
    const active = path.startsWith('/links/')
        ? 'links'
        : path.startsWith('/music/')
            ? 'music'
            : path.startsWith('/write/')
                ? 'write'
                : '';

    const buildLink = (href, label, key) => {
        const link = document.createElement('a');
        link.className = 'toolbar-menu-link';
        link.href = href;
        link.textContent = label;
        if (active === key) link.classList.add('toolbar-menu-link--active');
        return link;
    };

    const buildWriteLink = () => {
        const label = portuguese ? 'Escrever...' : 'Write...';
        const link = document.createElement('a');
        link.className = 'toolbar-menu-link toolbar-menu-link--write';
        link.href = '/write/';
        link.setAttribute('aria-label', label);
        link.dataset.i18nSkip = '';
        if (active === 'write') link.classList.add('toolbar-menu-link--active');

        const visible = document.createElement('span');
        visible.className = 'write-label';
        visible.setAttribute('aria-hidden', 'true');

        Array.from(label).forEach((character, index) => {
            const letter = document.createElement('span');
            letter.className = 'write-letter';
            letter.style.setProperty('--write-letter-index', String(index));
            letter.textContent = character;
            visible.appendChild(letter);
        });

        link.appendChild(visible);
        return link;
    };

    document.querySelectorAll('.toolbar-nav').forEach((navigation) => {
        navigation.replaceChildren(
            buildLink('/links/', 'Links', 'links'),
            buildLink('/music/', portuguese ? 'Música' : 'Music', 'music'),
            buildWriteLink()
        );
    });
})();
