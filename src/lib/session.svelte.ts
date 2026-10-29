// Recording controller: real capture, written straight to disk, driving the screens.
import { openCapture, type Capture, type Format } from './capture';
import { HIGH_CPU, LOW_FPS_RATIO, STRUGGLE_SECONDS, startMonitor, type Reading } from './monitor';
import { keepAwake } from './awake';
import { STOP_FREE, freeBytes } from './disk';
import { MAX_SECONDS, findPreset, fmtSize, sizeMB } from './presets';
import { startRecorder, type Recorder } from './recorder';
import { loadSettings, saveSettings } from './settings';
import { findUnsaved, getStored, holdStored, markSaved, removeStored, type Stored } from './store';
import { untrack } from 'svelte';

export type Phase = 'idle' | 'countdown' | 'recording' | 'paused' | 'finished';

const SURFACE = { tab: 'browser', window: 'window', screen: 'monitor' } as const;

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
  finishing: false,
  notices: [] as string[],
  error: '',
  // Unsaved recordings found from an earlier session
  recoverable: [] as Stored[],
  // Measured while recording (null = no reading yet / browser cannot tell)
  fps: null as number | null,
  cpu: null as number | null,
  struggling: false,
  ignoreStruggle: false,
  // Free space for recordings (null = browser cannot tell). lowDisk = less than a full 2 hours would need.
  free: null as number | null,
  lowDisk: false,
});

// Remember the choices. Changes made while recording (e.g. "Switch to 30 fps") are one-offs and are not kept.
$effect.root(() => {
  $effect(() => {
    const { source, presetId, format, mic, system } = session;
    if (untrack(() => session.phase) === 'idle') saveSettings({ source, presetId, format, mic, system });
  });
});
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
let stopMonitor: (() => void) | undefined;
let recent: Reading[] = [];
let busy = false;

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

// Struggling = few frames AND a busy CPU, several seconds in a row.
// Once shown, the warning stays until the user answers it.
function onReading(r: Reading) {
  session.fps = Math.round(r.fps);
  session.cpu = r.cpu;
  if (session.phase !== 'recording') {
    recent = [];
    return;
  }
  recent = [...recent, r].slice(-STRUGGLE_SECONDS);
  const want = findPreset(session.presetId).fps;
  if (
    !session.ignoreStruggle &&
    recent.length === STRUGGLE_SECONDS &&
    recent.every((x) => x.cpu !== null && x.cpu >= HIGH_CPU && x.fps < want * LOW_FPS_RATIO)
  ) {
    session.struggling = true;
  }
}

/** "Switch to 30 fps": lowers the frame rate of the live recording. */
export async function lowerFps() {
  const next = findPreset(`${findPreset(session.presetId).height}p30`);
  session.presetId = next.id;
  session.struggling = false;
  recent = [];
  await cap?.setFps(30).catch(() => {
    session.notices = [...session.notices, 'The browser would not lower the frame rate while recording.'];
  });
  if (cap) session.actual = cap.actual;
}

/** "Keep": stop warning for the rest of this recording. */
export function keepAsIs() {
  session.ignoreStruggle = true;
  session.struggling = false;
}

function endMonitor() {
  stopMonitor?.();
  stopMonitor = undefined;
  recent = [];
  clearInterval(diskTimer);
}

export async function start() {
  if (busy || session.phase !== 'idle') return;
  busy = true;
  session.error = '';
  session.notices = [];
  Object.assign(session, { fps: null, cpu: null, struggling: false, ignoreStruggle: false });
  recent = [];
  const preset = findPreset(session.presetId);
  try {
    cap = await openCapture(preset, SURFACE[session.source], session.mic, session.system);
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
  cap.video.addEventListener('ended', stop); // user clicked the browser's "Stop sharing"

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
  if (rec.ext !== session.format) {
    session.notices = [...session.notices, `${session.format.toUpperCase()} is not available here. Saving as ${rec.ext.toUpperCase()}.`];
  }
  session.ext = rec.ext;
  cap!.setMuted(session.muted);
  stopMonitor = startMonitor(cap!.video, onReading);
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
    try {
      const file = await rec.stop();
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
  } else if (!rec && live) {
    session.phase = 'finished'; // design preview only
  }
}

/** Show a finished file on the Finished screen. */
function show(file: File) {
  keepAwake(false);
  cap?.close();
  cap = undefined;
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  session.name = `Reclux ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}`;
  session.url = URL.createObjectURL(file); // points at the file on disk, not a copy in RAM
  session.bytes = file.size;
  session.phase = 'finished';
}

export function toggleMute() {
  session.muted = !session.muted;
  cap?.setMuted(session.muted);
}

export function reset() {
  stopTimer();
  endMonitor();
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
    fps: null,
    cpu: null,
    struggling: false,
  });
  void refreshRecoverable();
}

/** Opens a "Save as" window, so the user can pick any folder or drive (D:, E:…). */
export async function save() {
  if (!session.url) return;
  const clean = session.name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Reclux recording';
  const filename = `${clean}.${session.ext}`;
  try {
    if (browser?.downloads) {
      await browser.downloads.download({ url: session.url, filename, saveAs: true });
    } else {
      const a = document.createElement('a');
      a.href = session.url;
      a.download = filename;
      a.click();
    }
    session.saved = true;
    // So the next launch does not offer this recording again as "unsaved".
    if (session.fileName) markSaved(session.fileName);
  } catch (e) {
    const msg = (e as Error).message;
    if (!/cancel/i.test(msg)) session.error = `Could not save: ${msg}`;
  }
}

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

/** Design preview only: jump straight to a screen. Ignored during a real recording. */
export function setPhase(p: Phase) {
  if (rec || cap) return;
  stopTimer();
  session.count = 3;
  if (p === 'idle') session.elapsed = 0;
  else if (p !== 'countdown' && session.elapsed === 0) session.elapsed = 768;
  previewElapsed(session.elapsed);
  session.phase = p;
}

export function previewElapsed(seconds: number) {
  if (rec || cap) return;
  session.elapsed = seconds;
  session.bytes = sizeMB(findPreset(session.presetId), seconds) * 1e6;
}
