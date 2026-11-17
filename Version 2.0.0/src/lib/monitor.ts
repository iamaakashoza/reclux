// Reads how the recording is going, once a second: new pictures from the capture,
// frames the file had to skip, and how busy the CPU is.

export interface Reading {
  /** New pictures per second, or null where it cannot be told (the Firefox stand-in repeats frames itself). */
  fps: number | null;
  /** Frames skipped per second, because the PC could not encode them in time. */
  lost: number;
  /** Average CPU use in %, or null when the browser cannot tell us. */
  cpu: number | null;
}

/** Warn when one of the rules below holds for this many readings in a row. */
export const STRUGGLE_SECONDS = 5;
export const LOST_RATIO = 0.02; // real loss in the file, at any frame rate
// Few new pictures on a busy CPU. A still screen also sends few, so low fps alone is not a problem.
export const LOW_FPS_RATIO = 0.7;
export const HIGH_CPU = 80; // ponytail: starting guess, tune with real tests on weaker PCs
// Below this the warning is only about real loss: about 20 new pictures a second is normal for
// entire-screen capture, and the file still plays at a locked 30 (report §31).
export const LOW_FPS_MIN_PRESET = 50;

interface CpuApi {
  getInfo(): Promise<{ processors: { usage: { idle: number; total: number } }[] }>;
}

// Chromium only. On other browsers this is undefined and we simply report less.
const g = globalThis as unknown as { chrome?: { system?: { cpu?: CpuApi } } };

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

export function startMonitor(
  stats: () => { fresh: number; lost: number },
  countsFresh: boolean,
  onReading: (r: Reading) => void,
): () => void {
  let stopped = false;
  let lastTime = performance.now();
  let last = stats();
  let lastCpu: { idle: number; total: number } | null = null;
  void readCpu().then((c) => (lastCpu = c));

  const timer = setInterval(async () => {
    const now = performance.now();
    const seconds = (now - lastTime) / 1000; // real elapsed time, because a hidden tab can run timers late
    const current = stats();
    const fps = countsFresh ? (current.fresh - last.fresh) / seconds : null;
    const lost = (current.lost - last.lost) / seconds;
    lastTime = now;
    last = current;

    const cpuNow = await readCpu();
    let cpu: number | null = null;
    if (cpuNow && lastCpu && cpuNow.total > lastCpu.total) {
      cpu = Math.round(100 * (1 - (cpuNow.idle - lastCpu.idle) / (cpuNow.total - lastCpu.total)));
    }
    lastCpu = cpuNow;
    if (!stopped) onReading({ fps, lost, cpu });
  }, 1000);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
