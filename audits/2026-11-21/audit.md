# Ponytail audit: Reclux 2.0.0 (2026-11-21)

**What this repo does:** Reclux is a browser extension that records your screen, mic and webcam straight to the browser's private disk storage (OPFS), lets you cut and zoom the result, and saves it as MP4 or WebM. Nothing is uploaded.
**Load assumed:** one person, one recording at a time, up to 2 hours at 1080p60 (about 18 GB), on Chromium browsers (Brave, Chrome, Edge, Opera) and Firefox.

## Must fix

1. **A crashed WebM recording comes back with a wrong size label** (`src/lib/recorder.ts:267`)
   - **What this is:** WebM recordings are written with `new WebMOutputFormat()`. The file starts with a "Segment" box that says how long the file is.
   - **Problem:** Mediabunny writes that length when the file starts, and it then covers only the header. It writes the real length only at Stop (`matroska-muxer.js:1136`). After a crash, the file still says "I end right after the header", so any player or reader that trusts that number sees no video, even though every finished part is on disk. MP4 does not have this problem.
   - **Fix:** Write the live WebM with `new WebMOutputFormat({ appendOnly: true })`. The length is then written as "unknown", which is the normal way to write a live WebM. Then run the existing rebuild step on Stop for WebM too, not only MP4 (see 2), so the saved file gets its length and seek index back. Confirm with one tester run: crash during a WebM recording, recover it, and play it.
   - **If we skip it:** A WebM user whose browser crashes gets a "recovered" file that may not play at all.

## Should fix

2. **Recovered recordings, and recordings on a nearly full disk, are saved as fragmented MP4 without telling anyone** (`src/lib/session.svelte.ts:491`, `src/lib/recorder.ts:125-129`, `src/lib/session.svelte.ts:80`)
   - **What this is:** On Stop, `makeRegularMp4` rebuilds the crash-safe fragmented MP4 into a regular MP4, because Windows shows the wrong length and frame rate for a fragmented one.
   - **Problem:** (a) "Recover it" never runs this rebuild, so every recovered file has the Windows problem. (b) The rebuild needs a second full copy on disk (18 GB for 2 hours). The low-disk warning only counts one copy, so with 25 GB free a 2-hour recording finishes, the rebuild fails, and the only trace is a `console.warn`.
   - **Fix:** Export the rebuild function and call it in `recover()` before `show()`, using the same progress bar (`finishShare`). Have it return `false` when it fails, and add a notice in `stop()`: "Saved in the crash-safe format; some Windows players show the wrong length." In `refreshDisk`, compare against twice the 2-hour size.
   - **If we skip it:** Exactly the files that matter most (long ones, rescued ones) are the ones that show a wrong length in Windows.

3. **After a failed Stop, the page says "Use Recover it below", but there is no button** (`src/entrypoints/recorder/App.svelte:111`)
   - **What this is:** A recording started from the toolbar popup runs in "flow" mode. `flow` turns off only when the phase reaches `finished`.
   - **Problem:** If finishing the file fails, `stop()` resets to `idle`. `flow` is still on, so the page shows the "Choose what to share" card over the old page picture, with an error that says "Use Recover it below". The list of recordings to recover sits in the other branch and is hidden. A concrete case: on Brave (disk space unknown, so no automatic stop), the disk fills up, the write fails, finishing fails, and the user lands on this screen.
   - **Fix:** One line: `if (live || session.phase === 'finished') flow = false;`. Once recording has begun, the flow mode has done its job.
   - **If we skip it:** The user sees "Cancel", presses it, and the tab closes. The recording is still on disk (the popup offers it later), but the user thinks it is gone.

4. **The Firefox stand-in duplicates the audio reader that Mediabunny already has** (`src/lib/track-processor.ts:205-237, 249`)
   - **What this is:** Firefox lacks `MediaStreamTrackProcessor`, so this file installs a stand-in on `globalThis` for video and audio.
   - **Problem:** When the global is missing, Mediabunny's `MediaStreamAudioTrackSource` already reads audio with its own ScriptProcessor fallback (`media-source.js:2417`). Because we patch the global, our copy is used instead, which means 33 extra lines doing the same job.
   - **Fix:** Do not patch the global. Export the video stand-in, and in `startPump` (`recorder.ts:147`) use `globalThis.MediaStreamTrackProcessor ?? VideoProcessor`. Delete `audioFrames`. Re-test Firefox audio (tester journeys 3 and 6).
   - **If we skip it:** Two audio readers to keep working instead of one; nothing breaks today.

