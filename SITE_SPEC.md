# Rafabru site specification

**Status:** planning and initial scaffold

## Purpose

Rafabru is a very small personal website for Rafa and Bru. Its main job is to keep useful or meaningful links in one calm, private-feeling page without turning into a full CMS or social platform.

The live address is planned to be:

```text
https://rafabru.duckdns.org
```

The application will run on HostGator. GitHub stores the source code; GitHub Pages will not host the live PHP application.

## Core goals

- One public page containing editable link buttons.
- One separate administrator login.
- A tiny administrator panel for editing links, page text, music settings, and redirects.
- Friendly short redirects such as `/playlist` or `/photos`.
- Background music from a local MP3 file.
- A calming, light-pink, Windows 98-inspired interface.
- Cinnamoroll-like colors and motifs are welcome when used softly.
- Minimal dependencies and minimal maintenance.

## Explicit non-goals

The first version will not include:

- Public accounts or registration.
- Multiple administrators or roles.
- A page builder.
- Analytics dashboards.
- Comments, messages, chat, or social feeds.
- A MySQL database.
- A JavaScript framework.
- Integration with the Projeto Ideal application.
- Complex media management.
- Drag-and-drop editing unless it proves genuinely necessary later.

## Visual direction

The interface should feel like a small personal desktop from an older computer rather than a modern link-in-bio template.

### Main style

- Pale pink desktop background.
- White and very light blue cloud details.
- Windows 95/98-style title bars, beveled borders, and rectangular controls.
- Soft pink window chrome rather than harsh gray.
- Notebook-paper, stationery, floppy disk, folder, CD, heart, bow, star, and cloud motifs.
- Low visual density and generous breathing room.
- Very little animation.
- Mobile-friendly without losing the desktop-window illusion.

### Suggested palette

```text
Background pink:  #FFF4FA
Window pink:      #F2CBDF
Cloud blue:       #CCE9FF
Accent blue:      #9DCCF0
Paper white:      #FFFCFE
Lavender gray:    #8D899B
Main text:        #465369
Soft shadow:      #C9B7C3
```

These are starting values, not hard requirements.

### Character influence

The first version can evoke a Cinnamoroll-like atmosphere through clouds, pale blue accents, long-ear silhouettes, bows, stars, and soft pink cheeks. Official artwork should only be added from assets intentionally supplied for the project.

## Public page

The public route is `/`.

It should contain:

- A small title and subtitle.
- A vertical or compact grid list of editable links.
- An icon for each link selected from a fixed built-in set.
- An optional short description under a link.
- A small now-playing area.
- Play, pause, and mute controls.
- A tiny footer.

Each link record contains:

```text
id
text
url
optional description
icon
order
enabled
open in new tab
```

Disabled links are not shown publicly.

## Background music

The selected MP3 will live under `public/assets/audio/` unless a later hosting reason requires another location.

Because browsers commonly block audible autoplay, the intended behavior is:

1. The page loads normally.
2. A small retro dialog asks whether to play the music.
3. Music begins only after a visitor interaction.
4. The preference is remembered in local storage on that browser.
5. A visible play/pause or mute control remains available.
6. The track can loop when enabled in settings.

## Administrator area

The administrator route is `/admin/`.

There is one administrator account and no public registration.

The panel should resemble a small pink Windows Control Panel and contain four compact areas.

### Page settings

- Public title.
- Subtitle or greeting.
- Footer text.
- Music enabled or disabled.
- Music display name.
- MP3 path.
- Loop enabled or disabled.

### Links

- Add a link.
- Edit text, URL, description, and icon.
- Enable or disable a link.
- Choose whether it opens in a new tab.
- Move it up or down.
- Delete it.

A fixed icon set is enough for the first version:

```text
folder
heart
star
music disc
photo
cloud
letter
flower
gift
custom image
```

### Redirects

The administrator can create entries such as:

```text
slug: playlist
destination: https://example.com/a-long-address
status: 302
enabled: true
```

This creates:

```text
https://rafabru.duckdns.org/playlist
```

Reserved internal slugs will include at least:

```text
admin
assets
index.php
login
logout
api
```

Redirect requirements:

- Slugs use lowercase letters, numbers, and hyphens.
- Destinations must be valid HTTP or HTTPS URLs.
- `302` is the default because personal links may change.
- `301` may be selectable when intentionally permanent.
- Disabled or missing redirects return a normal 404 page.
- Redirect lookup should happen in PHP; the admin panel must not rewrite `.htaccess` for every edit.

### Session controls

- Logout.
- Session timeout after inactivity.
- Clear success and validation messages.

## Technical architecture

The intended stack is deliberately small:

- PHP 8.3.
- HTML and CSS.
- Small amounts of vanilla JavaScript.
- JSON files for mutable content.
- PHP sessions for authentication.
- Apache `.htaccess` for routing and basic protections.
- No Composer package unless a real need appears.
- No database.

### Data separation

Application code is deployed from GitHub into the public web directory.

Production data should live outside `public_html`, approximately:

```text
/home1/raf32088/rafabru-data/
├── config.php
├── settings.json
├── links.json
└── redirects.json
```

This keeps passwords and editable data outside the public directory and prevents a GitHub deployment from overwriting changes made in the admin panel.

Default/template JSON files may remain in the repository under `storage/templates/`, but they are not the live production files.

## Minimum security requirements

Even though this is a personal site, the administrator area must include:

- Passwords stored only as `password_hash()` output.
- No plaintext password in GitHub.
- PHP session regeneration after successful login.
- CSRF protection for create, update, and delete actions.
- File locking and atomic writes for JSON data.
- Escaping of all displayed user-editable text.
- Validation of URLs and redirect slugs.
- A small delay or basic throttling after failed logins.
- Secure, HTTP-only session cookies when HTTPS is active.
- No directory listing.
- Search-engine exclusion for the administrator pages.

## Repository and deployment boundary

Repository:

```text
dashwr/rafabru
```

Expected HostGator document root:

```text
/home1/raf32088/public_html/rafabru/
```

Expected private data directory:

```text
/home1/raf32088/rafabru-data/
```

This project must remain independent from:

```text
brunoupmidia/projetoideal-revamp
```

No code, database, deployment workflow, secrets, or writable data should be shared between them.

## Deployment model

The planned deployment flow is:

```text
push to main
→ GitHub Actions
→ SSH/SFTP or rsync to HostGator
→ deploy public application files
→ leave /home1/raf32088/rafabru-data untouched
```

The deployment workflow will be added only after the final HostGator document root and secret values are confirmed.

## Initial acceptance criteria

Version 1 is complete when:

- The DuckDNS domain loads over HTTPS.
- The public page is responsive and visually matches the agreed retro pastel direction.
- Music can be started, paused, muted, and remembered by the browser.
- The administrator can log in and log out.
- The administrator can add, edit, reorder, disable, and delete links.
- The administrator can edit the main page text.
- The administrator can create, edit, disable, and delete redirects.
- Invalid URLs and duplicate slugs are rejected clearly.
- JSON writes do not corrupt existing data.
- Redeploying the GitHub code does not overwrite production content.

## Items to decide before final build

- Final public title and subtitle.
- Final administrator username.
- Final MP3 and its display name.
- Whether links open in the same tab by default.
- Whether the public page needs a tiny private/about section.
- Exact HostGator document root shown in cPanel after the domain mapping is complete.
