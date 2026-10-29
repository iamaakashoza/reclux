# Reclux — Research Report

> Screen recording browser extension · Offline-first · Desktop + Tablet
> Written: 28 Oct 2026 · For: UX/UI designer (non-developer)

---

## How to read this report

Every claim carries a tag, so you know how much to trust it.

| Tag | Meaning |
|-----|---------|
| ✅ | Confirmed in an official or primary source (links at the end) |
| ⚠️ | From blogs, from my own memory, or sources that disagree. Verify before relying on it |
| 🎯 | My recommendation or a target we set. Not a fact about the world |

---

## 0. Executive summary (read this if nothing else)

- **Build it as a Manifest V3 extension with WXT + TypeScript + Svelte.** 🎯
- **No database needed.** Browsers already have built-in storage. ✅
- **No internet needed to record.** Only needed to install and update. ✅
- **Chrome, Brave, Opera, Edge = one build.** Same Chromium engine. ✅
- **Launch target (your decision): Chrome + Brave on desktop.** Firefox and Safari come later.
- **⚠️ Your tablet goal conflicts with your browser goal.** Chrome and Brave on iPad and Android tablets cannot run extensions. See §0.2.
- **Output: MP4 and WebM**, with MP4 as the default. See §13.
- **2-hour recordings need disk streaming.** At 1080p60 that is about 11 GB. See §14.
- **Project is already set up** and builds for Chrome and Firefox. See §1.

---

## 0.1 Your decisions (answers of 28 Oct)

| # | Question | Your answer | What it means |
|---|----------|-------------|---------------|
| 1 | Must-have browsers | **Chrome + Brave** | One Chromium build covers both. Firefox/Safari move to later phases |
| 2 | Tablet type | **iPad + Android tablets** | ⚠️ Conflict. See §0.2 |
| 3 | Audio | **Mic + system audio** | Works on Chromium ✅. Not on Firefox or Safari ✅ |
| 4 | Output | **MP4 + WebM** | See §13 for the reasons |
| 5 | Editing | **None in v1** | No trim tool. Smaller and faster to build |
| 6 | Max length | **2 hours** | Needs disk streaming + safety rules. See §14 |
| 7 | 1080p60 at launch | **Yes** | Needs a device check + fallback. See §7 and §14 |
| 8 | Mac | **No Mac, but an iPad** | Can't use Xcode. See §0.2 |
| 9 | Figma designs | **None** | I design the UI myself: tokens, wireframes, then code |

### Round 2 decisions (same day)

| # | Question | Your answer | What it means |
|---|----------|-------------|---------------|
| 1 | Launch on Chrome + Brave desktop first, then iPad test? | **Yes. Brave is your default browser** | Brave becomes our **main test browser**. See §15 |
| 2 | At 2 hours: stop or warn? | **Warn first** | Warning at 1h45 and at 2h00. No forced stop. See §14 |
| 3 | When disk is low | **Tell the user to use another drive (D:, E:…)** | See §14. Browsers limit what we can do here ⚠️ |
| 4 | MP4 as default? | **Yes** | Locked in |
| 5 | Name | **"Reclux" is final** | Locked in |
| 6 | Start Phase 1? | **Not yet. You will read this report first, then say "start"** | I will not start building until you say so |

## 0.2 The tablet conflict (please read)

You asked for **Chrome + Brave** and for **iPad + Android tablets**. Those two goals do not fit together today.

### What I found

