// The live webcam picture in the circle on web pages. It shows the camera the Reclux window already opened
// (see shareCamera in overlay.ts), so the browser never asks for the camera again on each website.
import { CAMERA_PORT, type CameraMessage } from '../../lib/overlay-protocol';

const video = document.querySelector('video')!;

// Chromium: the Reclux window is reachable from here, so use its camera stream as is.
const views = ((browser.extension as unknown as { getViews?: () => Window[] }).getViews?.() ?? []) as Window[];
const shared = views
  .map((v) => {
    try {
      return (v as Window & { recluxCamera?: MediaStream }).recluxCamera;
    } catch {
      return undefined; // a page that is not ours to read
    }
  })
  .find(Boolean);

if (shared) video.srcObject = shared;
else link();

/**
 * Firefox: the picture comes over a WebRTC link inside the computer, made once per page (the first time it is on
 * screen). While the page is hidden (another tab, another app in front) the Reclux tab stops sending and starts
 * again when it is back, on the same link. Closing and rebuilding the link each time made the circle blink: an old
 * picture, then about a second until live (report §43).
 */
function link() {
  let port: ReturnType<typeof browser.runtime.connect> | undefined;
  let pc: RTCPeerConnection | undefined;
  /** Ends the link. The next time the page is shown, a new one is made. */
  const drop = () => {
    port?.disconnect();
    pc?.close();
    port = pc = undefined;
  };
  const open = () => {
    const p = (port = browser.runtime.connect({ name: CAMERA_PORT }));
    const c = (pc = new RTCPeerConnection());
    c.ontrack = (e) => (video.srcObject = e.streams[0] ?? null);
    // A link that broke is made again at once (closing it on every hide used to do this by chance).
    c.onconnectionstatechange = () => c.connectionState === 'failed' && (drop(), seen());
    p.onDisconnect.addListener(drop); // the Reclux tab ended it
    // Each address is sent the moment it is found, not after all are: the circle goes live sooner on a new page.
    c.onicecandidate = (e) => {
      try {
        if (e.candidate) p.postMessage(e.candidate.toJSON());
      } catch {} // the recording ended
    };
    let answered: Promise<void> | undefined;
    p.onMessage.addListener((m: CameraMessage) => {
      if ('sdp' in m)
        answered = c
          .setRemoteDescription(m)
          .then(() => c.setLocalDescription())
          .then(() => p.postMessage(c.localDescription!.toJSON()))
          .catch(() => {}); // the recording ended meanwhile
      // An address sent before the offer arrived is in the offer already.
      else if ('candidate' in m) void answered?.then(() => c.addIceCandidate(m)).catch(() => {});
    });
  };
  const seen = () => {
    if (!port) return void (!document.hidden && open());
    try {
      port.postMessage({ on: !document.hidden } satisfies CameraMessage);
    } catch {} // the recording ended
  };
  document.addEventListener('visibilitychange', seen);
  addEventListener('pagehide', () => {
    document.removeEventListener('visibilitychange', seen);
    drop();
  });
  seen();
}
