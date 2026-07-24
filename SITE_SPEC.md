# Rafabru site specification

**Status:** first working implementation in progress

## Purpose

Rafabru is a very small personal website for Rafa and Bru. It keeps meaningful or useful links in one calm page and includes one private administrator panel for maintaining those links, short redirects, and background music.

Live address:

```text
https://rafabru.duckdns.org
```

Repository:

```text
dashwr/rafabru
```

The application runs on HostGator with PHP 8.3. GitHub stores the source code; GitHub Pages does not run the live PHP application.

## Confirmed public content

```text
Title: our corner
Subtitle: welcome
Footer: made with love by Sol. 28/10/2024
```

The word `love` uses the pink accent color while the rest of the footer uses the normal muted text color.

There are no initial public buttons. When no enabled buttons exist, the page shows a gentle empty-state message explaining that nothing is pinned yet.

## Visual direction

The site should feel like a small personal Windows 95/98 program rather than a modern link-in-bio template.

Confirmed visual direction:

- Light pink desktop background.
- Pink Windows-style title bars and beveled controls.
- White paper/window surfaces.
- Soft blue used only as a secondary contrast color.
- Pink cat, bow, heart, flower, stationery, folder, and music motifs.
- Hello Kitty-inspired atmosphere rather than a light-blue Cinnamoroll-first palette.
- Low density, calm spacing, and very little animation.
- Mobile-friendly without losing the retro-window illusion.
- The supplied pink cat image is intended to be the favicon at `public/assets/images/favicon.png`.

No additional official character artwork is required for version 1.

## Public page

Route:

```text
/
```

The public page includes:

- Page title and subtitle.
- Enabled link buttons in administrator-defined order.
- Optional link descriptions.
- A small icon selected for each link.
- A compact music player.
- A music-consent dialog when playable songs exist.
- The confirmed footer.
- A friendly empty state when no links are enabled.

Each link record contains:

```text
id
text
url
description
icon
order
enabled
new_tab
```

Disabled links are not shown publicly.

## Music and playlist behavior

Songs are uploaded later from the administrator panel. MP3 files are stored in the private writable data directory rather than committed to GitHub.

The administrator can:

- Upload MP3 files.
- Set each song's display title.
- Enable or disable each song.
- Move songs up or down to define playlist order.
- Delete a song and its stored MP3 file.
- Enable or disable music globally.
- Show or hide the public player.
- Choose consecutive or random playback.
- Set the initial volume.

Playback rules:

- With no enabled playable songs, the public player says `no music available` and its buttons are disabled.
- With one enabled song, that song loops.
- In consecutive mode, enabled songs play in the configured order and wrap back to the first song.
- In random mode, the next enabled song is chosen randomly; when more than one exists, the same song is not chosen twice in a row.
- Browsers are asked for a visitor interaction before audible playback.
- The visitor's play/not-now preference is remembered in local storage.

Songs are streamed through:

```text
/audio.php?id=<song-id>
```

The real MP3 path remains outside the public web directory.

## Administrator area

Route:

```text
/admin/
```

There is one administrator account and no public registration.

Confirmed username:

```text
serafim
```

The password is never committed in plaintext. Production stores only a `password_hash()` value in the private configuration file.

The panel contains four sections.

### Page settings

- Title.
- Subtitle.
- Footer before/accent/after fields.
- Global music enabled toggle.
- Public player visibility toggle.
- Consecutive or random mode.
- Initial volume.

### Music

- MP3 upload.
- Display title.
- Enable/disable.
- Reorder.
- Delete.

### Links

- Add a button.
- Edit text, destination, description, and icon.
- Enable or disable it.
- Choose whether it opens in a new tab.
- Move it up or down.
- Delete it.

Built-in icon choices:

```text
folder
heart
star
music
photo
cloud
letter
flower
gift
bow
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

Redirect requirements:

- Slugs use lowercase letters, numbers, and hyphens.
- Reserved internal routes cannot be used.
- Destinations must be valid HTTP or HTTPS URLs.
- `302` is the default.
- `301` can be selected intentionally.
- Disabled or missing redirects produce the site's small 404 screen.

## Technical architecture

The stack is deliberately small:

- PHP 8.3.
- HTML and CSS.
- Vanilla JavaScript.
- JSON files for editable content.
- PHP sessions for authentication.
- Apache `.htaccess` for HTTPS, routing, and basic protections.
- No database.
- No JavaScript framework.
- No Composer dependency for version 1.

## Data separation

Public application document root:

```text
/home1/raf32088/public_html/rafabru/
```

Private writable data:

```text
/home1/raf32088/rafabru-data/
├── config.php
├── settings.json
├── links.json
├── redirects.json
├── songs.json
└── audio/
    └── uploaded-song-files.mp3
```

GitHub deployments update application code only. They must never overwrite the production JSON files or uploaded songs.

## Security requirements

- Production password stored only as a PHP password hash.
- Session ID regeneration after login.
- Secure and HTTP-only session cookies over HTTPS.
- Session inactivity timeout.
- CSRF tokens on all administrator writes.
- Small delay after failed login attempts.
- URL and redirect-slug validation.
- MP3 extension, MIME, and size checks.
- Random server-side filenames for uploaded songs.
- JSON writes through temporary files and atomic replacement.
- Escaping of all public and administrator text.
- No directory listing.
- Administrator pages excluded from search engines.

## Explicit non-goals

Version 1 does not include:

- Public accounts.
- Multiple administrators or roles.
- MySQL.
- Analytics.
- A page builder.
- Comments, chat, or social feeds.
- A complex media library.
- Integration with Projeto Ideal.
- Shared code, data, credentials, or deployment with `brunoupmidia/projetoideal-revamp`.

## Version 1 acceptance criteria

- `https://rafabru.duckdns.org` loads with valid HTTPS.
- The public page matches the pink retro direction.
- The confirmed title, subtitle, and footer appear correctly.
- The page handles an empty link list gracefully.
- The music player accurately reports whether playable songs exist.
- Uploaded songs can be enabled, ordered, disabled, and deleted.
- Consecutive and random playback work.
- The administrator can log in and log out.
- Links and redirects can be created, edited, disabled, and deleted.
- Invalid destinations and duplicate redirect slugs are rejected.
- A deployment does not erase production content or music.
