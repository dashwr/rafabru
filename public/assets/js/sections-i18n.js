(() => {
    'use strict';

    if (document.documentElement.lang !== 'pt-BR') return;

    const dictionary = new Map(Object.entries({
        'music library': 'biblioteca de música',
        'Every song currently enabled in the control panel appears here automatically.': 'Todas as músicas ativadas no painel de controle aparecem aqui automaticamente.',
        'Music library': 'Biblioteca de música',
        'NOW PLAYING': 'TOCANDO AGORA',
        'Previous song': 'Música anterior',
        'Play': 'Tocar',
        'Pause': 'Pausar',
        'Download': 'Baixar',
        'Playlist': 'Playlist',
        'playlist': 'playlist',
        'press play to start': 'aperte play para começar',
        'no music available': 'nenhuma música disponível',
        'this song could not be played': 'não foi possível tocar esta música',
        'shortcut crowd': 'caixa de atalhos',
        'Every enabled short redirect is dropped into the box automatically.': 'Todos os redirecionamentos curtos ativados aparecem automaticamente nesta caixa.',
        'Short redirects': 'Redirecionamentos curtos',
        'shortcuts': 'atalhos',
        'No redirects have been created.': 'Nenhum redirecionamento foi criado.'
    }));

    const skipped = (node) => {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        return Boolean(element?.closest('script, style, [data-i18n-skip]'));
    };

    const translateTextNode = (node) => {
        if (skipped(node)) return;
        const raw = node.nodeValue || '';
        const trimmed = raw.trim();
        const translated = dictionary.get(trimmed);
        if (!translated || translated === trimmed) return;
        node.nodeValue = raw.replace(trimmed, translated);
    };

    const translateElement = (root) => {
        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }
        if (!(root instanceof Element) && root !== document) return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) translateTextNode(node);

        const elements = root === document
            ? document.querySelectorAll('[aria-label], [title]')
            : root.querySelectorAll?.('[aria-label], [title]') || [];
        elements.forEach((element) => {
            ['aria-label', 'title'].forEach((attribute) => {
                const value = element.getAttribute(attribute);
                const translated = value ? dictionary.get(value) : null;
                if (translated) element.setAttribute(attribute, translated);
            });
        });
    };

    translateElement(document);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(translateElement);
            if (mutation.type === 'characterData') translateTextNode(mutation.target);
        });
    });
    observer.observe(document.body, {subtree: true, childList: true, characterData: true});
})();
