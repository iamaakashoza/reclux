// Cursor zoom: turns the recorded cursor path into zoom blocks for the editor (and, in Phase 6, the export).
// Owner's rule: while the cursor works in one area, zoom into it; when it stops (or jumps far away), zoom back out.

export interface CursorPoint {
  t: number; // seconds into the recording
  x: number; // 0–1 across the video
  y: number; // 0–1 down the video
}
export interface Zoom {
  start: number;
  end: number;
  x: number; // centre of the zoomed view, 0–1
  y: number;
  scale: number;
}

// ponytail: fixed starting values, tune with real recordings; the editor can change each block (Phase 6).
export const ZOOM_SCALE = 1.6;
const STILL_AFTER = 1.5; // s without movement = "stopped" → zoom out
const MIN_ACTIVE = 1.0; // s of activity before a zoom is worth it
const MOVE_EPS = 0.004; // smaller moves are hand jitter, not activity
const AREA = 0.3; // moving further than this from the block's centre = "left the area"
const MERGE_GAP = 1.0; // blocks closer than this join into one
const EASE = 0.5; // s to zoom in or out (used by the preview and export)

/** Zoom blocks from a cursor path. Points must be in time order. */
export function autoZoom(points: CursorPoint[], duration: number): Zoom[] {
  const blocks: Zoom[] = [];
  let run: CursorPoint[] = [];
  const close = (endAt: number) => {
    if (run.length > 1 && run[run.length - 1]!.t - run[0]!.t >= MIN_ACTIVE) {
      const x = run.reduce((a, p) => a + p.x, 0) / run.length;
      const y = run.reduce((a, p) => a + p.y, 0) / run.length;
      // Start a little early so the zoom has landed when the action begins.
      blocks.push({ start: Math.max(0, run[0]!.t - EASE), end: Math.min(duration, endAt), x, y, scale: ZOOM_SCALE });
    }
    run = [];
  };
  let prev: CursorPoint | undefined;
  for (const p of points) {
    const moved = !prev || Math.hypot(p.x - prev.x, p.y - prev.y) > MOVE_EPS;
    if (prev && p.t - prev.t > STILL_AFTER) close(prev.t + STILL_AFTER); // it stopped for a while
    if (moved) {
      const c = run.length ? centre(run) : p;
      if (run.length && Math.hypot(p.x - c.x, p.y - c.y) > AREA) close(p.t); // jumped to another area
      run.push(p);
    }
    prev = p;
  }
  if (prev) close(Math.min(duration, prev.t + STILL_AFTER));
  return merge(blocks).map(fit);
}

const centre = (run: CursorPoint[]) => ({
  x: run.reduce((a, p) => a + p.x, 0) / run.length,
  y: run.reduce((a, p) => a + p.y, 0) / run.length,
});

function merge(blocks: Zoom[]) {
  const out: Zoom[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (last && b.start - last.end < MERGE_GAP && Math.hypot(b.x - last.x, b.y - last.y) < AREA) {
      last.end = b.end;
    } else out.push({ ...b });
  }
  return out;
}

/** Moves the centre so the zoomed view never shows past the edge of the video. */
export function fit(z: Zoom): Zoom {
  const half = 0.5 / z.scale;
  const clamp = (v: number) => Math.min(1 - half, Math.max(half, v));
  return { ...z, x: clamp(z.x), y: clamp(z.y) };
}

/**
 * The view at time t: how much to zoom and which point of the video sits in the middle.
 * Size and centre both ease in and out at each block's edges, so the camera glides instead of jumping.
 * To draw it: scale by `scale` around the centre of the frame, after moving (x, y) to the centre.
 */
export function zoomAt(zooms: Zoom[], t: number): { scale: number; x: number; y: number } {
  for (const z of zooms) {
    if (t < z.start || t > z.end) continue;
    const k = Math.min(1, (t - z.start) / EASE, (z.end - t) / EASE);
    const e = k * k * (3 - 2 * k); // smooth start and stop
    return { scale: 1 + (z.scale - 1) * e, x: 0.5 + (z.x - 0.5) * e, y: 0.5 + (z.y - 0.5) * e };
  }
  return { scale: 1, x: 0.5, y: 0.5 };
}