## Nice to have

5. **A web page can fake cursor moves for cursor zoom** (`src/entrypoints/overlay.content.ts:369`)
   - **What this is:** While recording, the overlay listens to `pointermove` on the page's window to collect cursor positions.
   - **Problem:** Page scripts can send their own fake `PointerEvent`s to the window, and the listener accepts them. A page could steer where the auto-zoom goes. That is all it can do: it cannot send other messages, read anything, or reach the closed shadow root.
   - **Fix:** First line of `onMove`: `if (!e.isTrusted) return;`.
   - **If we skip it:** A hostile page could create odd zoom blocks, which the user can delete in the editor.

6. **Recovering the same file in two tabs hangs the second tab silently** (`src/lib/store.ts:80-84`, used in `session.svelte.ts:494`)
   - **What this is:** `holdStored` waits for the file's Web Lock.
   - **Problem:** Two Reclux tabs both list the same lost recording. Tab A recovers it and holds the lock. In tab B, "Recover it" waits forever and nothing happens.
   - **Fix:** In `recover()`, take the lock with `{ ifAvailable: true }` and show "This recording is open in another Reclux tab" when the lock is not given.
   - **If we skip it:** A rare, confusing dead button.

7. **A truly full disk reads as "unknown" instead of "full"** (`src/lib/disk.ts:128`)
   - **What this is:** `freeBytes` returns `null` when `quota - usage <= 0`.
   - **Problem:** If another program fills the disk between the 10-second checks, the free space reads as `null`, and `checkDisk` never stops the recording.
   - **Fix:** `return Math.max(0, free);`.
   - **If we skip it:** You rely on the write failing instead of a clean stop. The data is kept, but you end up in finding 3's screen.

8. **Any website can tell that Reclux is installed** (`wxt.config.ts:60`)
   - **What this is:** `bubble.html`, `chunks/*` and `assets/*` are open to every site (`web_accessible_resources`).
   - **Problem:** On Chromium the extension ID is fixed, so any site can load one of these URLs and learn that the user has Reclux. `chunks/*` and `assets/*` are most likely not needed there: the circle's frame is a Reclux page, and it loads its own files as Reclux.
   - **Fix:** Keep only `bubble.html` in the list, then check the webcam circle on a web page in Brave and Firefox.
   - **If we skip it:** A small fingerprinting hint, for a privacy-first product.

**Checked and fine:**
- Long recordings: memory stays flat. Only the newest frame is kept, sections are flushed to disk one by one, and the rebuild only holds sample tables.
- Crash recovery for MP4: the lock is taken before the file exists, and a file in countdown is marked as nothing to recover.
- Page messages: web pages cannot reach the content script's port, because it runs in an isolated world and there is no `externally_connectable`.
- The webcam frame: a site can embed it but cannot read its pixels.
- Permissions: each one (`downloads`, `unlimitedStorage`, `scripting`, `activeTab`, `power`, optional `<all_urls>`) is used and needed.
- Firefox system audio: hidden correctly, including old saved settings.

**Verdict:** Fix 1 first: it is the one place where a crash can cost a whole recording. Then 3 (one line) and 2.
**Lean:** -33 lines possible, -0 dependencies.
**Not checked:**
- Whether Firefox's `FileSystemHandle.move()` overwrites an existing file. If it refuses, every Firefox MP4 silently stays fragmented (it is caught at `recorder.ts:125`). Tester check: run ffprobe on a Firefox recording and look for `moof` boxes.
- Audio/video sync on Firefox over a long recording.
- The Svelte UI components beyond the recorder page, the editor's save flow and the popup.
- `welcome/`, `Demo.svelte`, `pip.ts` and `Floating.svelte`.
- Nothing was run except `edit.check.mjs` and `zoom.check.mjs`; both pass.
