import {writeFile} from 'node:fs/promises';
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
page.on('console', (message) => console.log(`browser ${message.type()}: ${message.text()}`));

const snapshot = async (stage) => {
    const state = await page.evaluate(() => ({
        url: window.location.href,
        bodyClass: document.body.className,
        modalLayerHidden: document.querySelector('[data-modal-layer]')?.hidden,
        notebookHidden: document.querySelector('[data-notebook-modal]')?.hidden,
        notebookStatus: document.querySelector('[data-notebook-status]')?.textContent,
        noteCount: document.querySelectorAll('.wall-postit').length,
        movingNoteCount: document.querySelectorAll('.wall-postit.is-being-moved').length,
        moveControlCount: document.querySelectorAll('[data-move-note]').length,
        identity: localStorage.getItem('rafabru_wall_identity_v1'),
        viewerFunction: typeof window.rafabruOpenPublishedNote,
    }));
    console.log(`${stage}: ${JSON.stringify(state)}`);
    return state;
};

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

    const state = await snapshot(label);
    if (state.bodyClass.includes('is-moving-owned-note') || state.notebookHidden || state.modalLayerHidden) {
        throw new Error(`${label}: note click entered the wrong state: ${JSON.stringify(state)}`);
    }
};

try {
    await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 15000});
    await page.waitForSelector('.wall-postit');
    await snapshot('wall loaded');

    await page.click('.wall-postit');
    await assertViewerOpen('public note click');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('is-published-note-open'));

    await page.evaluate(() => localStorage.setItem('rafabru_wall_identity_v1', 'Browser CI'));
    await page.reload({waitUntil: 'domcontentloaded', timeout: 15000});
    await page.waitForSelector('.wall-postit');
    await page.waitForSelector('[data-move-note]', {visible: true});
    await snapshot('owner wall loaded');

    await page.click('.wall-postit');
    await assertViewerOpen('owner note click');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('is-published-note-open'));

    await page.click('[data-move-note]');
    await page.waitForFunction(() => document.body.classList.contains('is-moving-owned-note'));
    const movedState = await snapshot('move control click');
    if (!movedState.bodyClass.includes('is-moving-owned-note')
        || movedState.bodyClass.includes('is-published-note-open')
        || movedState.movingNoteCount < 1) {
        throw new Error(`Move control entered the wrong state: ${JSON.stringify(movedState)}`);
    }

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('is-moving-owned-note'));

    if (pageErrors.length) {
        throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);
    }

    console.log('note click and move-control smoke test passed');
} catch (error) {
    const state = await snapshot('failure').catch(() => ({}));
    await writeFile('/tmp/note-click-state.json', JSON.stringify({error: String(error?.stack || error), state, pageErrors}, null, 2));
    await page.screenshot({path: '/tmp/note-click-failure.png', fullPage: true}).catch(() => {});
    console.error(error?.stack || error);
    throw error;
} finally {
    await browser.close();
}
