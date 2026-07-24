<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$settings = rafabru_read_json('settings.json', []);
$title = trim((string) ($settings['title'] ?? 'rafa & bru')) ?: 'rafa & bru';
$turnstileSiteKey = function_exists('rafabru_wall_turnstile_site_key') ? rafabru_wall_turnstile_site_key() : '';
?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#f2b9d6">
    <title>Write... — <?= rafabru_h($title) ?></title>
    <link rel="icon" type="image/png" href="/assets/images/favicon.png">
    <link rel="stylesheet" href="/assets/css/retro-ui.css?v=20260724-6">
    <link rel="stylesheet" href="/assets/css/w95f.css?v=20260724-6">
    <link rel="stylesheet" href="/assets/css/font-force.css?v=20260724-6">
    <link rel="stylesheet" href="/assets/css/write-wall.css?v=20260724-1">
    <script src="/assets/js/lang.js?v=3" defer></script>
    <?php if ($turnstileSiteKey !== ''): ?>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
    <?php endif; ?>
    <script src="/assets/js/write-wall.js?v=20260724-1" defer></script>
</head>
<body class="wall-page" data-turnstile-site-key="<?= rafabru_h($turnstileSiteKey) ?>">
    <header class="wall-chrome">
        <div class="titlebar wall-titlebar">
            <a class="titlebar__name wall-home-link" href="/" data-i18n-skip>
                <span class="titlebar__icon" aria-hidden="true">♡</span>
                <?= rafabru_h(strtolower($title)) ?>.exe
            </a>
            <span class="window-controls" aria-hidden="true">
                <span class="window-control">_</span>
                <span class="window-control">□</span>
                <span class="window-control">×</span>
            </span>
        </div>

        <nav class="toolbar toolbar--centered wall-toolbar" aria-label="Application menu">
            <span class="toolbar-balance" aria-hidden="true"></span>
            <span class="toolbar-nav">
                <span>File</span>
                <span>Links</span>
                <span>Music</span>
                <a class="toolbar-menu-link toolbar-menu-link--active" href="/write/">Write...</a>
            </span>
            <span class="toolbar-actions">
                <label class="language-picker">
                    <span class="sr-only">Language</span>
                    <select class="language-select" data-language-select aria-label="Language">
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                    </select>
                </label>
                <a class="toolbar-login" href="/admin/">login</a>
            </span>
        </nav>
    </header>

    <main class="writing-wall" data-wall>
        <button class="create-box window" type="button" data-create-note>
            <span aria-hidden="true">＋</span> Create...
        </button>

        <section class="wall-notes" data-wall-notes aria-label="Published post-its"></section>

        <div class="wall-loading window" data-wall-loading>Loading the wall...</div>

        <footer class="wall-baseboard" aria-hidden="true">
            <span class="wall-baseboard__trim"></span>
            <span class="wall-baseboard__panel"></span>
        </footer>
    </main>

    <div class="modal-layer" data-modal-layer hidden>
        <div class="modal-backdrop"></div>

        <section class="notebook-modal" data-notebook-modal role="dialog" aria-modal="true" aria-label="Notebook" hidden>
            <div class="notebook-shell" data-notebook-shell>
                <div class="notebook-viewport" data-notebook-viewport>
                    <div class="notebook-paper-track" data-paper-track aria-hidden="true"></div>
                    <div
                        class="notebook-flow"
                        data-notebook-flow
                        contenteditable="true"
                        role="textbox"
                        aria-multiline="true"
                        aria-label="Notebook writing"
                        spellcheck="true"
                    ></div>
                </div>
            </div>

            <div class="notebook-navigation">
                <button class="notebook-arrow" type="button" data-page-previous aria-label="Previous pages">←</button>
                <span class="notebook-counter" data-page-counter>pages 1–2 of 2</span>
                <button class="notebook-arrow" type="button" data-page-next aria-label="Next pages">→</button>
            </div>

            <p class="notebook-status" data-notebook-status aria-live="polite"></p>

            <div class="notebook-actions" data-editor-actions>
                <button class="retro-action retro-action--primary" type="button" data-publish-draft>Publish</button>
                <button class="retro-action" type="button" data-nevermind>Nevermind</button>
            </div>

            <div class="notebook-actions" data-viewer-actions hidden>
                <button class="retro-action retro-action--primary" type="button" data-close-viewer>Close</button>
            </div>
        </section>

        <section class="confirm-window window" data-discard-dialog role="alertdialog" aria-modal="true" aria-label="Discard notebook" hidden>
            <header class="titlebar"><span>Discard notebook?</span><span aria-hidden="true">×</span></header>
            <div class="confirm-window__body">
                <p>Discard this unfinished notebook?</p>
                <p>Your writing will be deleted from this browser.</p>
                <div class="dialog-actions">
                    <button class="retro-action retro-action--danger" type="button" data-confirm-discard>Yes, discard</button>
                    <button class="retro-action" type="button" data-cancel-discard>Keep writing</button>
                </div>
            </div>
        </section>

        <section class="captcha-window window" data-captcha-dialog role="dialog" aria-modal="true" aria-label="CAPTCHA" hidden>
            <header class="titlebar"><span>Confirm you're human</span><span aria-hidden="true">×</span></header>
            <div class="captcha-window__body">
                <p>Complete the CAPTCHA to continue publishing.</p>
                <div class="turnstile-slot" data-turnstile-slot></div>
                <p class="dialog-message" data-captcha-message aria-live="polite"></p>
                <div class="dialog-actions">
                    <button class="retro-action retro-action--primary" type="button" data-captcha-continue disabled>Continue</button>
                    <button class="retro-action" type="button" data-captcha-back>Go back</button>
                </div>
            </div>
        </section>

        <section class="postit-designer" data-postit-designer role="dialog" aria-modal="true" aria-label="Post-it designer" hidden>
            <div class="designer-heading window">Choose how the post-it will look</div>

            <div class="designer-postit postit-color--yellow-classic" data-designer-postit>
                <input class="designer-title" data-postit-title type="text" maxlength="80" value="" aria-label="Post-it title">
                <textarea class="designer-preview" data-postit-preview maxlength="240" aria-label="Post-it preview"></textarea>
                <label class="designer-author-row">
                    <span>by:</span>
                    <input data-postit-author type="text" maxlength="80" required aria-label="Author">
                </label>
            </div>

            <div class="color-picker" aria-label="Post-it colors">
                <div class="color-family" data-color-family>
                    <button class="color-swatch postit-color--blue-2" type="button" aria-label="Blue"></button>
                    <div class="color-shades">
                        <button class="color-swatch postit-color--blue-1" type="button" data-color="blue-1" aria-label="Blue tone 1"></button>
                        <button class="color-swatch postit-color--blue-2" type="button" data-color="blue-2" aria-label="Blue tone 2"></button>
                        <button class="color-swatch postit-color--blue-3" type="button" data-color="blue-3" aria-label="Blue tone 3"></button>
                    </div>
                </div>
                <div class="color-family" data-color-family>
                    <button class="color-swatch postit-color--light-blue-2" type="button" aria-label="Light blue"></button>
                    <div class="color-shades">
                        <button class="color-swatch postit-color--light-blue-1" type="button" data-color="light-blue-1" aria-label="Light blue tone 1"></button>
                        <button class="color-swatch postit-color--light-blue-2" type="button" data-color="light-blue-2" aria-label="Light blue tone 2"></button>
                        <button class="color-swatch postit-color--light-blue-3" type="button" data-color="light-blue-3" aria-label="Light blue tone 3"></button>
                    </div>
                </div>
                <div class="color-family" data-color-family>
                    <button class="color-swatch postit-color--pink-2" type="button" aria-label="Pink"></button>
                    <div class="color-shades">
                        <button class="color-swatch postit-color--pink-1" type="button" data-color="pink-1" aria-label="Pink tone 1"></button>
                        <button class="color-swatch postit-color--pink-2" type="button" data-color="pink-2" aria-label="Pink tone 2"></button>
                        <button class="color-swatch postit-color--pink-3" type="button" data-color="pink-3" aria-label="Pink tone 3"></button>
                    </div>
                </div>
                <div class="color-family" data-color-family>
                    <button class="color-swatch postit-color--light-pink-2" type="button" aria-label="Light pink"></button>
                    <div class="color-shades">
                        <button class="color-swatch postit-color--light-pink-1" type="button" data-color="light-pink-1" aria-label="Light pink tone 1"></button>
                        <button class="color-swatch postit-color--light-pink-2" type="button" data-color="light-pink-2" aria-label="Light pink tone 2"></button>
                        <button class="color-swatch postit-color--light-pink-3" type="button" data-color="light-pink-3" aria-label="Light pink tone 3"></button>
                    </div>
                </div>
                <div class="color-family" data-color-family>
                    <button class="color-swatch postit-color--white-2" type="button" aria-label="White"></button>
                    <div class="color-shades">
                        <button class="color-swatch postit-color--white-1" type="button" data-color="white-1" aria-label="White tone 1"></button>
                        <button class="color-swatch postit-color--white-2" type="button" data-color="white-2" aria-label="White tone 2"></button>
                        <button class="color-swatch postit-color--white-3" type="button" data-color="white-3" aria-label="White tone 3"></button>
                    </div>
                </div>
                <button class="color-swatch postit-color--yellow-classic" type="button" data-color="yellow-classic" aria-label="Classic yellow"></button>
            </div>

            <p class="dialog-message" data-designer-message aria-live="polite"></p>
            <div class="notebook-actions">
                <button class="retro-action retro-action--primary" type="button" data-enter-placement>Yes, publish</button>
                <button class="retro-action" type="button" data-designer-back>Go back</button>
            </div>
        </section>
    </div>

    <div class="placement-toolbar window" data-placement-toolbar hidden>
        <span>Move the post-it and click the wall to place it.</span>
        <button class="retro-action" type="button" data-cancel-placement>Cancel</button>
    </div>

    <div class="placement-postit postit-color--yellow-classic" data-placement-postit hidden aria-hidden="true">
        <strong data-placement-title></strong>
        <p data-placement-preview></p>
        <small><span>by:</span> <span data-placement-author></span></small>
    </div>

    <div class="wall-toast window" data-wall-toast hidden aria-live="polite"></div>
</body>
</html>
