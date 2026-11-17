// Messages between the recorder page and the overlay on web pages (webcam circle, cursor, fallback bar).
export const OVERLAY_PORT = 'reclux-overlay';

/** Recorder → page. Sent on connect and whenever something changes. */
export interface OverlayState {
  phase: 'countdown' | 'recording' | 'paused' | 'finishing';
  count: number; // countdown number
  elapsed: number; // seconds recorded
  camera: boolean; // show the webcam circle
  pos: { x: number; y: number }; // circle centre, as a share of the window (0–1)
  bar: boolean; // show the in-page control bar (no floating window, e.g. Firefox)
  info: string; // "12 MB · 1080p · 60 fps"
}

/** Page → recorder. */
export type OverlayMessage =
  | { type: 'cursor'; vx: number; vy: number; sx: number; sy: number; wx: number; wy: number }
  | { type: 'pos'; x: number; y: number }
  | { type: 'cmd'; cmd: 'pause' | 'resume' | 'stop' | 'camera' };
