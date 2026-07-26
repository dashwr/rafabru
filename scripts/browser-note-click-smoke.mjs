import puppeteer from 'puppeteer-core';

const executablePath = process.argv[2];
const targetUrl = process.argv[3] || 'http://127.0.0.1:8099/write/';
if (!executablePath) throw new Error('Chrome executable path is required.');

const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
page.setDefaultTimeout(12000);
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
page.on('console', (message) => {
    if (message.type() === 'error') console.log(`browser console: ${message.text()}`);
});

const assertViewerOpen = async (label) => {
    await page.waitForFunction(() => {
        const layer = document.querySelector('[data-modal-layer]');
        const notebook = document.querySelector('[data-notebook-modal]');
        const status = document.querySelector('[data-notebook-status]');
        return layer && !layer.hidden
            && notebook && !notebook.hidden
            && document.body.classList.contains('is-published-note-open')
            && status?.textContent.includes('Browser post-it');
    });

    const state = await page.evaluate(() => ({
        moving: document.body.classList.contains('is-moving-owned-note'),
        noteOpen: document.body.classList.contains('is-published-note-open'),
        modalHidden: document.querySelector('[data-notebook-modal]')?.hidden,
    }));
    if (state.moving || !state.noteOpen || state.modalHidden) {
        throw new Error(`${label}: note click entered the wrong state: ${JSON.stringify(state)}`);
    }
};

try {
    await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 15000});
    await page.waitForSelector('.wall-postit');

    await page.click('.wall-postit');
    await assertViewerOpen('public note click');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('is-published-note-open'));

    await page.evaluate(() => localStorage.setItem('rafabru_wall_identity_v1', 'Browser CI'));
    await page.reload({waitUntil: 'domcontentloaded', timeout: 15000});
    await page.waitForSelector('.wall-postit');
    await page.waitForSelector('[data-move-note]', {visible: true});

    await page.click('.wall-postit');
    await assertViewerOpen('owner note click');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('is-published-note-open'));

    await page.click('[data-move-note]');
    await page.waitForFunction(() => document.body.classList.contains('is-moving-owned-note'));
    const movedState = await page.evaluate(() => ({
        moving: document.body.classList.contains('is-moving-owned-note'),
        viewer: document.body.classList.contains('is-published-note-open'),
        movedCard: Boolean(document.querySelector('.wall-postit.is-being-moved')),
    }));
    if (!movedState.moving || movedState.viewer || !movedState.movedCard) {
        throw new Error(`Move control entered the wrong state: ${JSON.stringify(movedState)}`);
    }

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('is-moving-owned-note'));

    if (pageErrors.length) {
        throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);
    }

    console.log('note click and move-control smoke test passed');
} finally {
    await browser.close();
}
