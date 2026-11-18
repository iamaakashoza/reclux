// Recorder side of the web-page overlay: asks for page access, puts the overlay into open tabs while recording,
// sends it the live state, and receives cursor positions and button presses.
import { CAMERA_PORT, OVERLAY_PORT, gathered, type OverlayMessage, type OverlayState } from './overlay-protocol';

const ACCESS = { origins: ['<all_urls>'] };
const SCRIPT = '/content-scripts/overlay.js';

// async + try: a browser without the permissions API simply means "no access", never a crash.
export const hasPageAccess = async () => {
  try {
    return await browser.permissions.contains(ACCESS);
  } catch {
    return false;
  }
};
/** Must run straight from a click. Resolves true when Reclux may show things on web pages. */
export const askPageAccess = async () => {
  try {
    return await browser.permissions.request(ACCESS);
  } catch {
    return false;
  }
};

type Port = ReturnType<typeof browser.runtime.connect>;

export function startOverlays(state: () => OverlayState, onMessage: (m: OverlayMessage) => void) {
  const ports = new Set<Port>();
  const inject = (tabId: number) =>
    // Fails on pages no extension may touch (browser settings, web stores, PDFs): fine, nothing to show there.
    browser.scripting.executeScript({ target: { tabId }, files: [SCRIPT] }).catch(() => {});

  const onConnect = (port: Port) => {
    if (port.name !== OVERLAY_PORT) return;
    ports.add(port);
    port.onMessage.addListener((m: OverlayMessage) => onMessage(m));
    port.onDisconnect.addListener(() => ports.delete(port));
    port.postMessage(state());
  };
  // A page that finished loading (a new tab, or a link followed) gets the overlay again.
  const onUpdated = (tabId: number, info: { status?: string }) => info.status === 'complete' && void inject(tabId);

  browser.runtime.onConnect.addListener(onConnect);
  browser.tabs.onUpdated.addListener(onUpdated);
  void browser.tabs.query({}).then((tabs) => tabs.forEach((t) => t.id !== undefined && inject(t.id)));

  return {
    update: () => {
      const s = state();
      ports.forEach((p) => p.postMessage(s));
    },
    /** Removes the overlay from every page (they clean up when the connection closes). */
    stop: () => {
      browser.runtime.onConnect.removeListener(onConnect);
      browser.tabs.onUpdated.removeListener(onUpdated);
      ports.forEach((p) => p.disconnect());
      ports.clear();
    },
  };
}

/**
 * Lets every webcam circle on web pages show the camera this page already has, so the browser asks for the camera
 * once (in Reclux) and never again per website. Chromium: the circle's frame finds this page and uses the stream
 * as is (no copy, no cost). Firefox gives such a frame no way to reach this page, so there the picture goes over a
 * WebRTC link inside the computer (nothing leaves it), one per circle on screen.
 */
export function shareCamera(stream: MediaStream) {
  const w = window as unknown as { recluxCamera?: MediaStream };
  w.recluxCamera = stream;
  const links = new Set<RTCPeerConnection>();
  const onConnect = (port: Port) => {
    if (port.name !== CAMERA_PORT) return;
    const pc = new RTCPeerConnection();
    links.add(pc);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    port.onMessage.addListener((answer: RTCSessionDescriptionInit) => void pc.setRemoteDescription(answer).catch(() => {}));
    port.onDisconnect.addListener(() => {
      pc.close();
      links.delete(pc);
    });
    void pc
      .setLocalDescription()
      .then(() => gathered(pc))
      .then(() => port.postMessage(pc.localDescription!.toJSON()))
      .catch(() => port.disconnect());
  };
  browser.runtime.onConnect.addListener(onConnect);
  return () => {
    delete w.recluxCamera;
    browser.runtime.onConnect.removeListener(onConnect);
    links.forEach((pc) => pc.close());
  };
}
