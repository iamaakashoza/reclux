// Recording controller: real capture, written straight to disk, driving the screens.
import { openCapture, type Capture, type Format } from './capture';
import { keepAwake } from './awake';
import { STOP_FREE, freeBytes } from './disk';
import { MAX_SECONDS, findPreset, fmtSize, sizeMB } from './presets';
import { startRecorder, type Recorder } from './recorder';
import { loadSettings, saveSettings } from './settings';
import { findUnsaved, getStored, holdStored, markSaved, removeStored, type Stored } from './store';
import { hasPageAccess, startOverlays } from './overlay';
import type { OverlayMessage, OverlayState } from './overlay-protocol';
import { autoZoom, type CursorPoint, type Zoom } from './zoom';
import type { Clip } from './edit';
import { renderEdit } from './render';
import { untrack } from 'svelte';

type Phase = 'idle' | 'countdown' | 'recording' | 'paused' | 'finished';

export const session = $state({
  phase: 'idle' as Phase,
  ...loadSettings(),
  muted: false,
  count: 3,
  elapsed: 0,
  bytes: 0,
  actual: '',
  ext: 'mp4' as Format,
  url: '',
  name: '',
  fileName: '', // name of the file in private storage
  saved: false,
  exporting: false, // the browser is still writing the exported file
  finishing: false,
  finishShare: 0, // 0 to 1, while the file is being finished
  notices: [] as string[],
  error: '',
  // Unsaved recordings found from an earlier session
  recoverable: [] as Stored[],
  ducked: null as boolean | null, // system sound is dipped for speech right now (null = ducking is not in use)
  // Free space for recordings (null = browser cannot tell). lowDisk = less than a full 2 hours would need.
  free: null as number | null,
  lowDisk: false,
  // Webcam circle and cursor zoom (Phase 5)
  pageAccess: false, // the user allowed Reclux on web pages (circle + cursor)
  floating: false, // the floating controls window is open
  camVisible: true, // the circle is shown (it can be hidden while recording)
  camPos: { x: 0.86, y: 0.8 }, // circle centre on web pages, as a share of the window (bottom-right, as in the sketch)
  cameraStream: null as MediaStream | null, // only kept when the circle lives in the floating window
  zooms: [] as Zoom[], // cursor zoom blocks for the editor
});

// Remember the choices (only while idle, so nothing changes under a live recording).
$effect.root(() => {
  $effect(() => {
    const { presetId, format, mic, system, camera, zoom } = session;
    if (untrack(() => session.phase) === 'idle') saveSettings({ presetId, format, mic, system, camera, zoom });
  });
  // Keep the web-page overlays in step with the recording.
  $effect(() => {
    void [session.phase, session.count, session.elapsed, session.bytes, session.camVisible, session.camPos, session.floating];
    untrack(() => overlays?.update());
  });
});
export const refreshPageAccess = async () => (session.pageAccess = await hasPageAccess());
void refreshPageAccess();
// The popup may change them while this page is open and idle.
addEventListener('storage', () => {
  if (session.phase === 'idle') Object.assign(session, loadSettings());
});

// Free-space guard. Idle: tells the user before starting. Recording: warns, then stops safely.
export async function refreshDisk() {
  session.free = await freeBytes();
  if (session.phase === 'idle' && session.free !== null) {
    session.lowDisk = session.free < sizeMB(findPreset(session.presetId), MAX_SECONDS) * 1e6;
  }
}
let diskTimer: ReturnType<typeof setInterval> | undefined;
async function checkDisk() {
  await refreshDisk();
  if (session.free !== null && session.free < STOP_FREE && session.phase !== 'idle') {
    session.notices = [
      ...session.notices,
      `Recording stopped because the disk is almost full (${fmtSize(session.free / 1e6)} left). Your recording is saved up to this point.`,
    ];
    void stop();
  }
}
// Let go of the keep-awake request if the tab goes away without a clean stop.
addEventListener('pagehide', () => keepAwake(false));