| Device + browser | Extensions? | Screen capture? |
|------------------|:-----------:|:---------------:|
| Chrome · Android tablet | ❌ none ⚠️ | ❌ `getDisplayMedia` not supported ✅ |
| Brave · Android tablet | ❌ none; Brave says "TBD" ⚠️ | ❌ same engine limits ⚠️ |
| Firefox · Android tablet | ✅ some | ❌ same API limit ⚠️ |
| Chrome / Brave · iPad | ❌ none ⚠️ (inferred: all iPad browsers use Apple's engine) | – |
| **Safari · iPad** | ✅ **yes** ✅ | ❓ MDN lists Safari iOS **27**; older sources say none |
| Chrome / Brave · Windows or ChromeOS tablet | ✅ full desktop | ✅ same as desktop |

- **Android tablets:** a browser extension cannot record the screen there. ⚠️ Mobile Chrome/Firefox expose the API but always reject it (`NotAllowedError`).
- **Android alternative:** a *native app* using Android's screen-recording system. That is a separate product. ⚠️
- **Future watch:** Google is building a "desktop-class" Chrome for Android with extensions. No public date. ⚠️
- **iPad:** the only browser with extensions is **Safari**. It is not Chrome or Brave. ⚠️
- **iPad without a Mac:** Apple says Safari extensions can be packaged through App Store Connect with no Mac or Xcode ⚠️ (one source; verify). A paid Apple developer account is still needed. ⚠️
- **You own an iPad:** good. It is our real test device.

### My recommended plan 🎯

```
PHASE 1   Chrome + Brave on desktop   ← build this first
          (also works on Windows / ChromeOS touch tablets)
          UI is fully responsive + touch-ready

PHASE 2   iPad Safari spike           ← 1-day test: does screen
          capture work on your iPad?     capture even exist there?
          If yes → package as Safari extension
          If no  → iPad is not possible as an extension

PHASE 3   Firefox desktop

PHASE 4   Android tablets             ← only via a native app,
          (separate project)             or wait for Chrome-on-Android
                                         extensions
```

- **Decision for you (when ready):** Is Phase 1 okay as the launch?
- The **responsive tablet layouts stay in the design** (§10). They are ready for Windows tablets now and iPad later.

---

## 1. Basic project setup (done)

### What I did

- Created the project in `D:\2026\AI Work Flow\Reclux-extension`
- Used **WXT** (extension toolkit) with the **Svelte** template
- Removed the demo files from the starter
- Named it **Reclux**, with an offline-first description

### Results

| Check | Result |
|-------|--------|
| Chrome build (Manifest V3) | ✅ passes |
| Firefox build (Manifest V3) | ✅ passes |
| Type check (catches code mistakes) | ✅ 0 errors |
| Total extension size | ✅ about 35 kB |

### Folder map

```
Reclux-extension/
├── src/
│   └── entrypoints/
│       ├── background.ts      ← the "brain" (recording logic, later)
│       └── popup/             ← the small window when you click the icon
│           ├── index.html
│           ├── App.svelte     ← the UI screen (your designs go here)
│           ├── main.ts
│           └── app.css        ← styles
├── public/                    ← icons
├── wxt.config.ts              ← extension name, permissions, settings
├── package.json               ← list of tools + shortcut commands
└── report.md                  ← this file
```

### Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Opens Chrome with Reclux, auto-reloads on edits |
| `npm run dev:firefox` | Same, in Firefox |
| `npm run build` | Makes the Chrome version in `.output/chrome-mv3` |
| `npx wxt build -b firefox --mv3` | Makes the Firefox version |
| `npm run check` | Looks for code mistakes |
| `npm run zip` | Makes the file you upload to the store |

### Try it yourself

- **Chrome / Brave / Opera / Edge**
  1. Open `chrome://extensions` (Opera: `opera://extensions`)
  2. Turn on **Developer mode**
  3. Click **Load unpacked**
  4. Pick `.output/chrome-mv3`
- **Firefox**
  1. Open `about:debugging`
  2. Click **This Firefox**
  3. Click **Load Temporary Add-on**
  4. Pick `manifest.json` inside `.output/firefox-mv3`

### Small notes

- ⚠️ WXT builds Firefox as the *old* Manifest V2 by default. I added `--mv3` to use the new one. We should make it the default later.
- Safari is not set up yet. It needs a Mac. See §2.

---

## 2. Tech stack

### The stack at a glance

```
┌─────────────────────────────────────────────┐
│  UI            Svelte 5 + plain CSS         │  ← your designs
├─────────────────────────────────────────────┤
│  Language      TypeScript                   │
├─────────────────────────────────────────────┤
│  Build tool    WXT (on top of Vite)         │  ← one codebase,
│                                             │     many browsers
├─────────────────────────────────────────────┤
│  Recording     getDisplayMedia              │
│                + MediaRecorder              │  ← built into browsers
│                + Mediabunny (later)         │
├─────────────────────────────────────────────┤
│  Storage       OPFS / IndexedDB             │  ← built into browsers
│                + extension storage          │
└─────────────────────────────────────────────┘
```

### Why each choice

| Layer | Choice | Why |
|-------|--------|-----|
| Build tool | **WXT** | Several 2026 comparison articles recommend it as the default for cross-browser projects ⚠️ (WXT's own compare page is self-written). One codebase builds Chrome, Firefox, Edge and Safari ✅ |
| UI | **Svelte 5** | Compiles away, so little code reaches the browser. Our popup is 22.9 kB ✅ (measured). Less code means less RAM 🎯 |
| Language | **TypeScript** | Catches mistakes before users do |
| Styling | **Plain CSS variables** | They map one-to-one to Figma variables, so design tokens stay in sync 🎯 |
| Recording | **Browser built-ins** | No install, no licence, hardware-accelerated |
| Video files | **Mediabunny** (Phase 2) | Successor to webm-muxer / mp4-muxer ✅. Writes WebM and MP4. Tiny: 5.8 kB for WebM, 16 kB for MP4 ✅ |

### What I rejected

| Option | Why not |
|--------|---------|
| Plasmo | Uses Parcel. The maintenance criticism comes from a competitor's blog ⚠️ |
| CRXJS | Build layer only. We'd write the cross-browser glue ourselves ⚠️ |
| React | Works, but a bigger runtime than Svelte 🎯 |
| ffmpeg.wasm | Large, slow and heavy on RAM ⚠️. Mediabunny covers our needs |
| Electron / desktop app | You asked for an extension |
| Plain JS, no framework | Fine for a tiny popup, but harder as screens grow 🎯 |

### Browser support by feature

Versions are the first version that has the feature (from MDN's compatibility data) ✅

| Feature | Chrome | Edge | Opera | Firefox | Safari |
|---------|:------:|:----:|:-----:|:-------:|:------:|
| `getDisplayMedia` (screen picker) | 72 | 79 | 72 | 66 | 13 |
| System / tab audio inside it | 74 | 74 | 74 | ❌ | ❌ |
| `MediaRecorder` | 47 | 47 | 36 | 25 | 14.1 |
| `VideoEncoder` (WebCodecs) | 94 | 94 | 94 | 130 | 16.4 |
| `tabCapture` (record a tab, no picker) | ✅ | ✅ | ✅ ⚠️ | ❌ ⚠️ | ❓ |
| `offscreen` (hidden recorder page) | 109 | ✅ | ✅ ⚠️ | ❌ ⚠️ | ❓ |

- Brave is Chromium too, so it follows the Chrome column ⚠️
- Edge, Opera and Brave versions follow whichever Chromium they ship ⚠️
- ❓ = I could not confirm it
- Firefox `tabCapture` / `offscreen` status comes from the Extension.js docs ⚠️, not from Mozilla

### What this means for design

```
          Chrome  Brave  Opera  Edge │ Firefox │ Safari
Tab capture (no picker)   ✔    ✔     ✔     ✔   │   ✘     │   ?
Screen / window picker    ✔    ✔     ✔     ✔   │   ✔     │  screen only ⚠️
System audio              ✔    ✔     ✔     ✔   │   ✘     │   ✘
Mic audio                 ✔    ✔     ✔     ✔   │   ✔     │   ✔ ⚠️
```

- **Design the UI so options can be greyed out per browser.**
- Example: on Firefox the "Record system audio" toggle is disabled, with a short reason.

### Safari: extra work

- Safari needs the extension wrapped inside a Mac app ⚠️ (from memory, not fetched)
  - Tool: `xcrun safari-web-extension-converter`
  - Needs a Mac and Xcode
  - Sold through the App Store, with an Apple developer account
- Safari on Mac may only record the **entire screen**, not one window or tab ⚠️ (2021 source)
- Safari records MP4 (H.264 + AAC) ✅. WebM arrived in **Safari 18.4** ✅ (WebKit bug tracker + one guide)
- Safari's Manifest V3 support is partial ⚠️

---

## 3. Is a database required?

**No.** ✅

### What we use instead

| Need | Built-in answer | Notes |
|------|-----------------|-------|
| Settings (resolution, fps, mic on/off) | `storage.local` (extension storage) | Tiny. Survives restarts |
| Video data while recording | **OPFS** (Origin Private File System) | Writes straight to disk. Keeps RAM flat ⚠️ |
| List of past recordings (name, date, size) | **IndexedDB** | Built into every browser |
| Final file | "Save as…" to the user's Downloads | User owns the file |

### Why this is good

- No server, no account, no SQL ✅
- Works offline by default ✅
- Nothing to install or maintain
- Privacy story is simple: *"Your videos never leave your device."*

### Watch out

- Browsers can limit storage space ⚠️. Chrome has an `unlimitedStorage` permission option; we should confirm it before relying on it.
- Always offer **"Save now"** right after recording. Don't let people rely on in-browser storage as their only copy. 🎯

### When would we need a database?

- Only if you add **cloud sync, accounts, or sharing links**.
- That's a different product. Skip it for now. 🎯

---

## 4. RAM usage

### The honest answer first

- **Nobody publishes verified, per-browser RAM numbers for a single extension.**
- The articles I found are blogs, they disagree, and most test whole browsers, not extensions ⚠️
- The best proof is to **measure Reclux ourselves** in each browser. A how-to is below.

### Whole browser, about 10 tabs open ⚠️ (blog ranges, low reliability)

| Browser | Rough RAM | Engine | Notes |
|---------|-----------|--------|-------|
| Chrome | ~900 – 1200 MB | Chromium | Baseline |
| Brave | ~750 – 920 MB | Chromium | Ad blocking often lowers it |
| Opera | ~650 – 900 MB | Chromium | Sources range widely |
| Firefox | ~960 MB | Gecko | Reported to scale better at 50+ tabs |
| Safari | ~1200 – 1400 MB | WebKit | Mac only. Sources conflict |
| *(Edge, bonus)* | ~790 MB | Chromium | |

- **Takeaway:** the browser matters less than the extensions installed. ⚠️
- Chrome, Brave and Opera run the same engine, so Reclux should behave about the same in all three. 🎯 (reasoning, not tested)

### What a typical extension costs ⚠️ (blogs, very rough)

| Part | Typical | Notes |
|------|---------|-------|
| Whole small extension | ~12 – 47 MB | Range from one guide |
| Background worker | single-digit to ~40 MB | Two guides disagree |
| Content script (runs inside a page) | ~2 – 20 MB **per tab** | Hidden from Task Manager's extension row |
| Disabled extension | ~0 MB | |

- A **content script** is code injected into every web page. It is the classic RAM trap. We'll avoid it. 🎯

### Where Reclux's RAM would go

```
IDLE                              RECORDING
┌────────────────────┐            ┌─────────────────────────┐
│ Background worker  │            │ Recorder page           │
│ (sleeps when idle) │            │ ┌─────────────────────┐ │
│  ≈ 0 MB asleep     │            │ │ Captured frames     │ │ ← biggest
└────────────────────┘            │ │ (raw, uncompressed) │ │
                                  │ └─────────────────────┘ │
No popup open = nothing           │ ┌─────────────────────┐ │
else running                      │ │ Video encoder       │ │ ← medium
                                  │ └─────────────────────┘ │
                                  │ ┌─────────────────────┐ │
                                  │ │ 1-second chunks     │ │ ← small,
                                  │ │ → written to disk   │ │   if we do
                                  │ └─────────────────────┘ │   it right
                                  └─────────────────────────┘
```

- One raw 1080p frame is about **8.3 MB** (see §7)
- An encoder keeps several frames in flight. Exact numbers vary by browser ⚠️
- **The #1 mistake:** keeping the whole video in RAM until you hit Stop. A 30-minute recording could then cost gigabytes. ⚠️

### Reclux RAM targets 🎯

These are **goals to test against**, not measurements.

| State | Target |
|-------|--------|
| Idle (installed, nothing open) | as close to 0 as possible |
| Popup open | under about 15 MB |
| Recording 720p | low hundreds of MB at most |
| Recording 1080p60 | measure, then set a cap |

### Rules that keep RAM low 🎯

1. **No content scripts** on normal pages
2. **No always-on background** (Manifest V3 workers sleep on their own)
3. **Save to disk every second** (chunks) — never hold the full video
4. **Load the recorder page only while recording**, then close it
5. **Stop all tracks** when done, so the browser frees the capture
6. **One recording at a time**
7. **No heavy libraries** (no ffmpeg.wasm, no big UI kits)
8. **Small thumbnails** in the library; load them lazily
9. **Prefer hardware encoding** when available ⚠️
10. **Auto-fallback:** if frames drop, offer to lower fps

### How to measure (no coding needed)

| Browser | Tool |
|---------|------|
| Chrome / Brave / Edge / Opera | Press `Shift + Esc` (Task Manager) ⚠️ |
| Firefox | Type `about:processes` in the address bar |
| Safari | Activity Monitor (Mac) |

- Test three times: **idle**, **popup open**, **recording 10 minutes**
- Write the numbers in a small table. We'll compare them with the targets.

---

## 5. Is internet required?

**No, not to record.** ✅

### Short answer

| Connection | Needed? |
|------------|:-------:|
| Wi-Fi | ❌ |
| Mobile data (4G / 5G) | ❌ |
| LAN / Ethernet | ❌ |
| None at all (airplane mode) | ✅ works |

### When internet *is* needed

| Moment | Why |
|--------|-----|
| First install | Download from the store |
| Updates | Browser updates the extension in the background |
| Optional future features | Cloud upload, sharing links (not planned) |

### Why it can work offline

- Recording APIs (`getDisplayMedia`, `MediaRecorder`) run on the device ✅
- Manifest V3 requires **all code inside the extension package**. No code pulled from the internet ✅
- Fonts and icons must be bundled too. **No Google Fonts link.** 🎯

### Design rule

- If the UI shows a cloud-style icon or a "sync" state, it will mislead users. Keep the UI honest: **"Saved on this device."** 🎯

---

## 6. Minimum browser versions

### Recommended minimums 🎯

> Launch scope (your decision): **Chrome 116+ and Brave (Chromium 116+)**. Other rows are for later phases.

| Browser | Minimum | Why |
|---------|---------|-----|
| **Chrome** | **116** | First version where a service worker can start tab capture and hand it to a hidden recorder page ✅ |
| **Edge** | 116 | Same Chromium |
| **Brave** | Chromium 116 inside | Check `brave://version` ⚠️ |
| **Opera** | Chromium 116 inside | Check `opera://about` ⚠️ |
| **Firefox** | **121** | Mozilla says one manifest can serve both Chrome and Firefox from 121 ⚠️ |
| Firefox (if using WebCodecs) | 130 | `VideoEncoder` appears in 130 ✅ |
| **Safari** | **16.4** minimum, **18.4** recommended | 16.4 has WebCodecs ✅ and fixes an early MV3 bug ⚠️. 18.4 adds WebM ✅ |

### Why not support older?

- Older Chrome cannot do the tab-capture trick ✅
- Older browsers also lack security fixes
- Each older version adds testing work. Fewer versions means fewer bugs. 🎯

### Other facts that shape this

- Chrome removed the old Manifest V2 system in 2026 (Chrome 151, July) ⚠️
- The Chrome Web Store now needs Manifest V3 ⚠️
- Firefox keeps both V2 and V3 ⚠️
- Opera and Brave still have limited V2 support, but **we ignore that** and build V3 only 🎯

### Check before launch

- Test on the **oldest** supported version, not just the newest. A quick way is to download old portable builds of each browser. 🎯

---

## 7. How frames work (simple version)

### The flipbook idea

- A video is a **flipbook**. Many still pictures shown very fast.
- Each picture is a **frame**.
- **fps = frames per second** = how many pictures per second.

```
30 fps  →  30 pictures every second
60 fps  →  60 pictures every second  (twice as smooth)

 Time →  0s ─────────────────────────── 1s
 30 fps  │▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ▌ ...│  every 33 ms
 60 fps  │▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌...│  every 16 ms
```

### What 720p and 1080p mean

- **720p** = 1280 × 720 pixels
- **1080p** = 1920 × 1080 pixels (about 2.25× more pixels)

```
720p              1080p
┌──────────┐      ┌───────────────┐
│          │      │               │
│ 1280×720 │      │   1920×1080   │
│          │      │               │
└──────────┘      └───────────────┘
 0.92 million      2.07 million
 pixels            pixels
```

### The recording pipeline

```
 SCREEN ──► CAPTURE ──► ENCODE ──► SAVE ──► FILE
  (you      grab        squash     write     .webm
  see it)   frames      them       chunks    or .mp4
            (BIG)       (small)    to disk
```

- **Capture:** the browser grabs a frame. Raw frames are huge.
- **Encode:** a codec (VP9, H.264…) compresses them. It stores mostly *what changed*, not every pixel again.
- **Save:** small pieces are written to disk every second.
- **Why it matters:** the big, raw part exists only briefly. That's how we keep RAM low.

### Why higher settings cost more

Raw (uncompressed) size per second. Estimated: pixels × 4 bytes × fps. 🎯

| Preset | Pixels | One raw frame | Raw data per second |
|--------|-------:|--------------:|--------------------:|
| 720p · 30 fps | 0.92 M | 3.7 MB | ~111 MB/s |
| 720p · 50 fps | 0.92 M | 3.7 MB | ~184 MB/s |
| 720p · 60 fps | 0.92 M | 3.7 MB | ~221 MB/s |
| 1080p · 30 fps | 2.07 M | 8.3 MB | ~249 MB/s |
| 1080p · 50 fps | 2.07 M | 8.3 MB | ~415 MB/s |
| 1080p · 60 fps | 2.07 M | 8.3 MB | ~498 MB/s |

- The computer must squash that firehose in real time.
- That's why **1080p60 is the hardest preset** and may fail on weaker laptops.

### Final file size (after compression) 🎯

Starting bitrates I'd test. They borrow from YouTube-style upload guidance, from memory ⚠️. 50 fps is my interpolation.

| Preset | Starting bitrate | Approx. size per minute |
|--------|-----------------:|------------------------:|
| 720p · 30 | 5 Mbps | ~38 MB |
| 720p · 50 | 6.5 Mbps | ~49 MB |
| 720p · 60 | 7.5 Mbps | ~56 MB |
| 1080p · 30 | 8 Mbps | ~60 MB |
| 1080p · 50 | 10 Mbps | ~75 MB |
| 1080p · 60 | 12 Mbps | ~90 MB |

- If we set no bitrate, Chrome defaults to about **2.5 Mbps** ✅. That looks blurry at 1080p. **We must set it ourselves.**

### Things that surprise people

- **fps is a request, not a promise.**
  - The browser may deliver fewer frames when the computer is busy ✅
  - Browser tests accept anything from about 0.5× to 1.75× of what you asked ✅
  - We must **check the real result** after starting 🎯
- **Static screens send fewer frames** ⚠️. A still slide uses less data than a game.
- **A screen can't show more fps than it refreshes** ⚠️. A 60 Hz monitor tops out at 60.
- **50 fps on a 60 Hz screen may look slightly jittery** ⚠️. 50 fps suits 50 Hz regions (PAL). Ask users which they want.
- **Dropped frames** = the computer couldn't keep up. Motion looks choppy.
- **Pause** = no frames are recorded. The final video skips the paused part with no gap. ⚠️

### What to design for

- A **"Quality" picker** with six clear presets.
- A small **warning** on 1080p50 / 1080p60: *"Needs a fast computer."*
- A **live fps readout** while recording (optional, in a "details" area).
- An **auto-fallback prompt:** *"Your computer is struggling. Switch to 30 fps?"*

### "Export" vs "Record" — an important decision

| Approach | How it works | RAM | Complexity |
|----------|--------------|:---:|:----------:|
| **A. Choose before recording** | Pick 720p/1080p and fps first. Record once. | Low | Simple |
| **B. Convert after recording** | Record big, then re-encode to a new size/fps. | High | Complex |

- 🎯 **Start with A.** Your "export options" become "recording options."
- B can come later if you add a trim/edit feature.

---

## 8. UX layouts (ASCII)

> These are wireframes for thinking, not final designs.
> Sizes are for Desktop first. Tablet is in §10.

### 8.1 The recording state machine

```
              ┌────────┐
     open ──► │  IDLE  │ ◄───────────────────────┐
              └───┬────┘                         │
                  │ click Record                 │
                  ▼                              │
           ┌─────────────┐   cancel / Esc        │
           │  PICK SOURCE│ ──────────────────────┤
           │ (browser    │                       │
           │  dialog)    │                       │
           └──────┬──────┘                       │
                  │ chosen                       │
                  ▼                              │
           ┌─────────────┐                       │
           │ COUNTDOWN   │ 3 · 2 · 1             │
           └──────┬──────┘                       │
                  ▼                              │
  ┌──────► ┌─────────────┐ ──── Pause ──┐        │
  │        │ RECORDING   │              ▼        │
  │ Resume └─────────────┘        ┌──────────┐   │
  └────────────────────────────── │  PAUSED  │   │
                  │               └────┬─────┘   │
                  │ Stop               │ Stop    │
                  ▼                    ▼         │
           ┌─────────────────────────────┐       │
           │  FINISHED  (Save / Discard) │ ──────┘
           └─────────────────────────────┘
```

### 8.2 Popup · IDLE (Setup)

```
┌──────────────────────────────────────┐
│  ● Reclux                      ⚙  ?  │  ← header
├──────────────────────────────────────┤
│                                      │
│  What to record                      │
│  ┌──────────┬──────────┬──────────┐  │
│  │  ▭ Tab   │ ▢ Window │ 🖥 Screen│  │  ← segmented control
│  └──────────┴──────────┴──────────┘  │
│                                      │
│  Quality                             │
│  ┌────────────────────────────────┐  │
│  │ 1080p · 30 fps              ▾  │  │  ← dropdown
│  └────────────────────────────────┘  │
│                                      │
│  Audio                               │
│  [ 🎤 Microphone      ○──● ON  ]     │
│  [ 🔊 System audio    ●──○ OFF ]     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │        ●  Start recording      │  │  ← primary button
│  └────────────────────────────────┘  │
│                                      │
│  📁 Recordings (4)   ·  ⏱ 12 min     │  ← link to library
│  ✓ Works offline · Saved on device   │
└──────────────────────────────────────┘
        about 360 × 480 px
```

### 8.3 Countdown

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                 3                    │  ← big number
│            ─────────────             │
│            Starting in…              │
│                                      │
│          [ Cancel · Esc ]            │
│                                      │
└──────────────────────────────────────┘
```

### 8.4 Control bar · RECORDING

The popup closes when you click elsewhere ✅, so the controls need a home that stays open: a small recorder window or a tab. 🎯

```
┌───────────────────────────────────────────────────────────┐
│  ● REC   00:12:48   │ 1080p·30 │ 128 MB │   ⏸   ⏹   🎤    │
│  (pulses)           │  fps ok  │        │ Pause Stop Mute │
└───────────────────────────────────────────────────────────┘
   status    timer       info       size      actions
```

- Button order, left → right: **Pause · Stop · Mute**
- **Stop** gets the strongest colour (red). **Pause** is neutral.
- The red dot should **pulse** only if the user hasn't asked for reduced motion. 🎯

### 8.5 Control bar · PAUSED

```
┌───────────────────────────────────────────────────────────┐
│  ❚❚ PAUSED  00:12:48   │ 1080p·30 │ 128 MB │  ▶   ⏹   🎤  │
│  (dot stops pulsing)                          Resume Stop   │
└───────────────────────────────────────────────────────────┘
```

- The timer **stops** while paused.
- The Pause button **becomes** Resume, in the same spot. This avoids mis-clicks.

### 8.6 Finished screen

```
┌──────────────────────────────────────┐
│  ✓ Recording saved                   │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │      ▶  video preview          │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│  Reclux 2026-10-28 09.41             │
│  12:48 · 1080p30 · 61 MB             │
│                                      │
│  ┌────────────────┐ ┌─────────────┐  │
│  │ ⬇ Save file    │ │ 🗑 Discard  │  │
│  └────────────────┘ └─────────────┘  │
│  [ Rename ]  [ Record again ]        │
└──────────────────────────────────────┘
```

### 8.7 Error and warning states (do not skip these)

```
┌──────────────────────────────────────┐
│ ⚠ Your computer is struggling.       │
│   Frames are being dropped.          │
│   [ Switch to 30 fps ]  [ Keep ]     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ⛔ Screen access is blocked.         │
│   macOS: System Settings →           │
│   Privacy → Screen Recording         │
│   [ Show me how ]                    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ℹ System audio isn't available in    │
│   Firefox. Mic still works.          │
└──────────────────────────────────────┘
```

### 8.8 Button states cheat-sheet

| Button | Idle | Recording | Paused | Finished |
|--------|:----:|:---------:|:------:|:--------:|
| Record | ✅ | – | – | ✅ ("again") |
| Pause | – | ✅ | – | – |
| Resume | – | – | ✅ | – |
| Stop | – | ✅ | ✅ | – |
| Mute mic | ✅ | ✅ | ✅ | – |
| Save | – | – | – | ✅ |
| Discard | – | – | – | ✅ |

### 8.9 Shortcuts worth planning 🎯

- `Alt + Shift + R` start / stop
- `Alt + Shift + P` pause / resume
- Show them on the buttons as tooltips.

---

## 9. Online or offline?

**Offline. Always. By design.** ✅

### Position

```
┌─────────────────────────────────────┐
│          Reclux is OFFLINE          │
│                                     │
│  record ─► encode ─► save ─► export │
│     all on this device, no upload   │
└─────────────────────────────────────┘
```

### How we guarantee it 🎯

- **Zero network calls** in the first version
- **No analytics, no crash reporting, no ads**
- **No host permissions** such as "all websites." Fewer permissions also build trust
- **Bundle every font, icon and image**
- Add a Content Security Policy that blocks outside connections ⚠️ (I believe `connect-src 'none'` is allowed. We'll verify.)
- Add a **"Test offline"** step to every release checklist: turn on airplane mode and record 1 minute

### What the user sees

- A small label: **"Works offline · Saved on this device"**
- Store listing line: *"No account. No upload. No tracking."*

### The one exception

- Updates arrive through the browser store. That's the browser's job, not ours. ✅

---

## 10. Cross-browser compatibility + Desktop and Tablet responsiveness

### 10.1 Cross-browser plan

```
        ONE CODEBASE  (src/)
              │
           WXT build
   ┌─────────┬─┴────────┬──────────┐
   ▼         ▼          ▼          ▼
Chromium   Firefox    Safari      (Edge uses
build      build      build        Chromium build)
(Chrome,   MV3        needs a Mac
Brave,                + Xcode
Opera,
Edge)
```

### Rollout order 🎯

| Phase | Browsers | Notes |
|-------|----------|-------|
| 1 | Chrome, Edge, Brave, Opera | One build. Biggest audience |
| 2 | Firefox | Disable tab-capture and system-audio options |
| 3 | Safari | Needs a Mac, Xcode, Apple account. Limited features |

### Compatibility rules 🎯

1. **Feature detection, not browser detection.** Ask "can this browser do X?" and don't guess from its name.
2. **Every optional feature needs a fallback state** in the UI (disabled + reason).
3. **Test the real recording**, not just that the page loads. Recording fails in odd ways.
4. **Test file playback** in Chrome, Firefox, Safari, VLC and QuickTime.
5. **Test on a real Mac with a real Retina display.** 

### Store logistics ⚠️ (from memory, please verify)

| Browser | Where to publish | Cost |
|---------|------------------|------|
| Chrome / Brave | Chrome Web Store | one-time fee, small |
| Edge | Microsoft Edge Add-ons | free |
| Opera | Opera add-ons | free |
| Firefox | addons.mozilla.org | free |
| Safari | App Store | yearly developer fee |

### 10.2 What "Tablet" really means (important)

> Updated: you chose iPad + Android tablets. The full finding is in **§0.2**. Short version: Android tablets can't run a screen-recording extension, and Chrome/Brave on iPad can't run extensions.

Original reality check ⚠️:

| Tablet type | Extensions? | Screen recording? |
|-------------|:-----------:|:-----------------:|
| Windows tablet / 2-in-1 (Surface…) | ✅ desktop Chrome/Edge/Firefox | ✅ same as desktop |
| ChromeOS tablet | ✅ desktop Chrome | ✅ same as desktop |
| Android tablet · **Chrome** | ❌ no extensions | – |
| Android tablet · **Firefox** | ✅ about 450+ listed add-ons (Dec 2023) | ❓ unconfirmed |
| iPad · Safari | ✅ Safari extensions | ❓ `getDisplayMedia` on iOS is unclear. MDN data says Safari iOS **27**; older sources say none |

- **Biggest takeaway:** on many "tablets," a screen recording *extension* simply can't run.
- The realistic tablet targets today are **Windows/ChromeOS touch devices** and maybe **iPad Safari**.
- 🎯 We should design for **touch + tablet widths**, and be honest in the listing about which tablets work.

### 10.3 Responsive layout plan 🎯

Three widths. One design system.

```
 COMPACT            MEDIUM                 EXPANDED
 popup              tablet / small window  desktop tab
 ≈ 360 px           ≈ 600 – 900 px         ≥ 1024 px

┌─────────┐     ┌──────────────────┐   ┌──────────────────────────┐
│ header  │     │ header           │   │ header                   │
├─────────┤     ├────────┬─────────┤   ├────────┬─────────────────┤
│ source  │     │ source │ preview │   │ setup  │ preview         │
│ quality │     │ quality│         │   │        │                 │
│ audio   │     ├────────┴─────────┤   │        ├─────────────────┤
│ [Start] │     │   [Start]        │   │        │ library grid    │
│ library │     │ library (2 col)  │   │        │ (3–4 columns)   │
└─────────┘     └──────────────────┘   └────────┴─────────────────┘
 1 column         1–2 columns            2-pane layout
```

### Tablet layout wireframe (landscape ≈ 1000 × 700)

```
┌────────────────────────────────────────────────────────────────┐
│  ● Reclux                                          ⚙   ?      │
├───────────────────────────┬────────────────────────────────────┤
│  What to record           │                                    │
│  [ Tab ][ Window ][Screen]│        ┌──────────────────┐        │
│                           │        │  Live preview    │        │
│  Quality                  │        │                  │        │
│  [ 1080p · 30 fps     ▾ ] │        └──────────────────┘        │
│                           │                                    │
│  Audio                    │  ● REC  00:12:48  128 MB           │
│  🎤 Mic         ○──● ON   │                                    │
│  🔊 System      ●──○ OFF  │    ┌──────┐  ┌──────┐  ┌──────┐    │
│                           │    │  ⏸   │  │  ⏹   │  │  🎤  │    │
│  ┌─────────────────────┐  │    │Pause │  │ Stop │  │ Mute │    │
│  │   ● Start recording │  │    └──────┘  └──────┘  └──────┘    │
│  └─────────────────────┘  │       (large touch buttons)        │
└───────────────────────────┴────────────────────────────────────┘
```

### Touch and tablet rules 🎯

| Rule | Value |
|------|-------|
| Minimum tap target | at least 44 × 44 px (Apple) / 48 px (Google) ⚠️ |
| Space between targets | at least 8 px |
| Hover-only actions | **avoid**. Touch has no hover |
| Tooltips | also show labels, or long-press |
| Primary action position | bottom or thumb-reachable on tablets |
| Text size | 16 px minimum for body |
| Orientation | support landscape and portrait |
| Pointer types | test mouse, touch and pen |

### Popup limits to design around ⚠️

- Browser popups have a **maximum size** (about 800 × 600) and close when they lose focus.
- So:
  - **Popup** = quick launcher only
  - **Recorder window or tab** = the full, responsive experience
  - **Side panel** (Chromium) can be an option later. It isn't available everywhere. ⚠️

### Accessibility basics (non-negotiable) 🎯

- Full **keyboard** control
- Visible **focus** rings
- **Contrast** of WCAG AA or better
- Screen-reader labels on icon-only buttons
- Respect **reduced-motion** (no pulsing)
- Light and dark mode, using design tokens

---

## 11. Things you may have missed — and my questions for you

> Status: Q1–Q9 below are **answered** (see §0.1). New open questions are at the end of this section.

### Gaps I noticed

- **Audio:** microphone? system sound? both? (Firefox and Safari can't capture system audio ✅)
- **Webcam bubble** (face in the corner)? Popular in recorders.
- **What to capture:** tab, window or entire screen?
- **Output format:** WebM only, or MP4 too? (MP4 reaches more apps and phones.)
- **Maximum length:** how long should a single recording be allowed to run?
- **Editing:** trimming? Or just record-and-save?
- **Annotations:** cursor highlight, click ripples, drawing while recording?
- **Where the controls live** while recording (see §8.4)
- **Business model:** free, paid, ads? (Affects privacy promises.)
- **Languages** and right-to-left support
- **Permissions screens** (macOS needs special permission; first-run help matters)
- **Privacy policy and store listing** — required by every store
- **Name check:** is "Reclux" free to use as a name and domain?
- **Legal/recording consent** notes for users recording others
- **Testing devices:** do you have a Mac, a Windows tablet, an iPad?

### Questions

1. **Who is Reclux for?** (students, teachers, developers, support teams, gamers?)
2. **Which browsers are must-have** at launch, and which are nice-to-have?
3. **What does "tablet" mean to you?** iPad, Android tablet, Windows touch laptop, or all?
4. **Audio:** mic only, or system audio too? Is a Firefox build without system audio acceptable?
5. **Output:** WebM is easier. MP4 is friendlier. Which matters more?
6. **Do you want a webcam overlay** in version 1?
7. **Do you want trimming/editing** in version 1, or only record and save?
8. **How long will typical recordings be?** (5 minutes, or 2 hours?)
9. **Is 1080p60 a must for launch?** It's the riskiest preset on weak hardware.
10. **Do you have Figma designs yet?** I can connect to Figma and build the UI from your frames.
11. ~~**Do you own a Mac?**~~ Answered: no Mac, but an iPad.
12. **Free or paid product?** It changes what we build first.

### New open questions (from your answers)

1. **Tablet launch:** Is it OK to launch on Chrome + Brave desktop first, with iPad as a tested Phase 2? (§0.2)
2. **Android tablets:** Do you want a *native Android app* later? It is a different project.
3. **iPad test:** Can you run a short screen-capture test on your iPad when I give you a test page?
4. **Apple account:** Are you willing to pay for an Apple developer account if the iPad test works?
5. **Default format:** Are you happy with MP4 as the default and WebM as the alternative? (§13)
6. **2-hour limit:** When time runs out, should Reclux stop automatically or just warn? (§14)
7. **Free-space rule:** Should Reclux refuse to start if there is not enough disk space? (§14)
8. **Name:** Is "Reclux" final? (affects icons, store pages, domain)

---

## 12. Suggested roadmap 🎯

```
PHASE 0  ✔ Setup, builds for Chrome + Firefox            (done)
PHASE 1  ✔ Design: tokens, components, screens (clickable, no real recording)
PHASE 2  ✔ Prototype: record screen → save file (Chrome/Brave). See §17
           (pause, resume, stop, countdown, audio and all 6 presets already work)
PHASE 3  ✔ Real fps measurement · "struggling" warning · Switch to 30 fps. See §18
           (pause/resume/stop, countdown, presets, audio were already done in Phase 2)
PHASE 4  ✔ Settings remembered between visits · popup quick options. See §20
PHASE 5  ✔ Crash-safe MP4 (WebCodecs + Mediabunny) · WebM duration fixed · disk streaming
           · recover-after-crash. See §19
PHASE 6  ✔ 2-hour safety: real low-space guard · keep PC awake · unlimited storage · real 2-hour test. See §21
PHASE 7  ✔ Responsive layouts: desktop + touch tablet · accessibility. See §22
PHASE 8  ✔ Offline test · store listing (Chrome Web Store). See §23 (you still must publish it)
PHASE 9  ⏸ iPad Safari spike: research done. **Parked**: your iPad has iPadOS 26.6, screen capture needs 27. See §24
PHASE 10 ✔ Firefox (works in real Firefox 159) + Opera check. See §25
LATER      Android tablets (native app only)
```

---

## 13. Why MP4 and WebM? (your Q4)

> I read "these two extensions" as the two **file extensions**, `.mp4` and `.webm`.

### Plain-English summary

- **WebM** = what browsers record most naturally. Free and open.
- **MP4** = what everyone can open. Phones, iPads, editors, chat apps.
- Offering **both** means: *record easily* + *share anywhere*.

### Side by side

| | **MP4** (H.264 + AAC) | **WebM** (VP8/VP9 + Opus) |
|---|---|---|
| Plays on iPhone / iPad / Mac | ✅ yes | ⚠️ partly. Safari added WebM recording in 18.4 ✅. Older devices vary |
| Plays on Windows / Android | ✅ yes | ✅ yes |
| Works in video editors | ✅ almost all ⚠️ | ⚠️ many need a convert step |
| Easy to share (chat, email, LMS) | ✅ best ⚠️ | ⚠️ some apps reject it |
| Open, royalty-free | ❌ H.264 is patent-licensed ⚠️ | ✅ yes |
| Chrome records it natively | ✅ yes. Chromium added MP4 muxing to `MediaRecorder` (Feb 2024 proposal) ✅. Exact first version unconfirmed ❓ | ✅ yes. Longest-supported option ✅ |
| Firefox / Safari records it natively | Safari ✅ (MP4 is its original format). Firefox ❓ | Firefox ✅. Safari 18.4+ ✅ |
| Handles an interrupted recording | ❌ **Measured (§17):** Chrome's MP4 recorder holds everything until Stop, so a crash loses it all | ✅ **Measured (§17):** sends data every second, so a crash keeps most of it |
| Known quirk | Needs the right encoder set-up | **Chrome's WebM has no duration, so seeking fails** ✅ |

### The WebM "no duration" bug ✅

- Files made by Chrome's `MediaRecorder` often show a duration of 0/∞ and can't be scrubbed. Firefox files too. ✅ (AddPipe, Mozilla bug)
- **Fix:** add the missing data after recording (`fix-webm-duration`), or write the file ourselves with **Mediabunny**. ✅
- Result for users: a normal, seekable file.

### What Reclux will do 🎯

```
Start recording
      │
      ▼
 Format = MP4 (default)?
      │
  ┌───┴────────────────────┐
  │ can this browser do    │
  │ MP4 + H.264 here?      │
  └───┬───────────────┬────┘
    yes               no
      │               │
      ▼               ▼
   record MP4     record WebM,
                  tell the user:
                  "Saved as WebM
                   for this device"
```

- **Default = MP4**, because the audience (iPad, phones, editors, sharing) needs it.
- **WebM = alternative**, and the automatic fallback when MP4 is not possible.
- The UI shows **one setting:** "Format: MP4 (recommended) · WebM".
- We check what the browser really supports using `isTypeSupported()` ✅ (never guess from the browser's name).

### Audio inside each format

| Format | Audio codec |
|--------|-------------|
| MP4 | AAC |
| WebM | Opus |

- Both work with mic + system audio on Chrome/Brave. ✅
- System audio is **not** available on Firefox or Safari. ✅

---

## 14. The 2-hour recording plan (your Q6 and Q7)

### Size of a 2-hour recording 🎯

Based on the starting bitrates in §7. Real numbers will differ.

| Preset | Per minute | **2 hours** |
|--------|-----------:|------------:|
| 720p · 30 | ~38 MB | **~4.5 GB** |
| 720p · 50 | ~49 MB | **~5.9 GB** |
| 720p · 60 | ~56 MB | **~6.8 GB** |
| 1080p · 30 | ~60 MB | **~7.2 GB** |
| 1080p · 50 | ~75 MB | **~9.0 GB** |
| 1080p · 60 | ~90 MB | **~10.8 GB** |

- That's **gigabytes**, so it must **never sit in RAM**. ⚠️
- It must stream to disk piece by piece. See §3 and §4.

### The 2-hour safety checklist 🎯

| Risk | Rule |
|------|------|
| Not enough disk space | Estimate size **before** starting. Show it. Warn if space is short (the browser can report free space ⚠️). See "Low disk space" below |
| Disk fills up mid-recording | Warn at a threshold. Auto-stop cleanly and keep the file (this one is a safety stop, because a full disk would corrupt the file) |
| Browser or PC crashes | Write in small pieces so the part already saved survives. Prefer **fragmented MP4** or WebM ⚠️. Offer **"Recover last recording"** at next launch |
| Laptop sleeps | Ask the browser to keep the screen awake while recording ("Wake Lock") ⚠️ |
| Laptop on battery | Show a "plug in" hint on 1080p50/60 |
| Computer too slow | Live fps check. Offer to drop to 30 fps |
| Hit 2 hours | **Decided: warn first.** Warning at 1h45, again at 2h00. Recording keeps going unless the user stops it. The free-space check keeps running, so a full disk still stops safely |
| Recorder tab closed by accident | Confirm before closing. Save what exists |
| Huge file to save | Save straight from disk storage. Don't load it into RAM to download |
| Old drives (FAT32) | Files over 4 GB can fail on FAT32 drives ⚠️ (from memory). Warn when the target drive looks old |

### Low disk space: the "use another drive" message (your Q3)

What you asked for is a message like *"Low space. Use another drive such as D: or E:"*. Here is what a browser extension can and cannot do:

| Question | Answer |
|----------|--------|
| Can Reclux see how much space is free? | ⚠️ Only an estimate for the browser's own storage. Not a list of your drives |
| Can Reclux list drives (C:, D:, E:)? | ❌ No. Browsers hide that for privacy ⚠️ |
| Can the user choose where to save? | ✅ Yes, with a "Save as…" window at save time |
| Can recording go straight to D:? | ⚠️ Only with the File System Access API, which **Brave blocks by default**. See §15 |

So the honest design is:

```
BEFORE START
  estimate size  ──►  enough space?
                        │
                 ┌──────┴───────┐
                yes            no / unsure
                 │              │
                 ▼              ▼
              start      ┌──────────────────────────────┐
                         │ ⚠ Low disk space             │
                         │ This recording needs ~7 GB.  │
                         │ Free up space, or lower the  │
                         │ quality.                     │
                         │ Tip: if you have another     │
                         │ drive (D:, E:…), save the    │
                         │ finished file there.         │
                         │ [Lower quality] [Start anyway]│
                         └──────────────────────────────┘
```

- **While recording** the file lives in the browser's storage. That is usually on the same drive as Brave's profile (often C:). ⚠️
- **After recording** the user picks any drive in "Save as…". The D:/E: tip is true at this step. ✅
- **To record straight onto D:** the user would need to turn on a Brave setting first (§15). We can show this as an optional "Advanced" help link.
- The message must not promise something we can't do. It says *"if you have another drive"*, because we can't see them.

### 1080p60 "of course" — how we make it safe 🎯

1. **Test the device first.** Ask the browser if it can encode 1080p60 (`VideoEncoder.isConfigSupported` ✅ exists in Chrome 94+).
2. **Prefer hardware encoding** when available. ⚠️ (It's only a hint to the browser.)
3. **Check real fps** while recording. The request is not a promise. ✅
4. **Offer a fallback:** "Switch to 1080p30".
5. **Keep a "Performance" note** in the UI for 1080p50/60: "Needs a fast computer."
6. **Test on a weak laptop** before launch, not just your best one.

### What I couldn't confirm ❓

- Exact disk-space limits for browser storage in Chrome and Brave
- ~~Whether Chrome's built-in MP4 output is fragmented (crash-safe)~~ **Answered in Phase 2 (§17): it is not.** Data arrives only at Stop
- Whether the recorder page keeps running at full speed for 2 hours when hidden

→ These need a **2-hour real test** on Windows. I'll put them in the first prototype's test plan.

---

## 15. Brave notes (your default browser)

Brave is Chromium-based, so our Chrome build should load in it. These differences matter. ⚠️

| Topic | What I found |
|-------|--------------|
| Extension install | Brave installs from the Chrome Web Store ⚠️ (from memory). For dev, "Load unpacked" works the same as in Chrome |
| Tab capture + hidden recorder page | Should work, since Brave is Chromium. **Not confirmed for Brave in any source** ❓ |
| **File System Access API** (save straight to a chosen folder or drive) | ⚠️ **Blocked by default in Brave.** Google's article says it is only available behind a flag in Brave ✅. A Brave issue (#44411) asks for an opt-in setting ✅. I did not find the exact flag name or 2026 status ❓ |
| Brave Shields / fingerprint protection | ❓ Could change canvas or media behaviour. No source found. Test with Shields on and off |
| Brave Android | No extensions ⚠️ (see §0.2) |

### What this changes in the plan 🎯

1. **Brave is the main test browser.** Chrome is the second.
2. **Don't depend on "save straight to D:".** Use the browser's own storage while recording, then "Save as…" at the end. This works in Brave today.
3. **Optional power feature:** "Record directly to a folder." It turns on only if the browser allows it. Brave users would first enable a setting. We hide it when unavailable.
4. **Feature-detect, never browser-sniff.** If `showSaveFilePicker` exists, offer the direct option. Otherwise don't.
5. **First prototype test list for Brave:** record 1 minute with Shields on, then off. Check video, audio, and file playback.

### Confirmed on your Brave ✅

- You checked `brave://flags`: **"File System Access API" is Default (disabled).**
- So "record straight to D:" is **off** for normal Brave users.
- The "Save file" step (pick any drive) is our main route. The direct-to-folder option stays hidden unless the flag is on.

---

## 16. Phase 1 result: the first design (done)

**What you can do now:** open it in Brave and click through every screen. Nothing is recorded yet. This is the design, running.

### How to open it

1. Run `npm run build` in the project folder
2. Brave → `brave://extensions` → turn on **Developer mode**
3. **Load unpacked** → pick `.output/chrome-mv3`
4. Click the Reclux icon → **Open full recorder**
5. The grey **"Design preview"** bar at the top jumps between screens

### Screenshots (in `docs/phase1/`)

| File | Shows |
|------|-------|
| `01-desktop-setup-light.png` | Desktop setup screen, light |
| `02-desktop-recording-dark.png` | Recording screen, dark |
| `03-tablet-low-disk-light.png` | Tablet width, low-disk warning |
| `04-tablet-recording-warning-light.png` | Tablet width, "computer is struggling" warning |
| `05-countdown-light.png` | 3·2·1 countdown |
| `06-finished-dark.png` | Finished screen + "Save file" tip |
| `07-popup-light.png` | Small popup from the toolbar icon |

### What is designed

| Screen / state | Done |
|----------------|:----:|
| Popup (launcher) | ✅ |
| Setup: source, quality (6 presets), format, audio | ✅ |
| Countdown | ✅ |
| Recording + Pause / Resume / Stop / Mute | ✅ |
| Paused | ✅ |
| Finished: Save, Discard, Rename, Record again | ✅ |
| Recordings list (sample data) | ✅ |
| Low-disk warning with the "other drive" tip | ✅ |
| "Computer is struggling" warning | ✅ |
| 1h45 and 2h00 notices (warn only, never force-stop) | ✅ |
| Light + dark mode | ✅ |
| Desktop + tablet-width layouts | ✅ |

### Design decisions I made (please react to these) 🎯

| Decision | Choice |
|----------|--------|
| Brand colour | **"Record red" `#D7263D`**. Used only for Start, Stop and the recording dot |
| Neutrals | Cool grey. White and near-black backgrounds |
| Font | **System font** (no downloads, so it works offline) |
| Spacing | 4 px grid (4, 8, 12, 16, 24, 32) |
| Corners | 8 / 12 / 16 px, pills for chips |
| Touch size | 44 px on mouse, **48 px on touch** screens. Recording buttons become stacked icon + label (72 px tall) on touch |
| Layout | **Under 700 px wide:** one column. **700 px and up:** setup on the left, stage on the right |
| Recording controls | Live inside the **full recorder page**, not the popup, because the popup closes when it loses focus ✅ |
| Contrast | Text colours chosen to meet WCAG AA. I did not run a formal audit ⚠️ |
| Motion | Red dot pulses. It stops for people who turned on "reduce motion" |

### Where the design lives (for later edits)

| What | File |
|------|------|
| Colours, spacing, type, sizes | `src/styles/tokens.css` |
| Quality presets + size maths | `src/lib/presets.ts` |
| Screens and parts | `src/lib/*.svelte` |
| Full recorder page | `src/entrypoints/recorder/` |
| Popup | `src/entrypoints/popup/` |

- **Change a colour once in `tokens.css`** and it changes everywhere.

### Limits of Phase 1 (honest list)

- *(Phase 1 snapshot. Recording is now real. See §17.)*
- **No real recording yet.** The timer, size and countdown are simulated.
- **"Save file", "Rename" and the recordings list are static samples.**
- **Tested in Edge (same engine as Brave) with screenshots.** I did not click through it in Brave itself. Please do, and tell me what feels wrong.
- **Tablet = a tablet-sized window on desktop.** I have not tested a real touch device ⚠️.
- **Phone width (under about 500 px) was not verified.** It is not a target.
- **The "Design preview" bar is temporary.** It will be removed before release.
- **Icons are simple and hand-drawn.** A designer's pass is welcome.
- Build size: **about 81 kB** total. Chrome and Firefox builds both pass; type check shows 0 errors.

---

## 17. Phase 2 result: real recording works (done)

### What now works for real

| Feature | Status |
|---------|:------:|
| Screen / window / tab picker (browser's own) | ✅ |
| 3·2·1 countdown, then recording | ✅ |
| Pause, Resume, Stop (timer skips paused time) | ✅ |
| All 6 presets sent to the browser (720p/1080p × 30/50/60) | ✅ |
| Bitrate set per preset (not Chrome's blurry 2.5 Mbps default) | ✅ |
| Microphone + system audio, mixed into one track | ✅ |
| Mute button | ✅ |
| MP4 or WebM, chosen by asking the browser what it supports | ✅ |
| Live size counter + "Browser reports" resolution/fps chip | ✅ |
| Real video player on the Finished screen | ✅ |
| Rename (inline) | ✅ |
| Save file → "Save as" window (pick any drive) | ✅ built, ⚠️ not tested by me |
| Discard / Record again ask first if unsaved | ✅ |
| Closing the tab during a recording asks first | ✅ |
| User clicks the browser's "Stop sharing" → recording ends cleanly | ✅ built |
| Offline: no network calls anywhere | ✅ |

### How I tested

- An automated script drove **Edge** (same engine as Brave) through a full recording: start → countdown → record → pause → resume → stop → play the file.
- First with Edge's **fake screen and microphone**, then on your **real screen**.
- Brave itself: **not tested by me. Please test** (checklist below).

| Test | Result |
|------|--------|
| MP4 · 720p30 | ✅ plays, 1280×720, audio present |
| MP4 · 1080p60 | ✅ plays, **1920×1080 at 60 fps reported**, audio present |
| WebM · 720p30 | ✅ plays, audio present |
| Pause freezes the timer | ✅ |
| File length excludes paused time | ✅ (file 8.9 s vs 11.4 s of wall time) |
| Real screen (1536×864 on screen) asked for 1080p60 | ✅ browser delivered 1920×1080 |

### Three important findings

**1. Chrome's MP4 recorder cannot stream. ✅ measured**

```
MP4  (8 s recording):  36 B … 704 B … ──────── 322,208 B  ← all at Stop
WebM (8 s recording):  485 KB, 296 KB, 205 KB, 190 KB, 435 KB, 157 KB  ← every second
```

- MP4 data is held in memory and delivered **only when you press Stop**.
- Consequences:
  - A crash or closed tab **loses the whole MP4 recording**.
  - **RAM grows** for the whole recording. This breaks the 2-hour goal.
  - The live size counter shows about 0 until Stop (MP4 only).
- WebM streams every second, so it is safe to write to disk as it goes.
- **Plan (already in the roadmap):** Phase 5/6 switches MP4 to a different method (WebCodecs + Mediabunny) that writes a **crash-safe, fragmented MP4** to disk as it records. ⚠️ I have not built or tested that yet.

**2. WebM files have no duration. ✅ measured**

- The finished WebM reported duration **"unknown/infinite"**. It plays, but you cannot scrub reliably.
- Fix: planned for Phase 5 (Mediabunny or a small repair step).
- MP4 does not have this problem (duration 8.9 s read correctly).

**3. The browser's resolution and fps are "reported", not "measured". ⚠️**

- The chip says what the browser claims. It is not a frame counter.
- Real fps measurement and the "your computer is struggling" warning come in Phase 4.

### What this means right now 🎯

| Use today | Safe? |
|-----------|:-----:|
| Short recordings (a few minutes), MP4 or WebM | ✅ |
| Long recordings with **MP4** (30 min+) | ❌ RAM grows and a crash loses everything |
| Long recordings with **WebM** | ⚠️ still held in RAM until Stop. Disk streaming is Phase 6 |
| The 2-hour goal | ❌ not yet. Needs Phase 5 + 6 |

### New permission to know about ⚠️

- Reclux now asks for the **`downloads`** permission. It powers the "Save as" window so you can choose D: or E:.
- Browsers may show this on install as "Manage your downloads" ⚠️ (from memory). It is the only permission.
- It does not read your downloads or send anything anywhere. We should say so in the store listing.

### Still open (Phase 2 limits)

- **Chunks live in RAM** until Stop (marked in the code as a known ceiling).
- **Low-disk and "struggling" warnings are still preview-only** (real checks: Phase 6 and Phase 4).
- **Hidden recorder tab for long sessions:** not tested. We do not know yet if it keeps full speed when you work in another tab for an hour.
- **System audio** only works if you tick **"Also share audio"** in the browser's picker. Reclux then shows a notice if you forgot.
- **Mic permission:** the browser asks the first time. If blocked, Reclux records without it and says so.
- **Brave Shields:** not tested.

### Your Brave test results (28 Oct) ✅

| Step | Result |
|------|--------|
| 6. Voice + system sound in the recording | ✅ both heard |
| 7. "Save as" window | ✅ opens, location can be chosen |
| 8. Plays in Windows' default player | ✅ MP4 plays, no third-party app needed |
| 9. WebM recording | ✅ works well, also plays in Windows' default player, offline |
| 10. Brave Shields | ✅ Your Brave "Shields status" page shows only `localhost` with a custom setting (Shields down). Reclux has **no custom setting**, so it ran with Brave's **default** Shields. Recording worked. ⚠️ Inferred from that page, not from the lion panel on the Reclux tab |

- Default format stays **MP4** (no change requested).

### Popup fix (found from your screenshot)

- **Problem 1:** the popup was taller than the browser allows (about 600 px), so it scrolled and hid the "Open full recorder" button.
- **Problem 2:** the popup and the recorder page do not share settings, so choices made in the popup were lost.
- **Fix:** the popup is now a small launcher: short text, one **Open recorder** button, "Works offline" note. All settings are chosen on the recorder page.
- Later (Phase 8, settings): save settings so the popup can offer quick options again.

### Please test in Brave (10 minutes)

1. Run `npm run build`, then reload Reclux in `brave://extensions`
2. Open the recorder. Pick **Screen · 1080p · 30 fps · MP4**. Press **Start recording**
3. In Brave's picker, choose **Entire screen**, tick **Also share audio**, then **Share**
4. Let it run for **30 seconds**. Talk. Play a video with sound
5. Press **Pause**, wait 5 s, **Resume**, then **Stop**
6. Play the result. **Do you hear both your voice and the video?**
7. Press **Save file**. **Does a "Save as" window open? Can you pick D:?**
8. Open the saved file in another player (VLC, Windows Media Player)
9. Repeat once with **WebM**
10. Repeat with **Brave Shields ON** (lion icon) and **OFF**

Tell me what happens at each step, especially 6, 7 and 8.

---

## 18. Phase 3 result: real fps check + "struggling" warning (done)

### What now works

| Feature | Status |
|---------|:------:|
| **Measured fps** chip: frames that really arrive each second | ✅ |
| **CPU %** chip: how busy the processor is | ✅ |
| "Screen is still" label when 0 frames arrive (normal for a still slide) | ✅ |
| Real **"Your computer is struggling"** warning, with real numbers | ✅ |
| **"Switch to 30 fps"** lowers the frame rate of the live recording, no restart | ✅ |
| **"Keep"** stops the warning for the rest of that recording | ✅ |
| The "Browser reports" chip updates after the switch | ✅ |

### The rule, in plain words

```
 Warn only when ALL of these are true, for 5 seconds in a row:

   [1] Frames arriving  <  70% of what you asked for
   [2] CPU              >= 80%
   [3] You are recording (not paused)
```

- **Why two signals?** I measured it. A still screen and an overloaded PC both give few frames:

| Situation (asked for 1080p60) | Frames per second received |
|-------------------------------|---------------------------:|
| Still screen | 0 to 9 |
| Constant motion, normal load | 14 to 18 on this PC |
| Constant motion, all CPU cores busy | 4 to 7 |

- Frames alone would give a **false alarm** while you read a slide. The CPU signal prevents that.
- Once shown, the warning **stays** until you press **Switch** or **Keep**. It does not flicker.
- If you are already on 30 fps and it still struggles, it shows the warning without the Switch button (only **Keep**).

### Tested ✅ (Edge, loaded as a real extension)

| Test | Result |
|------|--------|
| Normal use, asked 1080p60 | No warning. CPU 54–89%, never 80%+ for 5 s in a row |
| All CPU cores busy + animation | ⚠️ Warning after **5 s**, as designed |
| Press "Switch to 30 fps" mid-recording | ✅ "Asked" and "Browser reports" both change to 30 fps |
| Recorder tab in the background while recording | ✅ keeps recording and measuring |
| Firefox build | ✅ builds. `system.cpu` is left out there |

### Honest limits ⚠️

- **This PC delivered only about 18 fps when asked for 1080p60**, even without extra load. So **1080p60 may not be reachable on every computer**. The "Needs a fast computer" hint is true.
- **The warning is cautious.** If frames are low but the CPU stays under 80%, it stays quiet. Reason: it cannot tell that case apart from a still screen. Real cause could be a single busy core, or the graphics chip.
- **The 80% and 70% numbers are starting guesses.** They need tuning on your PC and on weaker ones.
- **Only Chromium browsers** (Chrome, Brave, Edge, Opera) give both numbers. Firefox has no `system.cpu`. There the chip would show fps only and no warning.
- **Bitrate does not change** when you switch to 30 fps. The recording keeps the 1080p60 bitrate setting (a slightly bigger file, same quality).
- Counting frames reads a copy of the video on a second path. It only runs while recording. Its RAM and CPU cost is **not measured yet** (Phase 6 RAM tests).

### New permission ✅

- **`system.cpu`**: reads processor load only. Chrome's permission list shows **no install warning** for it.
- Reminder: `downloads` **does** show "Manage your downloads" ✅ (now confirmed from Chrome's docs).

### Your Brave test results (28 Oct) ✅

| Check | Result |
|-------|--------|
| 1080p · 60 fps, full-screen video | Measured **15–23 fps**, CPU **58–87%** |
| "Struggling" warning | ✅ appeared (CPU reached 80%+ for 5 s, fps far below 60) |
| "Switch to 30 fps" | ✅ worked |
| Other numbers after the switch | ✅ "working very well" |

- **Meaning:** your PC cannot deliver 1080p60 right now (about 15–23 fps arrive). Same picture as my test PC, so it is likely a normal limit for this kind of computer.
- **The warning rule (70% / 80%) fired correctly on a real machine.** No change needed for now.
- **Good default:** the app already starts on **1080p · 30 fps**.

### Please test in Brave (5 minutes)

1. `npm run build`, then reload Reclux in `brave://extensions`
2. Pick **Screen · 1080p · 60 fps**. Start recording
3. Play a **full-screen video** (such as YouTube) for **20 seconds**
4. Watch the chips. **Write down:** "Measured … fps" and "CPU …%"
5. Did a **"Your computer is struggling"** warning appear?
6. If yes, press **Switch to 30 fps**. Do the numbers change?
7. Repeat once with **1080p · 30 fps**

Send me the numbers (even a screenshot). They help me tune the 80% / 70% rules for your computer.

---

## 19. Phase 5 result: crash-safe recording that streams to disk (done)

### What changed

```
BEFORE (Phase 2)                         NOW (Phase 5)
browser recorder                         encoder (H.264+AAC / VP9+Opus)
   │                                        │
   ▼                                        ▼
all video kept in RAM ─► file at Stop    video library ─► small pieces ─► file on disk
   (crash = everything lost)                                  every ~0.3 s  (crash = lose <1 s)
```

| Feature | Before | Now |
|---------|:------:|:---:|
| MP4 safe if browser or PC crashes | ❌ lose all | ✅ lose under ~1 s |
| MP4 memory while recording | ❌ grows | ✅ flat |
| WebM memory while recording | ❌ grows | ✅ flat |
| WebM has a length (can scrub) | ❌ | ✅ |
| MP4 type | one big file | **fragmented MP4** (every piece plays on its own) |
| Recover after a crash | – | ✅ banner: **"Found a recording that was never saved"** |
| Pause / resume keep audio and video in sync | ✅ | ✅ (library syncs them) ⚠️ not ear-tested by me |

### Tested ✅ (Edge, loaded as a real extension)

| Test | Result |
|------|--------|
| MP4 · 720p30 with pause + resume | ✅ plays, length 10.6 s, paused time excluded |
| WebM · 720p30 | ✅ plays, **length known (10.58 s)** |
| MP4 · 1080p60 on the real screen | ✅ plays, 1920×1080 |
| **3 min 36 s at 1080p30, real screen** | ✅ plays, 62 MB file. **Memory flat**: page memory 7–25 MB, whole browser about 770 MB from start to end |
| **7 min 01 s at 1080p30** (two runs) | ✅ plays. File length 421.4 s and 421.8 s against 421 s on the clock. Page memory 7–13 MB, file grew steadily to about 63 MB |
| **Crash test:** hard-kill the browser 10 s into a recording | ✅ relaunch → banner → **Recover it** → 10.0 s MP4 plays |
| Chrome and Firefox builds, type check | ✅ pass |

### What I learned on the way

- **I had a bug:** I gave the video library a bare bitrate number. It read it as a *quantizer* setting and the encoder failed with "Encoding error". Fixed by passing `{ bitrate }`.
- **The easy browser way to write files is not crash-safe.** It only saves when you close the file. Reclux uses a small background worker that writes in place, so a crash keeps what was written.
- **Crash loss is small but not zero.** The recovered test file was exactly 512 KB, which is two 256 KB pieces. Data after the last piece is lost.

### Size of the extension ⚠️

- The extension grew from **91 kB to about 364 kB**. The video library brings its own encoders and file writers.
- Not a problem for RAM at idle (nothing runs until you record). Could be trimmed later.

### New: recovery and storage behaviour

- Unsaved recordings are kept in the browser's **private storage** until you **Save file** or **Discard**.
- After **Save file**, the next launch cleans that copy up automatically.
- A recording that another tab is still making is **never** offered as "unsaved" (tabs lock their file).
- **Private storage uses the drive where Brave's profile lives** (usually C:). The "save to D:" choice is still made at the Save step.

### Honest limits ⚠️

- **Hidden recorder tab: ✅ passed in Brave (6 min).** Recorded while working in another tab: video is 6:01, plays fully, no freezes, no warning. A 1-hour hidden run is still untested.
- **2 hours: not tested end to end.** Longest real run was 7 minutes. The trend (flat memory, steady file growth) is good.
- **Real low-disk check is not built yet.** The "Low disk" warning is still preview-only (Phase 6).
- **Keep-PC-awake is not built yet** (Phase 6). A laptop that goes to sleep may stop the recording.
- **Audio and video sync:** the library aligns them, but I did not listen for lip-sync. Use the clap test below.
- **Brave results (user-tested):** Test A ✅ works fine · Test B ✅ "Found a recording that was never saved" appeared after End task · Test C ✅ 6:01 video. The recovered file plays ✅. **Phase 5 fully verified in Brave.**
- **"Save file" after the new pipeline** is untested by me (the native "Save as" window cannot be automated).
- **A hard 2 h × 1080p60 file is about 11 GB.** The low-space guard will matter.
- **This PC delivered about 11–19 fps at 1080p30** in these tests (CPU 45–79%). The recordings are valid, but slower than asked. See §18.

### Please test in Brave (about 15 minutes)

**Test A: normal recording**
1. `npm run build`, then reload Reclux in `brave://extensions`
2. Record **1 minute**, **MP4**, **1080p · 30 fps**, microphone and system audio on
3. Do a **clap test**: clap once, with a video playing. Press **Pause** for 5 s, **Resume**, clap once more, **Stop**
4. Play it. **Do the claps line up with the picture?** Is the pause gap missing (good)?
5. Press **Save file**, pick **D:**, and play the saved file in Windows' player

**Test B: crash recovery (this one matters)**
1. Start a recording (any settings). Wait **20 seconds**
2. **Kill Brave the hard way:** press `Ctrl + Shift + Esc` (Task Manager), find **Brave**, and click **End task**
3. Open Brave again, then open the Reclux recorder
4. You should see **"Found a recording that was never saved"**. Click **Recover it**
5. Does it play? How long is it?

**Test C: hidden tab (answers an open question)**
1. Start a recording. Then switch to **another tab** and keep working in it
2. Leave it for **at least 6 minutes**
3. Go back and press **Stop**
4. Does it show about 6 minutes? Does it play fine?

Send me what happens, especially if **Test B** does not offer recovery, or **Test C** gives a short or broken file.

---

## 20. Phase 4 result: settings are remembered (done) ✅

### What changed
| Before | Now |
|---|---|
| Every visit starts at 1080p30, MP4, Screen, both audio on | Reclux **remembers your last choices** |
| Popup was only an "Open recorder" button | Popup has **quick options**: what to record, quality, mic, system audio |
| Popup and recorder page did not share settings | **Both read and write the same saved settings** |

```
 Popup  ──┐                          ┌── Recorder page
 (quick   ├──►  saved on this PC  ◄──┤   (full settings
  options)┘     (one small entry)     └    + Format)
```

### What is remembered
- What to record (Tab / Window / Screen)
- Quality (e.g. 720p · 60 fps)
- Format (MP4 / WebM)
- Microphone on/off, System audio on/off

### Rules
- **Saved on this device only.** Nothing is sent anywhere. Still offline-first.
- **Popup change while the recorder tab is open (and idle):** the recorder updates by itself.
- **"Switch to 30 fps" during a recording is a one-off.** It is not saved, so your next recording starts at the quality you chose.
- **Bad or missing saved data** falls back to the defaults, so it cannot break the page.
- **Popup does not start recording.** Screen sharing needs a click on a real page, and the popup closes when it loses focus. So the popup sets options, then **Open recorder**, then **Start recording**.
- Format stays on the recorder page only, to keep the popup short (about 430 px tall, no scrolling).

### Tested (Edge, as a real extension)
| Check | Result |
|---|---|
| First launch shows defaults | ✅ |
| Change options in the popup → open recorder tab updates live | ✅ |
| Change Format on recorder → close and reopen the browser → still there | ✅ |
| Popup shows the same choices after restart | ✅ |

### Please test in Brave (about 3 minutes)
1. `npm run build`, then reload Reclux in `brave://extensions`
2. Click the Reclux icon. Choose **Window**, **720p · 60 fps**, turn **Microphone** off
3. Click **Open recorder**. Do you see the same choices there?
4. Change **Format** to WebM. Close Brave fully, open it again, open the recorder. Are your choices still there?

---

## 21. Phase 6 result: 2-hour safety (built, 2-hour test in §21.4) 🛡️

### 21.1 A hidden problem found: storage cap
| | Before | After |
|---|---|---|
| Browser storage for recordings (measured in Edge) | **about 10.7 GB cap** | **equals the free space on the drive** (60 GB when C: had 56 GiB free) |

- A 2-hour **1080p60** recording is about **10.8 GB**, so it would have hit the cap and stopped.
- Fix: one new permission, **`unlimitedStorage`**. Chrome lists **no install warning** for it, and its docs say it covers this private file storage.
- Side benefit: the cap now equals the **real free space**, so the low-disk check can be honest.

### 21.2 Real low-disk guard
```
 BEFORE YOU START             WHILE RECORDING (checked every 10 s)
 ───────────────────          ───────────────────────────────────────
 Free space < what            < 2 GB left   → yellow banner "Disk space is running low"
 2 hours would need?          < 300 MB left → Reclux STOPS safely, keeps the file,
   → "Low disk space"                          shows a notice on the Finished screen
     banner + Lower quality
```
- Message tells you the truth: **recording needs space on the drive that holds your browser (usually C:)**. After you press **Save file** you can pick **D:** or **E:**.
- If the disk fills too fast and finishing the file fails, the half-finished file is **kept** and the "Recover it" banner offers it. (Before this change that case could delete it.)

### 21.2b Brave bug found by the user, and the fix
- **Symptom (Brave):** "Only **-2013244 KB** is free for recordings".
- **Cause:** Brave hides the real free space on purpose (privacy). It always reports a **2 GB quota**, even though writing more works. I wrote **2.68 GB** in Brave to prove it. Edge reports the real number.
- **Other ways to read free space** (`system.storage`) only give drive *size*, not free space. Dead end.
- **Fix:** when the number looks fake (exactly 2 GB, or negative), Reclux treats free space as **unknown** and shows **no** low-disk banner.
- **What that means in Brave:** there is **no early low-disk warning**. The safety net is still there: if the disk fills, writing fails, Reclux stops, and your recording so far is kept (Recover it).
- Not fixed yet: a Brave-only guard. Option for later: warn from the *size so far* vs. a typical drive.

### 21.3 Keep the PC awake
- While recording (and while paused), Reclux asks Windows **not to sleep and not to turn the screen off**. It lets go on Stop, on Cancel, and when the tab closes.
- Uses the extension **`power`** permission (**no install warning** in Chrome's list). The normal web "wake lock" does not work in a hidden tab, so it cannot be used here.
- **Firefox has no such API.** A fallback comes with the Firefox phase.
- Known limit: if the whole tab crashes without a clean exit, the request can stay until the browser closes.

### 21.3b Tested (Edge, as a real extension)
| Check | Result |
|---|---|
| Setup with 1.0 GB free → "Low disk space" banner with real number | ✅ |
| Setup with 200 GB free → no banner | ✅ |
| Recording with 1.5 GB free → "Disk space is running low" banner | ✅ |
| Free space drops to 200 MB → Reclux stops by itself, notice shown | ✅ |
| That stopped recording plays (about 30 s, 1280 wide) | ✅ |
| Keep-awake: asked on Start, kept during Pause, released on Stop | ✅ (the calls were observed; checking Windows itself needs an administrator window) |

The free-space numbers in these tests were **simulated** (a test script changed what the browser reports). A real full disk was not tried, on purpose.

### 21.4 The real 2-hour test
**Setup:** Edge as a real extension · 1080p30 · MP4 · fake microphone · recorder tab in the background · stopped at about 2 h 01 min · 5-minute readings.

| Check | Result |
|---|---|
| File length | **2:01:06** (timer said 2:01:03) ✅ |
| Plays to the very end | ✅ (1920×1080) |
| Recording survived the "15 minutes left" and "2 hours reached" notices | ✅ kept recording, as decided (warn only) |
| Memory over 2 hours (all Edge processes) | **flat**, 780–950 MB, no growth ✅ |
| Page JS memory | 11 MB at 5 min → 57 MB at 2 h (slow, small, harmless) |
| Crashes, freezes, error banners | none ✅ |
| Time to finish and open the file after Stop | about 11 s ✅ |
| Frames measured | steady **about 20 fps** (asked 30) |
| "Your computer is struggling" warning | appeared at 1 h and stayed (sticky, by design) after a CPU burst |

**Two things the test taught us**
- **The size shown in Reclux is a worst case.** Real file: **0.75 GB** for 2 hours, not 7.2 GB. A mostly still screen needs far fewer bits than the bitrate we ask for. Busy video (games, scrolling) will be larger, up to the shown number. The low-disk check stays on the safe side.
- **This PC gives about 20 fps at 1080p30** (same as §18). The recording is valid; it just has fewer frames than asked.

**Not covered by this test:** audio quality over 2 hours (fake microphone only) · Brave itself · 1080p60 for 2 hours · keep-awake observed from Windows · the PC actually trying to sleep.

**Verdict: 2-hour recording works.** The test screen recording was deleted after the check.

---

## 22. Phase 7 result: responsive + accessible (done) ♿📱

### 22.1 Screen sizes checked (screenshots of Setup, Recording, Finished)
| Device | Size | Layout | Sideways scrolling |
|---|---|---|---|
| Desktop | 1440 × 900 | 2 columns | none ✅ |
| Tablet landscape | 1180 × 820 | 2 columns | none ✅ |
| Tablet portrait (iPad) | 820 × 1180 | 2 columns | none ✅ |
| Phone | 390 × 844 | 1 column, controls stacked | none ✅ |

Already worked from Phase 1. Touch layouts use a 48 px tap size on touch screens.

### 22.2 What changed
| Change | Why |
|---|---|
| Text **grows with the browser's font-size setting** (was fixed pixels) | People who set "Large" text in Brave/Chrome now get bigger text |
| Popup width also scales with text | Bigger text does not cut off the popup |
| At 200% text on a phone, the "Ready when you are" box pushed the page sideways | Fixed. The box now grows downward |
| Real page heading (**h1 "Reclux"**) on both pages | The only problem the automatic checker found |
| Timer announced as "Elapsed time" to screen readers | It does **not** read out every second |
| **Focus follows the screen.** Start → focus goes to Cancel → then Pause → then Save file | Before, keyboard focus was lost when a button disappeared |
| **Design-preview bar and sample "Recordings" list are now hidden** | Real users should not see fake files like "Weekly demo". Open `recorder.html#preview` to see them again |

### 22.3 Accessibility checks
| Check | Result |
|---|---|
| Automatic checker (axe-core, WCAG 2.2 AA + best practice), 6 screens × light/dark on the recorder + popup | **0 problems** (was 1) ✅ |
| Colour contrast, light and dark | ✅ |
| Keyboard only: Tab order is logical, visible focus ring (about 2.4 px) | ✅ |
| Keyboard only: Start → Pause (Space) → Resume → Stop → Save file, all by keyboard | ✅ |
| Text at 150% and 200% on phone and tablet: no sideways scrolling | ✅ |
| Touch targets 44 px or more | ✅ (the toggle switch itself is 44 × 26, but the whole row around it is the tap area) |
| Error banners are announced as alerts, other banners as status | ✅ |
| Motion reduced when the system asks for it | ✅ (from Phase 1) |

### 22.4 Not covered
- **Real screen reader** (NVDA, VoiceOver): not tested by me. The checker only finds code-level problems.
- **Real iPad or Android touch** (no extension support there, see §10).
- **Keyboard shortcuts** (e.g. a key to Stop while another window is in front): not built. Needs the `commands` API. Easy to add later if wanted.
- **Windows High Contrast mode**: not checked.

---

## 23. Phase 8 result: offline proof + store kit (done) 📦

### 23.1 Offline test
| Check | Result |
|---|---|
| Network switched OFF (browser says offline). Record 6 s, Stop, play | ✅ 6.4 s video, no errors |
| Popup opens offline | ✅ |
| Every network request made during that run | **13 requests, 0 outside the extension** ✅ |
| Search of the built code for `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `eval`, `new Function`, `importScripts` | none found ✅ |
| The only `fetch` in the code | Vite's own loader, which fetches the extension's *own* files ✅ |
| Web addresses inside the code | only in comments and error-message links (Svelte docs, W3C specs). Never called ✅ |

So "Remote code: No" and "Collects no data" are honest answers on the store form.

### 23.2 What changed in the extension
- Version is now **0.1.0** (was 0.0.0).
- Manifest says **minimum Chrome 116** (Brave 1.58 = Chromium 116), so older browsers get a clear message instead of failing.
- Store zip: **`.output/reclux-0.1.0-chrome.zip`, 112 KB**. Contains only the built files, no source or test files.

### 23.3 Store kit (new folder `store/`)
| File | What it is |
|---|---|
| `store/listing.md` | Name, summary (under 132 characters), full description, permission justifications, data answers, submit steps |
| `store/privacy-policy.md` | Plain privacy policy. **You must host it on a public web page** and paste the link |
| `store/images/1…5-*.png` | 5 screenshots, 1280 × 800 (setup, recording, warning in dark mode, finished, popup) |
| `store/images/promo-small-440x280.png` | Small promo tile |
| `store/images/promo-marquee-1400x560.png` | Marquee tile (optional) |

Chrome's rules, checked on its pages: 128 px icon required, 1 to 5 screenshots (1280 × 800 preferred), 440 × 280 and 1400 × 560 tiles optional, plus single purpose, a reason for every permission, a remote-code answer, data disclosures and a privacy policy link.

### 23.4 Permissions: one line each
| Permission | Why | Install warning in Chrome's list? |
|---|---|---|
| `downloads` | "Save as" window, pick any drive | yes: "Manage your downloads" |
| `unlimitedStorage` | stores long recordings safely while recording | no |
| `system.cpu` | tells "too busy" from "still screen" | no |
| `power` | keeps PC awake while recording | no |

### 23.5 What only you can do
1. **Developer account** (one-time fee, and a developer email that can't be changed later).
2. **Host the privacy policy** on a public page. Put your contact email where it says `[your contact email here]`.
3. Confirm the **data answers** on the store form. They are your legal declaration.
4. Upload the zip, paste the text, add the images, submit. Review takes time.

### 23.6 Not done / worth knowing
- Screenshots 2 to 4 are **staged** (sample timer and size). A real screenshot of your own recording would show your desktop, so I did not use one.
- The store review is outside our control. A reviewer may ask why `power` or `unlimitedStorage` is needed. The answers are ready in `store/listing.md`.
- Not tested: the real store upload flow.
- Firefox, Safari and Android are later phases.

---

## 24. Phase 9 result: iPad Safari spike (research done, iPad test pending) 🍎

### 24.1 Short answer
```
 Can Reclux run on an iPad?       POSSIBLE, NOT PROVEN
 Do you need a Mac?               NO (but you need to pay Apple $99 / year)
 Biggest unknown                  does recording CONTINUE when you leave Safari?
 What decides it                  one 10-minute test on your iPad (§24.5)
```

### 24.2 What changed this year (new since §10)
| Fact | Source and confidence |
|---|---|
| **Safari 27 on iPhone/iPad now has `getDisplayMedia`** (screen capture). Before, iOS never had it | MDN compatibility data says Safari iOS **27**. One developer report (24 Sep 2026) saw it work on an **iPhone** with iOS 27.0. **iPad, audio and background are not confirmed** |
| Safari extensions can be **packaged without a Mac or Xcode** | Apple's own page: web packager in App Store Connect, "from any web browser". Needs the **Apple Developer Program (USD 99 per year)**. Test builds go to your iPad with **TestFlight** |
| Safari extensions work on **iPadOS** (installed through an app) | Apple docs |

### 24.3 What Reclux would need on Safari
| Reclux part | On Safari / iPad | Effort |
|---|---|---|
| Screen capture | iPadOS 27 only, reported, **unverified on iPad** | probe tests it |
| Video encoding (H.264) | `VideoEncoder` since Safari 16.4 ✅ | none |
| **Audio encoding (AAC/Opus)** | `AudioEncoder` arrived in Safari **26** → iPadOS 26+ | none, but sets the minimum |
| Frame counting | `MediaStreamTrackProcessor`: **NO on a normal page** in Safari 26.6 (measured). MDN's "Safari 18" is for workers only | Reclux would need to read frames inside a worker, or use another way. Needs a test |
| Save with "Save as" (`downloads`) | **not supported in Safari** | Reclux already falls back to a normal download. On iPad you get the Files / share sheet, **not a drive or folder picker** |
| CPU reading (`system.cpu`) | not supported | "struggling" warning cannot fire. Needs a frames-only rule |
| Keep PC awake (`power`) | not supported | web wake lock works **only while the tab is visible** |
| Big file storage (`unlimitedStorage`) | not documented for Safari | unknown, test |
| Private file storage (OPFS fast write) | Safari has it for pages. **Inside an extension: untested** | probe checks the page version |
| Mediabunny library | untested on Safari | test |
| **Recording while you use other apps** | iOS pauses web pages in the background | **the make-or-break test** |

Good news: Reclux already checks "does this API exist?" before using `downloads`, `power` and `system.cpu`, so a Safari build would not crash on them.

### 24.4 Honest value check
- The iPad already has a **free built-in Screen Recording** (Control Center) that records any app, with microphone, in the background.
- Reclux on iPad would only add value if it can do something the built-in tool cannot (long recordings into a chosen folder, presets, crash recovery).
- If recording stops when you leave Safari, a Safari version can only record **its own tabs**, which is a weak product.

### 24.5 The iPad test (10 minutes, no Mac needed)
File: **`spike/ipad-probe.html`**. It measures everything in §24.3 that a page can measure. It saves and uploads nothing.

**Getting it onto the iPad.** The page needs **https**. Easiest: put the file on GitHub Pages (you need that for the store privacy policy anyway) and open the link in **Safari** on the iPad. The page tells you "Secure page: NO" if it cannot work.

On the iPad (needs **iPadOS 27** for screen capture):
1. Open the page. Take a screenshot or note the **table in part 1**.
2. Press **Test screen capture**. Pick what to share. Keep something moving for 5 seconds.
3. Press **Start** (part 3). Go to the Home Screen and open another app for **30 seconds**, with something moving. Come back. Press **Stop**.
4. Press **Copy results**. Paste them to me in chat.

**How I will read the results**
| Result | Meaning | Next step |
|---|---|---|
| Capture works, has **audio**, frames keep arriving **while in another app** | Safari version is worth building | Phase 9b: package for TestFlight ($99) |
| Capture works but **stops or gaps when you leave Safari** | Only records Safari itself | Not worth it. Tell people to use the iPad's built-in recorder |
| `getDisplayMedia` is **NO** | iPad is not ready (older iPadOS) | Wait. Revisit later |

### 24.6 Probe checked on
Edge on Windows (all checks run, no page errors). **Not run on an iPad**: I have none.

### 24.6b Your iPad result (29 Oct 2026)
- Your iPad runs **iPadOS 26.6**. Safari screen capture (`getDisplayMedia`) starts at **iPadOS 27**.
- So the capture and background tests **cannot work on this iPad** today. Phase 9 is **parked**, not failed.
- The test page stays online at `https://iamaakashoza.github.io/reclux-probe/` for when the iPad can update.
- **Restart condition:** update to iPadOS 27 (Settings, General, Software Update), if the iPad model is supported. Then run the test in §24.5.

### 24.6c What your iPad measured (Safari 26.6, 29 Oct 2026)
| Check | Result |
|---|---|
| Secure page (https) | ✅ |
| Screen capture (`getDisplayMedia`) | ❌ **does not exist** ("is not a function"). Matches the iPadOS 27 requirement |
| Microphone (`getUserMedia`) | ✅ |
| MediaRecorder | ✅ MP4 (H.264) and WebM (VP9 + Opus) |
| Frame access (`MediaStreamTrackProcessor`) on the page | ❌ NO (see the corrected row in 24.3) |
| VideoEncoder / AudioEncoder | ✅ both |
| H.264 1080p30 and **1080p60** encode | ✅ |
| VP9 1080p30 encode | ✅ |
| AAC and Opus encode | ✅ |
| Wake lock (keep screen on) | ✅ (visible tab only) |
| Web Locks | ✅ |
| Private file storage, fast write (OPFS) | ✅ 64 MB in **47 ms** (the PC's Edge took 801 ms) |
| Storage quota | 41.2 GB |

**Reading it:** everything Reclux needs **except screen capture** is already there on your iPad. Screen capture needs **iPadOS 27**.

**Why "Start" did nothing:** the page tried to start capture, Safari said the function does not exist, and the page only wrote that into the results box. Nothing was broken. The probe could be made to show a visible message. Not worth doing now.

**Still unknown (needs iPadOS 27):** does capture include sound, can you pick the whole screen, and does it keep recording when you leave Safari.

### 24.7 Sources
- [MDN compatibility data: getDisplayMedia (Safari iOS 27)](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MediaDevices.json)
- [Developer report: Safari 27 on iOS/iPadOS, BigBlueButton issue 26200](https://github.com/bigbluebutton/bigbluebutton/issues/26200) (one iPhone test, not Apple's own note)
- [Apple: Packaging and distributing Safari Web Extensions with App Store Connect (no Mac or Xcode)](https://developer.apple.com/tutorials/data/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect.md)
- [Apple Developer Program: USD 99 per year](https://developer.apple.com/programs/whats-included/)
- [MDN compatibility data: downloads API, not in Safari](https://raw.githubusercontent.com/mdn/browser-compat-data/main/webextensions/api/downloads.json)
- [MDN compatibility data: MediaStreamTrackProcessor (Safari 18)](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MediaStreamTrackProcessor.json)
- [WebKit: features in Safari 26.0 (AudioEncoder, extension packager)](https://webkit.org/blog/17333/webkit-features-for-safari-27-0/) (the page covers 26.0 despite its address)

---

## 25. Phase 10 result: Firefox works, Opera works (done) 🦊

### 25.1 Tested for real
| Browser | How I tested | Result |
|---|---|---|
| **Firefox 159** (your installed copy) | Loaded Reclux as an add-on, recorded, stopped, played | ✅ |
| **Opera** (your installed copy) | Loaded the Chrome build, recorded, paused, stopped | ✅ keep-awake also works |
| Edge | Regression check after the changes | ✅ |

**Firefox results**
| Check | Result |
|---|---|
| Add-on loads, page opens | ✅ |
| Record 720p30 MP4, no sound | ✅ 9.1 s and 12.0 s files, play fine |
| Record with microphone | ✅ saved as **WebM**, with a notice (see below) |
| **Tab hidden for 25 s while recording** | ✅ 25.4 s file, size kept growing |
| Download call (`downloads` API) | ✅ works |
| Recording state and size shown live | ✅ |

### 25.2 What was missing in Firefox, and what I did
| Missing in Firefox | Effect | Fix |
|---|---|---|
| **Frame reader** (`MediaStreamTrackProcessor`) | Recording **never started** (it hung silently) | Wrote a stand-in (`track-processor.ts`). It reads the screen on a steady clock that a hidden tab cannot slow down. Chrome does not use it |
| **AAC sound encoder** | MP4 with sound is not possible | Reclux saves **WebM** (Opus sound) and tells the user. MP4 works when there is no sound |
| `system.cpu` | no CPU reading | "struggling" warning cannot fire. Already handled |
| `power` (keep awake) | PC may sleep | no keep-awake in Firefox (known limit) |
| Frame counting | "Measured: N fps" chip hidden | The stand-in repeats frames at a fixed rate, so it cannot count real ones |
| Real free-space number | Firefox reports a fixed 10 GB | Disk guard is **off in Firefox**, same as Brave |
| System audio | Firefox cannot share system sound | The existing notice appears |

### 25.3 What is different for Firefox users
```
                         Chrome / Brave / Edge / Opera      Firefox
 MP4 with sound                    yes                       no (WebM instead)
 MP4 without sound                 yes                       yes
 Keep PC awake                     yes                       no
 CPU / "struggling" warning        yes                       no
 Low-disk warning                  yes (not Brave)           no
 System audio                      yes                       no (Firefox limit)
 Hidden tab recording              yes                       yes (tested 25 s)
 Save as, choose a drive           yes                       yes
```

### 25.4 Packaging
| File | Use |
|---|---|
| `.output/reclux-0.1.0-firefox.zip` (112 KB) | Upload to Firefox Add-ons (AMO) |
| `.output/reclux-0.1.0-sources.zip` (99 KB) | AMO asks for the source code. Notes and store files are left out |
| `.output/reclux-0.1.0-chrome.zip` (112 KB) | Chrome Web Store. Rebuilt with the latest code |
| `README.md` | Now has the build steps AMO reviewers need |

Firefox manifest: **Manifest V3**, minimum **Firefox 140**, declares **"collects no data"** (needed by AMO). The add-on id is `reclux@iamaakashoza.github.io` (it only has to be unique, it is not a real email). **Change it if you want another id.**

### 25.5 Opera
- Opera is built on Chromium, so the **Chrome build works as is** (tested).
- Opera users can use **Opera's own add-on store** (a separate listing) or install from the Chrome Web Store with Opera's "Install Chrome Extensions" helper. A separate Opera submission is not done.

### 25.6 Not tested
- Firefox: **recordings longer than about 10 GB** (Firefox shows a 10 GB storage figure; I do not know if it is a hard cap). My attempt to test it did not finish, so treat it as unknown.
- Firefox: crash recovery, a 2-hour run, Save-as dialog by hand, sound quality, lip-sync.
- Firefox: the AMO upload and review.
- Opera: a long run, and Opera's own store rules.
- Firefox on Android (no screen capture there).

---

## 26. Publish kit: privacy policy is live (done) 🌐

### 26.1 What is online now
| Page | Link |
|---|---|
| **Privacy policy** (use this in both stores) | https://iamaakashoza.github.io/reclux-privacy/ |
| iPad test page (Phase 9, parked) | https://iamaakashoza.github.io/reclux-probe/ |

- The policy repo is **public** and contains only that one page.
- Contact on the policy is a **GitHub issues link**, not your email, so your address is not public. You can change it later.
- The policy also explains each permission, which helps the store review.

### 26.2 What is ready to upload
| Store | Files |
|---|---|
| Chrome Web Store (also fine for Brave, Edge) | `.output/reclux-0.1.0-chrome.zip` + `store/images/` + text in `store/listing.md` |
| Firefox Add-ons | `.output/reclux-0.1.0-firefox.zip` + `.output/reclux-0.1.0-sources.zip` + same images and text |
| Opera add-ons (optional) | the Chrome zip |

### 26.3 What only you can do
1. Chrome Web Store: developer account (one-time fee), upload, fill tabs, confirm data answers, submit.
2. Firefox Add-ons: free account, upload both zips, submit.
3. Both stores review before it goes live. Reviews can take days.

---

## 27. Setup wizard and install page (done) 🧭

You asked for "one setup wizard for all browsers". Browsers do not let an outside installer add extensions to normal PCs without company-style policy tricks (see §27.4), so the safe version is two parts.

### 27.1 Part B: Welcome wizard inside the extension
Opens **by itself the first time Reclux is installed** (not on updates). Same code in every browser.

```
 1 Welcome          2 Your defaults        3 How it works         4 Ready
 no account,        what to record,        press Start, switch    Open recorder,
 no upload,         quality, format,       apps freely, Pause /   pin tip
 works offline,     mic, system audio      Stop, Save file
 why permissions    (saved for later)      (always Save file)
```
- Choices made in the wizard are the **same saved settings** the popup and recorder page use.
- **Skip setup** is always there. **Setup guide** link on the recorder page reopens it.
- Firefox shows an extra note (WebM with sound, no system audio). The permission list hides the two that Firefox does not have.
- Keyboard works. Focus moves to each step's heading. Text scales with browser font size.

| Test | Result |
|---|---|
| Opens by itself after a fresh install: Edge, Opera, Firefox | ✅ (Brave uses the same engine as Edge) |
| All 4 steps, Back, Skip, Open recorder | ✅ |
| Choices carry over to the recorder page | ✅ |
| Accessibility checker (axe), all steps | **0 problems** ✅ |
| Phone width at 150% text | no sideways scroll ✅ |

### 27.2 Part C: Install page
**https://iamaakashoza.github.io/reclux-install/**
- One page, one big button that **detects the browser**: "Add to Chrome / Brave / Edge / Opera / Firefox".
- Cards for the three stores, three steps, features, short questions, link to the privacy policy.
- On a phone or tablet it says Reclux is for desktop computers.
- **Right now every button is off** and the page says "Coming soon", because Reclux is **not in any store yet**. I did not put fake links.
- **To switch it on:** after a store approves Reclux, send me its link. I paste it in the `STORES` line at the top of the page's script and publish. Each store turns on by itself.

| Test | Result |
|---|---|
| Browser detection: Chrome, Edge, Opera, Firefox, iPad | ✅ |
| Buttons off before links, on after | ✅ |
| Accessibility checker, light and dark | **0 problems** ✅ |
| Phone width | no sideways scroll ✅ |

Copies of both pages are in `store/site/`.

### 27.3 Files
- New: `src/entrypoints/welcome/` (the wizard), first-install hook in `background.ts`.
- Rebuilt: Chrome zip, Firefox zip, sources zip. Extension size about 382 KB.

### 27.4 Why not one installer program (.exe)
- Chrome, Edge, Brave and Opera accept outside installs only through Windows **policy** settings, and only for store-hosted extensions on a normal PC.
- Firefox needs a Mozilla-signed file, also installed through a policy.
- Policies show **"Managed by your organization"** in the browser and look like adware to antivirus tools and the stores.
- So I did not build it. The wizard plus install page gives the same "one place, one click" without the side effects.

---

## Sources

**Primary / official (✅)**

- [Chrome: Screen capture in extensions](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture)
- [Chrome: `chrome.offscreen` API](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Chrome: `chrome.tabCapture` API](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
- [MDN: `getDisplayMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)
- [MDN: `MediaRecorder`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN browser-compat-data: MediaRecorder](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MediaRecorder.json)
- [MDN browser-compat-data: MediaDevices](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MediaDevices.json)
- [MDN browser-compat-data: VideoEncoder](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/VideoEncoder.json)
- [WXT: target different browsers](https://wxt.dev/guide/essentials/target-different-browsers.html)
- [Chrome: Manifest V3 migration and security](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)

**Secondary / blogs / forums (⚠️)**

- [WXT vs Plasmo vs CRXJS (DEV)](https://dev.to/quangpl/plasmo-vs-crxjs-vs-wxt-which-chrome-extension-framework-should-you-use-in-2026-37o4)
- [WXT compare page (self-published)](https://wxt.dev/guide/resources/compare)
- [Extension.js: record the screen](https://extension.js.org/docs/workflows/record-the-screen)
- [Mozilla Add-ons blog: MV3 and event pages](https://blog.mozilla.org/addons/2022/10/31/begin-your-mv3-migration-by-implementing-new-features-today/)
- [Browser RAM comparison (Opera VPS blog)](https://operavps.com/blog/which-browser-uses-more-ram/)
- [Browser RAM comparison (Cloudzy)](https://cloudzy.com/blog/which-browsers-use-the-least-memory/)
- [Extension memory guide](https://theluckystrike.github.io/chrome-extension-guide/docs/patterns/memory-management)
- [Mediabunny](https://mediabunny.dev/guide/introduction)
- [Chromium: MP4 container for MediaRecorder (Intent to Ship)](https://groups.google.com/a/chromium.org/g/blink-dev/c/p1OMVj1FrMI)
- [AddPipe: MediaRecorder video bitrates](https://blog.addpipe.com/mediarecorder-video-bitrates/)
- [AddPipe: Safari screen recording on macOS](https://blog.addpipe.com/safari-support-on-macos-beta/)
- [WebKit bug 281106: WebM in MediaRecorder](https://bugs.webkit.org/show_bug.cgi?id=281106)
- [Firefox for Android: 450+ extensions (9to5Google)](https://9to5google.com/2023/12/15/firefox-for-android-now-supports-over-450-extensions)
- [Opera MV2 statement](https://blogs.opera.com/news/2025/09/mv2-extensions-opera/)
- [Chrome: File System Access API (Brave exception noted)](https://web.dev/file-system-access)
- [Brave issue #44411: opt-in for file pickers](https://github.com/brave/brave-browser/issues/44411)
- [WICG mailing list: Brave disables `show*Picker()`](https://lists.w3.org/Archives/Public/public-wicg/2023Mar/0006.html)
- [Brave Android extension status (PiunikaWeb, Jul 2026)](https://piunikaweb.com/2026/07/29/brave-says-android-extension-support-tbd/)
- [Chrome for Android is getting extensions (Android Central)](https://www.androidcentral.com/apps-software/chrome-for-android-is-getting-extensions-but-not-like-youd-expect)
- [Chrome Android + `getDisplayMedia` (web-features explorer)](https://web-platform-dx.github.io/web-features-explorer/features/screen-capture/)
- [Safari web extensions without a Mac or Xcode](https://victorwynne.com/safari-web-extensions/)
- [Safari extensions on iPad (How-To Geek)](https://www.howtogeek.com/757666/how-to-install-and-use-safari-extensions-on-iphone-and-ipad/)
- [Duration in WebM videos produced by Chrome (AddPipe)](https://blog.addpipe.com/duration-in-webm-videos-produced-by-chrome/)
- [`fix-webm-duration`](https://github.com/yusitnikov/fix-webm-duration)
- [Openscreen PR: streaming chunks to disk](https://gh.r-mj.com/siddharthvaddem/openscreen/pull/617)
- [Zenn: recording to OPFS (Japanese)](https://zenn.dev/ww24/articles/308ac1650f6cea)

---

## Known gaps in this research

- ❓ Safari extension recording (popup, tab capture, iOS/iPad) — no authoritative source found
- ❓ Exact Chrome version that shipped MP4 in `MediaRecorder`
- ❓ Firefox Android and iPad screen-capture support
- ❓ Verified per-browser extension RAM — **only our own measurements can answer this**
- ❓ Firefox `tabCapture` / `offscreen` status — relies on a third-party doc, not Mozilla
- ❓ Whether WebM from `MediaRecorder` lacks seek/duration data. A well-known issue from memory, not confirmed in this research
