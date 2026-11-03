# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reclux is an offline-first screen recorder browser extension (Manifest V3). No account, no upload, no server. Built with WXT, Svelte 5 (runes), TypeScript, and Mediabunny for encoding/muxing.

## Commands

```
npm ci
npm run dev             # Chromium dev build. Load .output/chrome-mv3-dev by hand (web-ext, which opened a browser, was removed)
npm run dev:firefox
npm run build           # -> .output/chrome-mv3 (Chrome, Brave, Edge, Opera)
npm run build:firefox   # -> .output/firefox-mv3
npm run zip / zip:firefox
npm run check           # svelte-check type check — the only automated verification
```

There is no test suite. Verify with `npm run check` plus a manual load of `.output/chrome-mv3` via "Load unpacked". Brave is the main test browser.

When testing a recording automatically, do not use `--use-fake-device-for-media-stream`: it also replaces the screen with a fake 20 fps video. Report §31 lists what is and is not covered.

## Architecture

Entrypoints (`src/entrypoints/`):
- `background.ts` — only opens `welcome.html` on first install.
- `popup/` — quick settings, then opens `recorder.html` in a tab. Recording cannot start in the popup: it closes on blur and `getDisplayMedia` needs a click on a real page.
- `recorder/` — the page that actually records. All recording state lives here.
- `welcome/` — first-run guide.

Popup and recorder share one origin, so settings pass through one `localStorage` key (`src/lib/settings.ts`), not messaging.

Recording pipeline (`src/lib/`):
- `session.svelte.ts` — the controller. A single `$state` object (`session`) drives every screen through `phase`: `idle → countdown → recording ⇄ paused → finished`. Also runs disk checks, the struggle monitor, keep-awake, and crash recovery.
- `capture.ts` — `getDisplayMedia` + mic, mixed with an `AudioContext` created *before any await* (must stay inside the click gesture). Also ducks system audio to 48% in the recording while the mic hears speech (the voice stays at 100%).
- `recorder.ts` — WebCodecs encode via Mediabunny. MP4 = H.264+AAC (Opus where there is no AAC encoder, i.e. Firefox); WebM = VP9+Opus (VP8 in Firefox). Falls back to the other format if the asked one can't encode. Each finished section goes straight to disk (a new section starts at each key frame, about every 2 s), so a crash loses at most about 2 s (report §33). A clock-driven pump repeats the newest picture so the file has a locked frame rate (report §31). MP4 is written fragmented for crash safety, then rebuilt as a regular MP4 on Stop, because Windows misreads a fragmented file's frame rate and length.
- `writer.worker.ts` — writes chunks into OPFS (`recordings/` dir) with a sync access handle, flushing every write, so a crash keeps everything already written. Nothing big is held in RAM — 2-hour 1080p60 recordings (up to ~18 GB) are a requirement.
- `store.ts` — OPFS file helpers. A live recording is marked by a Web Lock (`reclux:<name>`); unlocked, unsaved files are offered for recovery. Saved flags live in `localStorage`.
- `monitor.ts` — once-a-second readings. "Struggling" = frames really skipped from the file (any fps), or at 50/60 fps only, few new pictures **and** high CPU (`system.cpu`), since a still screen also gives low fps.
- `disk.ts` — free space = quota − usage (needs `unlimitedStorage`). Brave (fake 2 GB quota) and Firefox return `null`; code must treat `null` as "unknown", not "full".
- `track-processor.ts` — polyfill for `MediaStreamTrackProcessor` on Firefox (hidden `<video>` read on a worker clock, since hidden-tab timers are throttled).
- `ticker.worker.ts` — that worker clock. Used anywhere a timer must keep running in a hidden tab (Firefox frames, the frame pump, ducking).
- `awake.ts` — `chrome.power`; Chromium only.

Browser differences live in `wxt.config.ts` (`system.cpu`/`power` omitted on Firefox, min Chrome 116, min Firefox 140) and in runtime feature checks — not separate code paths.

UI: shared components in `src/lib/*.svelte` (`Logo.svelte` is the logo), design tokens in `src/styles/tokens.css`.

## Other files

- `report.md` — the research report and decision log (presets, bitrates, browser minimums, 2-hour rules). Code comments cite it as "report §N". Update it when decisions change.
- `brand/` — logo master files (SVG), app icons and usage rules. `public/icon/` and `Logo.svelte` are copied from here.
- Website: the `website` branch, which Netlify deploys on every push (report §30, §33). Privacy page: the separate `reclux-privacy` repo.
- `docs/`, `spike/` are local-only (gitignored).

## Conventions

- Comments are short plain English explaining *why* (the owner is a designer, not a developer).
- Deliberate shortcuts are marked `// ponytail: <limit>, <upgrade path>`.
- Commits use the GitHub no-reply address; never put a real email in commits or published files.
