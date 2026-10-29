// Measures what really happens while recording: frames per second that arrive,
// and how busy the CPU is. Both are needed to detect "struggling":
// a still screen also gives few frames, so low fps alone is not a problem.

export interface Reading {
  /** Frames that actually arrived per second. */
  fps: number;
  /** Average CPU use in %, or null when the browser cannot tell us. */
  cpu: number | null;
}

/** Warn when the last 5 readings all show fps below 70% of the request while the CPU is above 80%. */
export const STRUGGLE_SECONDS = 5;
export const LOW_FPS_RATIO = 0.7;
export const HIGH_CPU = 80; // ponytail: starting guess, tune with real tests on weaker PCs

interface Processor {
  readable: ReadableStream<{ close(): void }>;
}
type ProcessorCtor = (new (init: { track: MediaStreamTrack }) => Processor) & { isPolyfill?: boolean };
interface CpuApi {
  getInfo(): Promise<{ processors: { usage: { idle: number; total: number } }[] }>;
}

// Chromium only. On other browsers these are undefined and we simply report less.
const g = globalThis as unknown as {
  MediaStreamTrackProcessor?: ProcessorCtor;
  chrome?: { system?: { cpu?: CpuApi } };
};

const readCpu = async () => {
  try {
    const info = await g.chrome?.system?.cpu?.getInfo();
    if (!info) return null;
    return info.processors.reduce(
      (a, p) => ({ idle: a.idle + p.usage.idle, total: a.total + p.usage.total }),
      { idle: 0, total: 0 },
    );
  } catch {
    return null;
  }
};

export function startMonitor(track: MediaStreamTrack, onReading: (r: Reading) => void): () => void {
  // The stand-in used in Firefox repeats frames at a fixed rate, so it cannot tell how many really arrive.
  if (!g.MediaStreamTrackProcessor || g.MediaStreamTrackProcessor.isPolyfill) return () => {};

  // Count frames on a clone, so the recording itself is untouched.
  const clone = track.clone();
  const reader = new g.MediaStreamTrackProcessor({ track: clone }).readable.getReader();
  let frames = 0;
  let stopped = false;
  void (async () => {
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      frames++;
      value.close(); // release the frame at once, so memory stays flat
    }
  })().catch(() => {});

  let lastTime = performance.now();
  let lastFrames = 0;
  let lastCpu: { idle: number; total: number } | null = null;
  void readCpu().then((c) => (lastCpu = c));

  const timer = setInterval(async () => {
    const now = performance.now();
    // Use real elapsed time, because a hidden tab can run timers late.
    const fps = ((frames - lastFrames) / (now - lastTime)) * 1000;
    lastTime = now;
    lastFrames = frames;

    const cpuNow = await readCpu();
    let cpu: number | null = null;
    if (cpuNow && lastCpu && cpuNow.total > lastCpu.total) {
      cpu = Math.round(100 * (1 - (cpuNow.idle - lastCpu.idle) / (cpuNow.total - lastCpu.total)));
    }
    lastCpu = cpuNow;
    if (!stopped) onReading({ fps, cpu });
  }, 1000);

  return () => {
    stopped = true;
    clearInterval(timer);
    void reader.cancel().catch(() => {});
    clone.stop();
  };
}
