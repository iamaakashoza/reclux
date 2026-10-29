# Reclux: Chrome Web Store listing (copy and paste)

## Store listing tab

**Name** (max 75): `Reclux`

**Summary** (max 132): `Offline screen recorder with mic and system audio. No account, no upload. Saves MP4 or WebM on your device.`

**Category:** Productivity  **Language:** English

**Description:**

```
Reclux records your screen, a window or a browser tab, and saves the video on your own computer.

No account. No upload. No tracking. It works with the internet switched off.

WHAT YOU GET
• Record the whole screen, one window, or one tab
• Microphone and system audio, with a Mute button
• Quality presets from 720p to 1080p, at 30, 50 or 60 frames per second
• Pause and Resume. Paused time is not added to the video
• Saves as MP4 (works almost everywhere) or WebM
• Long recordings: written to disk as you go, so memory stays low. Tested for 2 hours
• Crash safe: if the browser or computer stops, Reclux offers to recover the recording next time
• Warns you when your computer is too slow to keep up, and when disk space is running low
• Keeps your PC awake while recording
• A short welcome guide opens after you install. It remembers your choices, with quick options in the toolbar popup
• You pick where to save, so you can use another drive such as D: or E:
• Works with a keyboard. Large text and light or dark mode are supported

PRIVATE BY DESIGN
Your recordings and settings never leave your device. Reclux makes no network requests.

GOOD TO KNOW
• Needs Chrome, Brave or Edge version 116 or newer, on a desktop computer
• 1080p at 60 frames per second needs a fast computer. Reclux shows the real frame rate it is getting
• Screen capture always asks for your permission first, in the browser's own window
• Reclux does not edit videos
```

## Images (in `store/images/`)

| File | Use |
|---|---|
| `1-setup-1280x800.png` … `5-popup-1280x800.png` | Screenshots (1280 × 800, up to 5) |
| `promo-small-440x280.png` | Small promo tile (optional) |
| `promo-marquee-1400x560.png` | Marquee tile (optional) |
| Store icon | 128 × 128, already inside the extension (`public/icon/128.png`) |

Screenshots 2 to 4 are staged states of the real screens (sample timer and size).

## Privacy tab

**Single purpose:**

```
Record the user's screen, a window or a browser tab, with optional microphone and system audio, and save the video file on the user's own device.
```

**Permission justifications:**

| Permission | Justification to paste |
|---|---|
| `downloads` | Shows the browser's "Save as" window so the user can choose the folder or drive for the finished recording. |
| `unlimitedStorage` | While recording, the video is written to the browser's private disk storage so a crash loses almost nothing. Without this permission the storage is capped at about 10 GB, which is too small for a 2-hour 1080p60 recording. |
| `system.cpu` | Reads overall processor load, only to tell "the computer is too busy and is dropping frames" from "the screen is simply still", and then warn the user. The value stays on the device. |
| `power` | Keeps the computer and screen awake while a recording is running, so it does not stop when the PC would otherwise sleep. Released when recording ends. |

No host permissions. No content scripts. No remote code.

**Remote code:** No, I am not using remote code.

**Data usage (suggested answers, you make the final declaration):**
- Collects none of the listed user data types: nothing is sent off the device.
- Tick all three certifications: no sale of data, no use unrelated to the single purpose, no creditworthiness or lending use.

**Privacy policy URL (live):** `https://iamaakashoza.github.io/reclux-privacy/`

## Firefox Add-ons (AMO)

- Upload `.output/reclux-0.1.0-firefox.zip`. When asked for source code, upload `.output/reclux-0.1.0-sources.zip` and say: "Build steps are in README.md: `npm ci`, then `npm run zip:firefox`."
- Same name, summary, description, screenshots and privacy policy link as above.
- Notes for the reviewer: "Screen capture needs a click. The extension makes no network requests. `downloads` is for the Save as window. `unlimitedStorage` is for long recordings kept in private storage."
- Mention in the description: in Firefox, recordings with sound are saved as WebM, and system audio is not available (a Firefox limit).

## Before you submit

1. Create a Chrome Web Store developer account (one-time registration fee, and a developer email that cannot be changed later).
2. Upload `.output/reclux-0.1.0-chrome.zip` (made with `npm run zip`).
3. Fill the tabs above, upload the images, add the privacy policy link.
4. Submit for review. Brave users install from the same store.
