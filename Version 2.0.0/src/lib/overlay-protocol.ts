// Messages between the recorder page and the overlay on web pages (webcam circle, cursor, fallback bar).
export const OVERLAY_PORT = 'reclux-overlay';

/** Recorder → page. Sent on connect and whenever something changes. */
export interface OverlayState {
  phase: 'countdown' | 'recording' | 'paused' | 'finishing';
  count: number; // countdown number
  elapsed: number; // seconds recorded
  camera: boolean; // show the webcam circle
  webcam: boolean; // Webcam mode (the bar's webcam button), even while the circle is hidden
  pos: { x: number; y: number }; // circle centre, as a share of the window (0–1)
  bar: boolean; // show the in-page control bar (no floating window, e.g. Firefox)
  info: string; // "12 MB · 1080p · 60 fps"
  /** The webcam's picture right now (first message only): shown in the circle until its live video starts. */
  still?: string;
}

/** Page → recorder. */
export type OverlayMessage =
  | { type: 'cursor'; vx: number; vy: number; sx: number; sy: number; wx: number; wy: number }
  | { type: 'pos'; x: number; y: number }
  | { type: 'seen'; on: boolean } // the page is on screen (or not)
  | { type: 'cmd'; cmd: 'pause' | 'resume' | 'stop' | 'camera' };

/** The circle's frame on a web page → recorder: "send me the camera" (Firefox, see shareCamera in overlay.ts). */
export const CAMERA_PORT = 'reclux-camera';

/** Over CAMERA_PORT, both ways: the link's offer/answer and addresses; from the frame also "my page is (not) on screen". */
export type CameraMessage = RTCSessionDescriptionInit | RTCIceCandidateInit | { on: boolean };