let cap: Capture | undefined;
let rec: Recorder | undefined;
let releaseFile: (() => void) | undefined;
let busy = false;
let overlays: ReturnType<typeof startOverlays> | undefined;
let cursor: CursorPoint[] = [];

// Clock counts only time spent recording, so Pause does not add time.
let timer: ReturnType<typeof setInterval> | undefined;
let activeMs = 0;
let last = 0;
const stopTimer = () => {
  clearInterval(timer);
  timer = undefined;
};
const every = (ms: number, fn: () => void) => {
  stopTimer();
  timer = setInterval(fn, ms);
};
const tick = () => {
  const now = performance.now();
  activeMs += now - last;
  last = now;
  session.elapsed = Math.floor(activeMs / 1000);
};
const runClock = () => {
  last = performance.now();
  every(250, tick);
};
/** Seconds of recording so far, to the millisecond (for cursor positions). */
const recTime = () => (activeMs + (session.phase === 'recording' ? performance.now() - last : 0)) / 1000;

function overlayState(): OverlayState {
  const p = findPreset(session.presetId);
  const phase = session.finishing ? 'finishing' : session.phase === 'paused' ? 'paused' : session.phase === 'countdown' ? 'countdown' : 'recording';
  return {
    phase,
    count: session.count,
    elapsed: session.elapsed,
    camera: session.camera && session.camVisible,
    pos: { ...session.camPos },
    bar: !session.floating,
    info: `${fmtSize(session.bytes / 1e6)} · ${p.height}p · ${p.fps} fps`,
  };
}

function onOverlay(m: OverlayMessage) {
  if (m.type === 'pos') session.camPos = { x: m.x, y: m.y };
  else if (m.type === 'cmd') {
    if (m.cmd === 'pause') pause();
    else if (m.cmd === 'resume') resume();
    else if (m.cmd === 'stop') void stop();
    else session.camVisible = !session.camVisible;
  } else if (session.zoom && session.phase === 'recording') {
    // Use the coordinates that match what is being recorded: a tab, a window or the whole screen.
    const surface = (cap?.video.getSettings() as { displaySurface?: string } | undefined)?.displaySurface;
    const [x, y] = surface === 'browser' ? [m.vx, m.vy] : surface === 'window' ? [m.wx, m.wy] : [m.sx, m.sy];
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) cursor.push({ t: recTime(), x, y });
  }
}

function endOverlays() {
  overlays?.stop();
  overlays = undefined;
}

/** Brings the Reclux tab to the front (Stop may have been pressed in the floating window or on a web page). */
async function focusMe() {
  const tab = await Promise.resolve()
    .then(() => browser.tabs.getCurrent())
    .catch(() => undefined);
  if (tab?.id === undefined) return;
  await browser.tabs.update(tab.id, { active: true }).catch(() => {});
  if (tab.windowId !== undefined) await browser.windows.update(tab.windowId, { focused: true }).catch(() => {});
}

// No "your computer is struggling" warning in V2: V1's rule mostly measured the browser's change-driven
// screen capture, not the computer (report §34). Frames the pump had to skip are only logged, for testing.
function endMonitor() {
  clearInterval(diskTimer);
}

export async function start() {
  if (busy || session.phase !== 'idle') return;
  busy = true;
  session.error = '';
  session.notices = [];
  session.finishShare = 0;
  const preset = findPreset(session.presetId);
  try {
    cap = await openCapture(preset, session.mic, session.system, session.camera, (d) => (session.ducked = d));
  } catch (e) {
    if ((e as DOMException).name === 'NotAllowedError') {
      session.notices = ['Screen sharing was cancelled or blocked.'];
    } else {
      session.error = `Could not start: ${(e as Error).message}`;
    }
    busy = false;
    return;
  }
  busy = false;

  session.notices = [...cap.notices];
  session.actual = cap.actual;
  session.ducked = cap.ducks ? false : null;
  cap.video.addEventListener('ended', stop); // user clicked the browser's "Stop sharing"

  // Webcam circle and cursor zoom. Asking for the camera above also lets the circle on web pages use it.
  await refreshPageAccess();
  session.camVisible = true;
  session.cameraStream = session.camera && !session.pageAccess ? (cap.camera ?? null) : null;
  if (session.pageAccess) cap.camera?.getTracks().forEach((t) => t.stop()); // the circle on the page opens its own
  cursor = [];
  session.zooms = [];
  if (session.pageAccess && (session.camera || session.zoom)) overlays = startOverlays(overlayState, onOverlay);

  activeMs = 0;
  session.elapsed = 0;
  session.bytes = 0;
  session.saved = false;
  session.count = 3;
  session.phase = 'countdown';
  every(1000, () => {
    if (--session.count > 0) return;
    stopTimer();
    void begin();
  });
}

