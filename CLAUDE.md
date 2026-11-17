# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reclux is an offline-first screen recorder browser extension (Manifest V3). No account, no upload, no server. Built with WXT, Svelte 5 (runes), TypeScript, and Mediabunny for encoding/muxing.

## Folders

- `Version 2.0.0/` — the live project. All work happens here; run every command below inside it. Paths in this file (`src/…`, `.output/…`, `brand/…`) are relative to it.
- `Version 1.0.0/` — frozen archive of the 1.0.0 release (also git tag `v1.0.0`). Do not edit; it still builds on its own.
- Top level: `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `report.md` are shared by both versions.

## Commands

```
cd "Version 2.0.0"
npm ci
npm run dev             # Chromium dev build. Load .output/reclux-extension-all-in-one-dev by hand (web-ext, which opened a browser, was removed)
npm run dev:firefox
npm run build           # -> .output/reclux-extension-all-in-one (Chrome, Brave, Edge, Opera)
npm run build:firefox   # -> .output/reclux-firefox-extension
npm run zip / zip:firefox
npm run check           # svelte-check type check
node src/lib/zoom.check.mjs   # assert-based check of the cursor-zoom logic
node src/lib/edit.check.mjs   # assert-based check of the cut list (split / trim / delete)
```

There is no test suite. Verify with `npm run check` plus a manual load of `.output/reclux-extension-all-in-one` via "Load unpacked". Brave is the main test browser.

Automated runs: Google Chrome 137+ ignores `--load-extension`, but **headless Brave still loads an unpacked extension** (`brave.exe --headless=new --load-extension=<dir> --remote-debugging-port=…`), so the real extension (popup, recorder, floating window, page overlay) can be driven over CDP. Page access cannot be clicked there: test on a copy of the build with `host_permissions: ["<all_urls>"]` added. Headless screenshots do not paint CSS transforms on `<video>` (the zoom preview), so check those by measuring boxes, not pixels.

When testing a recording automatically, do not use `--use-fake-device-for-media-stream`: it also replaces the screen with a fake 20 fps video. Report §31 lists what is and is not covered.

## Architecture

Entrypoints (`src/entrypoints/`):
- `background.ts` — only opens `welcome.html` on first install.
- `popup/` — Screen 1: Quality, FPS, audio, then opens `recorder.html` in a tab. Recording cannot start in the popup: it closes on blur and `getDisplayMedia` needs a click on a real page.
- `recorder/` — the page that actually records. All recording state lives here. Flow: start card → countdown → `RecordingBar` (Screen 2) → `Editor` + `Timeline` (Screen 3) → save `Modal` (Screen 4) → `Export` (Screen 5, Save As via `downloads`, waits until the copy completes).
- `welcome/` — first-run guide.
- `bubble/` — the webcam circle page, shown as an iframe inside web pages (so the camera permission belongs to Reclux, not the site). Listed in `web_accessible_resources`.
- `overlay.content.ts` — injected (runtime registration, never at install) into open tabs only while recording and only with page access: webcam circle (drag, hide), cursor positions, and a control bar where there is no floating window (Firefox).

Popup and recorder share one origin, so settings pass through one `localStorage` key (`src/lib/settings.ts`), not messaging. Quality is locked to 720p/1080p × 50/60 fps (`presets.ts`, picked with `QualityPicker.svelte`); on first run, a PC with no hardware H.264 encoder for 1080p60 starts on 720p.

Recording pipeline (`src/lib/`):
- `session.svelte.ts` — the controller. A single `$state` object (`session`) drives every screen through `phase`: `idle → countdown → recording ⇄ paused → finished`. Also runs disk checks, keep-awake, and crash recovery. There is no "struggling" warning in V2 (report §34): skipped frames are only logged to the console on Stop.
- `capture.ts` — `getDisplayMedia` + mic, mixed with an `AudioContext` created *before any await* (must stay inside the click gesture). Also ducks system audio to 20% in the recording while the mic hears speech (the voice stays at 100%), gliding back to 100% after. No source hint: the browser's picker chooses tab/window/screen.
- `recorder.ts` — WebCodecs encode via Mediabunny. MP4 = H.264+AAC (Opus where there is no AAC encoder, i.e. Firefox); WebM = VP9+Opus, only with a hardware VP9 encoder (never on Firefox); otherwise MP4 is used silently. Encoder runs in `latencyMode: 'realtime'`; the pump never falls more than 0.25 s behind (report §34). Each finished section goes straight to disk (a new section starts at each key frame, about every 2 s), so a crash loses at most about 2 s (report §33). A clock-driven pump repeats the newest picture so the file has a locked frame rate (report §31). MP4 is written fragmented for crash safety, then rebuilt as a regular MP4 on Stop, because Windows misreads a fragmented file's frame rate and length.
- `writer.worker.ts` — writes chunks into OPFS (`recordings/` dir) with a sync access handle, flushing every write, so a crash keeps everything already written. Nothing big is held in RAM — 2-hour 1080p60 recordings (up to ~18 GB) are a requirement.
- `store.ts` — OPFS file helpers. A live recording is marked by a Web Lock (`reclux:<name>`); unlocked, unsaved files are offered for recovery. Saved flags live in `localStorage`.
- `disk.ts` — free space = quota − usage (needs `unlimitedStorage`). Brave (fake 2 GB quota) and Firefox return `null`; code must treat `null` as "unknown", not "full".
- `track-processor.ts` — polyfill for `MediaStreamTrackProcessor` on Firefox (hidden `<video>` read on a worker clock, since hidden-tab timers are throttled).
- `ticker.worker.ts` — that worker clock. Used anywhere a timer must keep running in a hidden tab (Firefox frames, the frame pump, ducking).
- `awake.ts` — `chrome.power`; Chromium only.
- `overlay.ts` + `overlay-protocol.ts` — recorder side of the page overlay: optional `<all_urls>` access (asked from the Webcam/Cursor zoom switches, `PageFeatures.svelte`), `scripting.executeScript` into tabs, a Port per page for state, commands and cursor positions. `wxt.config.ts` deletes the `host_permissions` WXT would add, so there is no install warning.
- `pip.ts` + `Floating.svelte` — the floating controls window (Document Picture-in-Picture, Chromium only), opened from the same click as Record. Shows the webcam circle itself when page access was refused.
- `zoom.ts` — cursor path → zoom blocks (`autoZoom`), and the eased view at a time (`zoomAt`) used by the editor preview and the export.
- `edit.ts` — the cut list (kept parts in source seconds) and output↔source time mapping. Editor keeps it plus Undo/Redo snapshots.
- `render.ts` — "Save changes" with edits: decodes the kept parts, draws zoomed moments on a canvas, re-encodes (`videoEncoding`/`pickFormat` shared with `recorder.ts`) into `<name>.tmp`, then `session.applyEdit` swaps it in for the original (report §38).
- The webcam is a live circle, captured with the screen (owner's call, report §37); only cursor zoom is applied after recording.

Browser differences live in `wxt.config.ts` (`power` omitted on Firefox, min Chrome 116, min Firefox 140) and in runtime feature checks — not separate code paths.

UI: shared components in `src/lib/*.svelte` (`Logo.svelte` is the logo), design tokens in `src/styles/tokens.css`. Liquid glass (report §36): `.glass` only on floating controls (bars, start card, modal sheet), content stays solid, never glass on glass. `html[data-recording]` makes glass lighter while recording; `html[data-solid]` (the saved "Reduce transparency" switch) and `prefers-reduced-transparency` turn it solid. Modals use `<dialog>` (`Modal.svelte`), never `confirm()`.

## Other files

- `report.md` — the research report and decision log (presets, bitrates, browser minimums, 2-hour rules). Code comments cite it as "report §N". Update it when decisions change.
- `brand/` — logo master files (SVG), app icons and usage rules. `public/icon/` and `Logo.svelte` are copied from here.
- Website: the `website` branch, which Netlify deploys on every push (report §30, §33). Privacy page: the separate `reclux-privacy` repo.
- `docs/`, `spike/` are local-only (gitignored).

## Conventions

- Comments are short plain English explaining *why* (the owner is a designer, not a developer).
- Deliberate shortcuts are marked `// ponytail: <limit>, <upgrade path>`.
- The version stays 2.0.0 (`package.json` in `Version 2.0.0/`, website, GitHub Release) until the owner says to change it. Download names: `reclux-extension-v2.zip`, `reclux-firefox-extension-v2.zip`. V1 keeps its v1 names.
- Commits use the GitHub no-reply address; never put a real email in commits or published files.
