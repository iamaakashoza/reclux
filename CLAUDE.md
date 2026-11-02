# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reclux is an offline-first screen recorder browser extension (Manifest V3). No account, no upload, no server. Built with WXT, Svelte 5 (runes), TypeScript, and Mediabunny for encoding/muxing.

## Commands

```
npm ci
npm run dev             # Chromium dev build with reload
npm run dev:firefox
npm run build           # -> .output/chrome-mv3 (Chrome, Brave, Edge, Opera)
npm run build:firefox   # -> .output/firefox-mv3
npm run zip / zip:firefox
npm run check           # svelte-check type check — the only automated verification
npm run installer       # Windows .exe via Inno Setup 6 (installer/reclux.iss)
```

There is no test suite. Verify with `npm run check` plus a manual load of `.output/chrome-mv3` via "Load unpacked". Brave is the main test browser.

## Architecture

Entrypoints (`src/entrypoints/`):
- `background.ts` — only opens `welcome.html` on first install.
- `popup/` — quick settings, then opens `recorder.html` in a tab. Recording cannot start in the popup: it closes on blur and `getDisplayMedia` needs a click on a real page.
- `recorder/` — the page that actually records. All recording state lives here.
- `welcome/` — first-run guide.

Popup and recorder share one origin, so settings pass through one `localStorage` key (`src/lib/settings.ts`), not messaging.

Recording pipeline (`src/lib/`):
- `session.svelte.ts` — the controller. A single `$state` object (`session`) drives every screen through `phase`: `idle → countdown → recording ⇄ paused → finished`. Also runs disk checks, the struggle monitor, keep-awake, and crash recovery.
- `capture.ts` — `getDisplayMedia` + mic, mixed with an `AudioContext` created *before any await* (must stay inside the click gesture).
- `recorder.ts` — WebCodecs encode via Mediabunny. MP4 = H.264+AAC as fragmented MP4; WebM = VP9+Opus. Falls back to the other format if the asked one can't encode. Output streams in 256 KB chunks.
- `writer.worker.ts` — writes chunks into OPFS (`recordings/` dir) with a sync access handle, flushing every write, so a crash keeps everything already written. Nothing big is held in RAM — 2-hour 1080p60 recordings (~11 GB) are a requirement.
- `store.ts` — OPFS file helpers. A live recording is marked by a Web Lock (`reclux:<name>`); unlocked, unsaved files are offered for recovery. Saved flags live in `localStorage`.
- `monitor.ts` — "struggling" = low delivered fps **and** high CPU (`system.cpu`), since a still screen also gives low fps.
- `disk.ts` — free space = quota − usage (needs `unlimitedStorage`). Brave (fake 2 GB quota) and Firefox return `null`; code must treat `null` as "unknown", not "full".
- `track-processor.ts` + `ticker.worker.ts` — polyfill for `MediaStreamTrackProcessor` on Firefox (hidden `<video>` read on a worker clock, since hidden-tab timers are throttled).
- `awake.ts` — `chrome.power`; Chromium only.

Browser differences live in `wxt.config.ts` (`system.cpu`/`power` omitted on Firefox, min Chrome 116, min Firefox 140) and in runtime feature checks — not separate code paths.

UI: shared components in `src/lib/*.svelte`, design tokens in `src/styles/tokens.css`.

## Other files

- `report.md` — the research report and decision log (presets, bitrates, browser minimums, 2-hour rules). Code comments cite it as "report §N". Update it when decisions change.
- `store/` — store listing, privacy policy, and the static landing/install pages (hosted on Netlify).
- `installer/` — Inno Setup script; installs the unpacked extension to `%LOCALAPPDATA%\Reclux\extension` and opens `install-guide.html`.
- `docs/`, `spike/` are local-only (gitignored).

## Conventions

- Comments are short plain English explaining *why* (the owner is a designer, not a developer).
- Deliberate shortcuts are marked `// ponytail: <limit>, <upgrade path>`.
- Commits use the GitHub no-reply address; never put a real email in commits or published files.
