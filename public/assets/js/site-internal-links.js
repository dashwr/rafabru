(() => {
    'use strict';

    const hashValue = (value) => {
        let hash = 2166136261;
        for (const character of value) {
            hash ^= character.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    };

    const appendInternalLinks = async () => {
        let data;
        try {
            const response = await fetch('/api/site-data.php', {cache: 'no-store', credentials: 'same-origin'});
            data = await response.json();
        } catch (_) {
            return;
        }

        const links = Array.isArray(data?.siteLinks) ? data.siteLinks : [];
        if (!links.length) return;

        const apply = () => {
            const cloud = document.querySelector('.site-popup__redirect-cloud');
            if (!cloud || cloud.dataset.internalLinksReady === 'true') return false;
            cloud.dataset.internalLinksReady = 'true';
            cloud.querySelector('.redirect-cloud__empty')?.remove();

            links.forEach((item, index) => {
                const label = String(item?.label || item?.slug || 'page');
                const href = String(item?.href || '/');
                const hash = hashValue(`internal:${label}`);
                const x = 12 + ((hash + index * 17) % 77);
                const y = 12 + ((Math.floor(hash / 83) + index * 23) % 72);
                const rotation = ((hash % 501) / 100) - 2.5;
                const link = document.createElement('a');
                link.className = 'redirect-shortcut redirect-shortcut--internal window';
                link.href = href;
                link.textContent = label;
                link.dataset.i18nSkip = '';
                link.style.setProperty('--x', `${x}%`);
                link.style.setProperty('--y', `${y}%`);
                link.style.setProperty('--r', `${rotation.toFixed(2)}deg`);
                link.style.setProperty('--z', String(80 + index));
                cloud.appendChild(link);
            });
            return true;
        };

        if (apply()) return;
        const observer = new MutationObserver(() => {
            if (!apply()) return;
            observer.disconnect();
        });
        observer.observe(document.body, {childList: true, subtree: true});
        window.setTimeout(() => observer.disconnect(), 15000);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', appendInternalLinks, {once: true});
    else appendInternalLinks();
})();