async function begin() {
  const preset = findPreset(session.presetId);
  let started: Recorder;
  try {
    started = await startRecorder(
      cap!,
      session.format,
      preset,
      (bytes) => (session.bytes = bytes),
      (e) => {
        session.error = `Recording stopped: ${e.message}`;
        void stop();
      },
    );
  } catch (e) {
    session.error = `Could not start recording: ${(e as Error).message}`;
    reset();
    return;
  }
  if (session.phase !== 'countdown') {
    await started.cancel(); // the user cancelled while the encoder was starting
    return;
  }
  rec = started;
  releaseFile = rec.release;
  session.fileName = rec.name;
  // WebM without a hardware encoder quietly becomes MP4. The Finished screen shows the real format.
  session.ext = rec.ext;
  cap!.setMuted(session.muted);
  diskTimer = setInterval(checkDisk, 10_000);
  keepAwake(true);
  session.phase = 'recording';
  runClock();
}

export function pause() {
  if (!rec || session.phase !== 'recording') return;
  tick();
  stopTimer();
  rec.pause();
  session.phase = 'paused';
}

export function resume() {
  if (!rec || session.phase !== 'paused') return;
  rec.resume();
  session.phase = 'recording';
  runClock();
}

export async function stop() {
  const live = session.phase === 'recording' || session.phase === 'paused';
  if (rec && live) {
    if (session.finishing) return;
    session.finishing = true;
    if (session.phase === 'recording') tick();
    stopTimer();
    endMonitor();
    const { fresh, lost } = rec.stats();
    console.info(`Reclux: ${fresh} new pictures from the capture, ${lost} frames skipped.`);
    try {
      const file = await rec.stop((share) => (session.finishShare = share));
      show(file);
    } catch (e) {
      session.error ||= `Could not finish the file: ${(e as Error).message}. What was recorded so far is kept. Use "Recover it" below.`;
      // Do not delete the half-finished file: a fragmented MP4 is still playable.
      rec = undefined;
      session.fileName = '';
      reset();
    }
    session.finishing = false;
  } else if (session.phase === 'countdown') {
    reset();
  }
}

/** Next file name: Reclux-recording_001, _002… The count is kept in this browser. */
function nextName() {
  let n = 1;
  try {
    n = (Number(localStorage.getItem('reclux.count')) || 0) + 1;
    localStorage.setItem('reclux.count', String(n));
  } catch {}
  return `Reclux-recording_${String(n).padStart(3, '0')}`;
}

/** Show a finished file in the editor. */
function show(file: File) {
  keepAwake(false);
  cap?.close();
  cap = undefined;
  session.name = nextName();
  session.url = URL.createObjectURL(file); // points at the file on disk, not a copy in RAM
  session.bytes = file.size;
  endOverlays();
  session.cameraStream = null;
  session.zooms = session.zoom ? autoZoom(cursor, activeMs / 1000) : [];
  session.phase = 'finished';
  void focusMe();
}

export function toggleMute() {
  session.muted = !session.muted;
  cap?.setMuted(session.muted);
}

export function reset() {
  stopTimer();
  endMonitor();
  endOverlays();
  keepAwake(false);
  const r = rec;
  rec = undefined;
  if (r && session.phase !== 'finished') void r.cancel(); // still recording: throw it away
  else if (session.fileName) void removeStored(session.fileName); // finished or recovered: done with it
  releaseFile?.();
  releaseFile = undefined;
  cap?.close();
  cap = undefined;
  if (session.url) URL.revokeObjectURL(session.url);
  session.finishing = false;
  Object.assign(session, {
    phase: 'idle',
    elapsed: 0,
    bytes: 0,
    url: '',
    saved: false,
    actual: '',
    name: '',
    fileName: '',
    ducked: null,
    cameraStream: null,
    zooms: [],
  });
  void refreshRecoverable();
}

