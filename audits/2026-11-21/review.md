# Ponytail review: Reclux 2.0.0 fixes, part 4 (21 November 2026)

Reviews of the uncommitted changes in `Version 2.0.0/src` made during the 21 November runbook (audit fixes, tester bugs, encoder worker). They were published as commit `c0c4259`. Load assumed: one person, one recording at a time, up to 2 hours at 1080p60, on Chrome, Brave, Edge, Opera and Firefox.

## Review 1: after fix rounds 1–3

**What this change does:** It holds the audit fixes 1–3: a WebM recording is crash-safe, a recovered file is rebuilt into a regular file, and "Recover it" shows where it should. It also fixes the 7 bugs from the first tester run, removes the duplicate Firefox audio reader, and lets the controls window take up to 15 s to load.

**Looks good. Ship.** No bug, risk or data loss found. Checked:
- Frame reader: Chrome, Edge and Opera have `MediaStreamTrackProcessor`, so the stand-in runs only in Firefox. Firefox's sound is read by Mediabunny's own fallback, and the tester confirmed sound is recorded.
- Save As Cancel: Chromium browsers report it as `USER_CANCELED`, which is now silent. In Firefox, Cancel rejects the download, which was already silent.
- Frame rate after an edit: `computeFrameRateMetrics()` reads at most 256 packets, so it stays fast on a 2-hour file.
- Cancel while the encoder starts: `begin()` checks the phase after `go()` and cancels, so the file is removed.
- The 15 s controls-window wait stops at once when Stop comes.

Not checked: if a shared window changes size during a recording, every later frame takes the slow resize path. This was already true before this change (see report §45.4).

## Review 2: after fix round 4 (encoder in a worker)

**What this change does:** It moves encoding, muxing and the frame clock into `encoder.worker.ts`. The page only reads the screen and hands each picture over. Sound goes from an AudioWorklet (`public/tap.worklet.js`) straight to the worker. It also opens the controls window at the start of the countdown and shows a 1080p note on PCs without a hardware encoder.

**Should fix** (both were fixed before publishing):

1. **A failed encoder worker was never heard** (`src/lib/recorder.ts`)
   - **What this is:** The page talks to the encoder worker through messages and waits for its answers (ready, started, stopped).
   - **Problem:** Only `worker.onmessage` was set. If the worker failed to load or threw outside its own error handling, it fired an `error` event that nothing heard. Start then hung at 0, Stop hung on "finishing", or the screen said "Recording" while nothing was written.
   - **Fix:** `worker.onerror` and `onmessageerror` go through the same path as the worker's own error message: they reject the step being waited on, or stop the recording, so what was written stays recoverable.
   - **If we skip it:** A rare worker failure looks like a recording that silently stops saving.

2. **Sound and picture could drift apart in long recordings** (`src/lib/encoder.worker.ts`)
   - **What this is:** Sound blocks were timed by counting samples, which follows the sound card's clock. The picture follows the computer's clock.
   - **Problem:** The two clocks differ by tens of parts per million, so over 2 hours the sound could drift about 0.2–0.4 s from the picture. Before the worker, Chromium used the capture timestamps, which follow the computer's clock, so this was new there.
   - **Fix:** `src/lib/sound-clock.ts` keeps counting samples, so the sound stays smooth, but re-aligns the count with the picture's clock when they part by more than 40 ms. Timestamps only go forward. `sound-clock.check.mjs` checks 2 hours at 0, ±50 and ±100 ppm.
   - **If we skip it:** Lip sync slowly goes wrong in long recordings.

Also checked and fine: pause and resume, cancel during the countdown, flat memory (the worker keeps only the newest picture), and the controls window during the countdown.

## What shipped with known limits

Accepted by the owner before publishing; see `CHANGELOG.md` part 4 and report §45:
- Brave: hiding or showing the webcam circle on a web page can freeze the recorded page for under a second.
- 1080p at 60 fps with the webcam on, or in a long recording, can skip a short moment on slower computers. 1080p at 50 fps and 720p are smooth there.
- Firefox: 1080p, and the webcam circle on web pages, skip frames on PCs without a hardware video encoder.
