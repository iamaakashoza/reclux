# Release notes

Download Reclux and see the install steps at [reclux.netlify.app](https://reclux.netlify.app).

**To update:** Reclux does not update itself.

- **Chrome, Edge, Brave, Opera:** extract the new .zip over the same folder, then press reload on Reclux in your browser's extensions page.
- **Firefox:** load the new .zip the next time you add Reclux.

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
