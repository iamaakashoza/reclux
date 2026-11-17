# Release notes

Download Reclux and see the install steps at [reclux.netlify.app](https://reclux.netlify.app).

**To update:** Reclux does not update itself.

- **Chrome, Edge, Brave, Opera:** extract the new .zip over the same folder, then press reload on Reclux in your browser's extensions page.
- **Firefox:** load the new .zip the next time you add Reclux.

## 2.0.0 (17 November 2026)

A new look, a video editor, a webcam circle and cursor zoom. Downloads: `reclux-extension-v2.zip` (Chrome, Edge, Brave, Opera) and `reclux-firefox-extension-v2.zip`.

### New
- **Liquid-glass design** on every screen, with a new logo. "Reduce transparency" switches to solid surfaces.
- **Floating controls** (Chrome, Edge, Brave, Opera): a small window on top of every app with Pause, Stop, timer, webcam and mic. Firefox gets a small bar on web pages instead.
- **Webcam circle:** a round webcam on the screen while you record. Drag it anywhere, or hide it.
- **Cursor zoom:** while you work in one area of a web page, the video zooms in there, and glides back out when you stop. You can change, add or remove each zoom in the editor.
- **Editor:** Split (Ctrl+B), Trim In / Out (I / O), Delete, Undo and Redo, a zoomable timeline, and a preview that plays your edit.
- **Export screen:** your video on the left, its name and details on the right. Choose any folder or drive.
- **Smart audio ducking:** while you speak, system sound in the recording drops to 20%, then glides back.
- Webcam and Cursor zoom ask for access to web pages only when you switch them on, never at install.

### Changed
- **Quality is now 720p or 1080p, at 50 or 60 fps.** On a computer without a hardware video encoder, Reclux starts on 720p.
- **No more "What to record" step.** Your browser's own window asks: a tab, a window or the whole screen.
- **No more "Your computer is struggling" warning.** It mostly measured how the browser captures a still screen, not your computer. Recording now never falls behind.
- Recordings are named `Reclux-recording_001`, `_002` and so on.
- Saving an edited video replaces the original only after the new one is complete. Cancel keeps the original.

### Fixed
- Exporting a long video no longer lets you delete it before the copy has finished.
- Recording no longer freezes on "Starting" when the browser is slow to answer.

## 1.0.0 (4 November 2026)

First full release. Recording works the same as 0.2.2. What changed is the name and the files.

### Changed
- **Version 1.0.0.** Reclux now shows 1.0.0 in your browser, on the website and here.
- **New download names.** Chrome, Edge, Brave and Opera: `reclux-extension-v1.zip`. Firefox: `reclux-firefox-extension-v1.zip`.
- **New build folder names** for anyone building Reclux from the code: `reclux-extension-all-in-one` and `reclux-firefox-extension`.

## 0.2.2 (3 November 2026)

### Fixed
- **Safer crash recovery.** After a crash, picture and sound now stay matched, and the recovered video plays as long as it says it does. At most about 2 seconds are lost. Before, a recovered video could lose more, its sound could stop early, and the player could get stuck.

### Changed
- Removed internal test screens and unused code. You will not see any difference.

## 0.2.1 (3 November 2026)

### New
- **New Reclux logo and icons,** in the browser toolbar and on the popup, recorder and welcome pages.

## 0.2.0 (3 November 2026)

### Recording
- **Locked frame rate.** In Chrome, Edge, Brave and Opera, the video keeps exactly the rate you choose: 30, 50 or 60 fps.
- **Correct details in Windows.** MP4 and WebM files now show their real frame rate, and MP4 files show their length.
- **Sharper text,** even beside moving video.
- Fewer false warnings. At 30 fps, "Your computer is struggling" now appears only when frames are really being lost.

### Sound
- **Your voice stays clear.** While you speak, the computer's sound drops to 48% in the recording, then comes back when you stop. A live label shows when this is happening.
- A new notice explains that your microphone can still hear your speakers when system audio is off.

### Firefox
- **Much smoother recording with sound.** MP4 recordings with sound now use Opus, and WebM uses a faster video format.

### Welcome guide and setup
- Clearer wording about saving, a new card explaining each permission, and an animated guide to how recording works.
- New hints for recording a tab and for turning on your browser's audio switch.

## Also changed around these releases

- **New website,** with separate download steps for Chrome, Edge, Brave and Opera, and for Firefox.
- **Windows .exe installer removed.** Reclux is now shared only as extension .zip files.
- **Privacy policy updated (3 November 2026).** It now says Reclux reads how loud your microphone is, to lower system sound while you speak. This stays on your computer and is not stored or sent.

## Good to know

- Reclux is tested on Windows. Mac and Linux should work in the same browsers but are not tested yet.
- Firefox removes Reclux when it closes, so you add it again each time. It records your microphone but not system audio, and it can pause for about a second at 1080p, so 720p is smoother there.
- Long recordings have not yet been re-tested for a full 2 hours since the 0.2.0 recording changes. The longest test so far is 7 minutes.
