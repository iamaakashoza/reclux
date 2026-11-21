# Release notes

Download Reclux and see the install steps at [reclux.netlify.app](https://reclux.netlify.app).

**To update:** Reclux does not update itself.

- **Chrome, Edge, Brave, Opera:** extract the new .zip over the same folder, then press reload on Reclux in your browser's extensions page.
- **Firefox:** load the new .zip the next time you add Reclux.

## 2.0.0 fixes, part 4 (21 November 2026)

The version stays 2.0.0 until the owner says otherwise.

### Changed
- **The controls window opens when the countdown starts** and shows "Starting in 3…", so it is ready before recording begins (Firefox stuttered while it opened, and its empty window could end up in the video).
- **1080p on a computer without a hardware video encoder** (for example Firefox on many PCs): a short note under the quality choice says 1080p may skip frames and 720p is smoother. 1080p can still be chosen.
- Encoding and saving now run apart from the Reclux page, so a busy moment on the page no longer makes the video skip frames (Chrome, Brave, Edge, Opera; Firefox is not helped by this, see report §45.3).

### Fixed
- A WebM recording cut short by a crash could look empty to players. It now plays, and "Recover it" fills in its length.
- "Recover it" now finishes the file the same way Stop does, so Windows shows its right length and frame rate.
- The low-disk warning now counts the room needed to finish the file. If finishing still fails, a note says the file is kept in its crash-safe form.
- After a failed Stop, the page said "Use Recover it below" but showed no button. The recording to recover now shows.
- Recording a browser tab lost most of its frames at 1080p and with the webcam on (the video stuttered and froze for up to 2 s). Every frame is kept now.
- The first moment of a recording could show the countdown (Firefox, the whole screen) or the small control bar with "Starting in 5". It now starts on your page.
- Reloading or closing the Reclux tab during a recording left the controls window open and frozen. It now closes too.
- Brave: pressing Cancel in the Save As window showed "Something went wrong". Cancel is now silent, and a later export clears an old error. "Export again" no longer says "Exported" while it is still saving.
- A video edited from a recording that had skipped frames got an odd frame rate (such as 27 fps). It keeps the frame rate it was recorded at.
- A quick double or triple click on Start recording in the welcome page started several recordings.
- Firefox: on a busy computer the recording controls window could close by itself before it appeared, leaving no controls.
- Firefox: a very fast triple click on Start recording in the welcome page still opened two tabs.
- Brave: hiding the webcam circle on a web page made the recorded page freeze for up to a second. It no longer does.
- Brave: a 1080p recording of a browser tab could stutter for its whole length (15–26 fps, the webcam even 3–5 fps). It now starts at the right size and keeps every frame.

## 2.0.0 fixes, part 3 (20 November 2026, not released yet)

The version stays 2.0.0 until the owner says otherwise.

### Changed
- **New look:** Figtree and JetBrains Mono typefaces and Lucide icons, packed into Reclux (no internet needed). Frosted glass in light **and dark**, following your computer's setting.
- **New welcome page:** the steps on the left, a moving picture of Reclux on the right that follows your choices.
- **Logo:** the dot is now Reclux red, also in the toolbar icon.
- **Alerts** have their own colours: red for problems, yellow for warnings (such as a recording that was never saved), green for success, blue for tips. "Recording" in the controls is green.
- **Buttons:** second choices such as Cancel and Delete video have a red outline instead of a red fill.
- **Header:** "Setup guide | Works offline", each with an icon. The "Reduce transparency" button is gone.

### Fixed
- The recording controls window slowly moved across the screen by itself (Chrome, Opera, with screen scaling on).
- Opera: no webcam circle on search results pages (Opera keeps extensions off them). The circle now shows in the controls window whenever the page in front cannot show it, also on browser pages and PDFs.
- The webcam circle went blank for a moment every time a page loaded. It now shows a picture of a moment ago until the live video starts.
- A double click on Start recording opened two Reclux tabs.

## 2.0.0 fixes, part 2 (19 November 2026, not released yet)

The version stays 2.0.0 until the owner says otherwise.

### Changed
- **Start recording opens Reclux as a tab next to your page**, in the window you are working in. Your browser's share box shows right there, over a picture of your page, then a big see-through 5-second countdown. At 0 your page comes back and a small controls window sits bottom-right. Cancel at any point and you are simply back on your page. Firefox still needs one "Choose what to share" click (a Firefox rule).
- **New look:** light mode in three colours (off-white, black, crimson red) with Apple-style liquid glass.
- **Popup:** no empty space at the bottom, and no second rounded card inside the browser's frame.
- **Keep on top** is now a small pin icon in the recording bar.
- **Editor:** full width. Trim shows two arrows on the ends of the selected part: drag them to cut the start or the end. Delete is red. "+ Add zoom" is gone (the − Zoom + buttons zoom the timeline). A cursor-zoom block can be selected and deleted.
- **Saving:** no edits → straight to export. Only the automatic cursor zoom → it is added with a progress bar, no question. Cuts → "Replace the original video?" as before.
- **Export:** video 70 %, details 30 %, edge to edge; "Back to editing" and "New recording" on one line.

### Fixed
- The webcam circle took 30 seconds (Chrome) or a minute (Opera) to appear on busy websites, and disappeared after typing a search in a new tab. It now appears as soon as a page starts loading, also after Back and Forward.
- "Could not start recording: the browser did not confirm it can encode MP4 video" when sharing a tab or window whose size is an odd number of pixels (seen in Firefox; also possible in Chrome).
- Dragging the webcam circle no longer makes cursor zoom follow the drag.
- When the webcam cannot start (blocked, or used by another app), the controls say so instead of silently showing no circle.
- The recording controls window had scrollbars and an outline around its first button.

## 2.0.0 fixes (18 November 2026, not released yet)

The version stays 2.0.0 until the owner says otherwise.

### Changed
- **Start recording starts right away.** No more recorder page: a small Reclux window opens in the middle of the screen, your browser asks what to share, a 5-second countdown ticks, and recording starts at 0. The same window then becomes the recording controls (bottom-right) and, after Stop, the editor. Firefox needs one "Choose what to share" click first (a Firefox rule).
- **Popup:** "What are you recording today?" Normal or Webcam. The Webcam and Cursor zoom switches are gone; cursor zoom works whenever Reclux may show things on web pages. Same size (360 × 560) in every browser.
- **Keep on top:** the always-on-top controls now open from a button in the controls window.
- **Firefox:** no System audio switch (Firefox cannot record it) and no alert about it.

### Fixed
- Chrome and Edge: "Screen sharing was cancelled or blocked" and a controls window that vanished after 2–3 seconds.
- The webcam circle took 30–40 seconds to appear (the browser asked for the camera a second time, on the web page).
- Dragging the webcam circle selected page text (a blue box) and could stick. It now follows the pointer smoothly.
- The recording controls window cut off both sides of the bar.
- Opera: the broken "Sharing this tab" bar on the recorder page (the recorder is no longer a tab).
- Closing the Reclux window during the countdown no longer leaves an empty "never saved" recording.
- In Normal mode the small bar on web pages no longer shows a webcam button.

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