/**
 * "Save changes" with edits: builds the edited video and puts it in place of the original recording.
 * The original is only deleted once the new file is complete, so a failure or Cancel loses nothing.
 */
export async function applyEdit(clips: Clip[], onProgress: (share: number) => void, cancelled: () => boolean) {
  const out = await renderEdit(session.fileName, clips, $state.snapshot(session.zooms), findPreset(session.presetId), onProgress, cancelled);
  releaseFile?.();
  await removeStored(session.fileName);
  releaseFile = out.release;
  URL.revokeObjectURL(session.url);
  Object.assign(session, {
    fileName: out.name,
    ext: out.ext,
    url: URL.createObjectURL(out.file),
    bytes: out.file.size,
    elapsed: Math.round(out.duration),
    zooms: [], // now part of the picture
    saved: false,
  });
}

/** Opens a "Save as" window, so the user can pick any folder or drive (D:, E:…). */
export async function save() {
  const clean = session.name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Reclux recording';
  const filename = `${clean}.${session.ext}`;
  if (session.exporting) return;
  session.exporting = true;
  try {
    const id = await browser.downloads.download({ url: session.url, filename, saveAs: true });
    // download() returns when copying STARTS. A 2-hour file takes a while, and deleting it from Reclux
    // before then would break the copy, so wait until the browser says it is done.
    if ((await downloadEnd(id)) !== 'complete') throw new Error('the copy was interrupted. Please try again.');
    session.saved = true;
    // So the next launch does not offer this recording again as "unsaved".
    if (session.fileName) markSaved(session.fileName);
  } catch (e) {
    const msg = (e as Error).message;
    if (!/cancel/i.test(msg)) session.error = `Could not save: ${msg}`;
  } finally {
    session.exporting = false;
  }
}

/** Resolves with "complete" or "interrupted" when the browser has finished the download. */
const downloadEnd = (id: number) =>
  new Promise<string>((resolve) => {
    const done = (state?: string) => {
      if (!state || state === 'in_progress') return;
      browser.downloads.onChanged.removeListener(onChanged);
      resolve(state);
    };
    const onChanged = (d: { id: number; state?: { current?: string } }) => {
      if (d.id === id) done(d.state?.current);
    };
    browser.downloads.onChanged.addListener(onChanged);
    void browser.downloads.search({ id }).then(([d]) => done(d?.state)); // it may already be finished
  });

/** Look for recordings left behind by a crash or a closed tab. */
export async function refreshRecoverable() {
  try {
    session.recoverable = await findUnsaved();
  } catch {
    session.recoverable = [];
  }
}

/** Bring a left-behind recording back to the Finished screen. */
export async function recover(item: Stored) {
  if (session.phase !== 'idle') return;
  try {
    releaseFile = await holdStored(item.name);
    const file = await getStored(item.name);
    session.fileName = item.name;
    session.ext = item.name.endsWith('.webm') ? 'webm' : 'mp4';
    session.actual = 'Recovered file';
    show(file);
    session.name = `Recovered ${new Date(item.modified).toLocaleString().replace(/[/:,]/g, '.')}`.trim();
    session.elapsed = await durationOf(session.url);
    session.saved = false;
    session.recoverable = session.recoverable.filter((r) => r.name !== item.name);
  } catch (e) {
    session.error = `Could not open the recording: ${(e as Error).message}`;
  }
}

export async function discardRecoverable(item: Stored) {
  await removeStored(item.name);
  await refreshRecoverable();
}

/** Length in seconds read from the file itself, or 0 when unknown. */
const durationOf = (url: string) =>
  new Promise<number>((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : 0);
    v.onerror = () => resolve(0);
    v.src = url;
  });
