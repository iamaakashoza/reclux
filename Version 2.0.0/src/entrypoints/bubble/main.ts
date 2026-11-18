// The live webcam picture in the circle on web pages. It shows the camera the Reclux window already opened
// (see shareCamera in overlay.ts), so the browser never asks for the camera again on each website.
import { CAMERA_PORT, gathered } from '../../lib/overlay-protocol';

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

/** Firefox: the picture comes over a WebRTC link inside the computer, only while this page is on screen. */
function link() {
  let port: ReturnType<typeof browser.runtime.connect> | undefined;
  let pc: RTCPeerConnection | undefined;
  const open = () => {
    if (port) return;
    const p = (port = browser.runtime.connect({ name: CAMERA_PORT }));
    const c = (pc = new RTCPeerConnection());
    c.ontrack = (e) => (video.srcObject = e.streams[0] ?? null);
    p.onMessage.addListener(async (offer: RTCSessionDescriptionInit) => {
      await c.setRemoteDescription(offer);
      await c.setLocalDescription();
      await gathered(c);
      p.postMessage(c.localDescription!.toJSON());
    });
  };
  const close = () => {
    port?.disconnect();
    pc?.close();
    port = pc = undefined;
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? close() : open()));
  addEventListener('pagehide', close);
  if (!document.hidden) open();
}
