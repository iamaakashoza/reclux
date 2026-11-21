// Recorder side of the web-page overlay: asks for page access, puts the overlay into open tabs while recording,
// sends it the live state, and receives cursor positions and button presses.
import { CAMERA_PORT, OVERLAY_PORT, type CameraMessage, type OverlayMessage, type OverlayState } from './overlay-protocol';

const ACCESS = { origins: ['<all_urls>'] };
const SCRIPT = '/content-scripts/overlay.js';
const REGISTERED = 'reclux-overlay';

/** While recording, every page that starts loading gets the overlay at once (see startOverlays). */
const register = async () => {
  await unregister();
  const script = { id: REGISTERED, js: [SCRIPT], matches: ['<all_urls>'], runAt: 'document_start' as const };
  // Not every browser knows persistAcrossSessions; without it the registration simply ends with the browser.
  await browser.scripting
    .registerContentScripts([{ ...script, persistAcrossSessions: false }])
    .catch(() => browser.scripting.registerContentScripts([script]))
    .catch(() => {});
};
// Left behind by a crash, it is harmless: the overlay finds no recording to connect to and removes itself.
const unregister = () => browser.scripting.unregisterContentScripts({ ids: [REGISTERED] }).catch(() => {});

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
let still: (() => string | undefined) | undefined; // set while the camera is shared, see shareCamera

/**
 * `onShown(true)` while at least one web page on screen shows the overlay, `onShown(false)` when none does (a
 * browser page, a PDF, Opera's search results: Opera keeps extensions off them unless the user allows it).
 */
export function startOverlays(state: () => OverlayState, onMessage: (m: OverlayMessage) => void, onShown: (yes: boolean) => void) {
  const ports = new Map<Port, boolean>(); // each page and whether it is on screen
  const shown = () => onShown([...ports.values()].some(Boolean));
  const inject = (tabId: number) =>
    // Fails on pages no extension may touch (browser settings, web stores, PDFs): fine, nothing to show there.
    browser.scripting.executeScript({ target: { tabId }, files: [SCRIPT] }).catch(() => {});

  const onConnect = (port: Port) => {
    if (port.name !== OVERLAY_PORT) return;
    ports.set(port, false);
    port.onMessage.addListener((m: OverlayMessage) => {
      if (m.type !== 'seen') return onMessage(m);
      ports.set(port, m.on);
      shown();
    });
    port.onDisconnect.addListener(() => {
      ports.delete(port);
      shown();
    });
    const s = state();
    port.postMessage({ ...s, still: s.camera ? still?.() : undefined });
  };
  // A new page (a new tab, a link followed, a search from the address bar) gets the overlay as soon as it STARTS
  // loading. Waiting for "loaded" kept the circle away 30-60 s on busy sites (ads) and forever on pages the browser
  // had loaded ahead (a search typed in the address bar), Issue 8a/8c (report §41).
  const registered = register();
  browser.runtime.onConnect.addListener(onConnect);
  // Pages already open get it now.
  void browser.tabs.query({}).then((tabs) => tabs.forEach((t) => t.id !== undefined && inject(t.id)));

  return {
    update: () => {
      const s = state();
      ports.forEach((_, p) => p.postMessage(s));
    },
    /** Removes the overlay from every page (they clean up when the connection closes). */
    stop: () => {
      void registered.then(unregister); // after it: a quick Stop must not leave it registered
      browser.runtime.onConnect.removeListener(onConnect);
      ports.forEach((_, p) => p.disconnect());
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
  // A new page's circle needs a moment to start its live video (its frame loads with the page). It shows this
  // picture, taken the moment the page connects, until then, so it never flashes empty (Issue 8, report §42).
  const v = document.createElement('video');
  v.muted = true;
  v.srcObject = stream;
  void v.play().catch(() => {});
  let last = { at: 0, url: '' };
  still = () => {
    if (!v.videoWidth) return undefined;
    // Many tabs connect at once when recording starts: one picture serves them all.
    if (performance.now() - last.at < 1000) return last.url;
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const g = c.getContext('2d')!;
    const side = Math.min(v.videoWidth, v.videoHeight);
    g.translate(192, 0);
    g.scale(-1, 1); // mirrored, like the circle
    g.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, 192, 192);
    last = { at: performance.now(), url: c.toDataURL('image/jpeg', 0.7) };
    return last.url;
  };
  const links = new Set<RTCPeerConnection>();
  const onConnect = (port: Port) => {
    if (port.name !== CAMERA_PORT) return;
    // ponytail: one paused link stays open per page visited while recording (a tiny check every few seconds each),
    // close links hidden for minutes if many tabs ever prove costly.
    const pc = new RTCPeerConnection();
    links.add(pc);
    const sending = stream.getTracks().map((t) => [pc.addTrack(t, stream), t] as const);
    // Addresses go as they are found (see link in bubble/main.ts). One found before the offer is sent is in it too.
    pc.onicecandidate = (e) => {
      try {
        if (e.candidate) port.postMessage(e.candidate.toJSON());
      } catch {} // the page went away
    };
    let answered: Promise<void> | undefined;
    port.onMessage.addListener((m: CameraMessage) => {
      // Its page is hidden: send nothing (no cost), on the same link, until it is back (report §43).
      if ('on' in m) sending.forEach(([s, t]) => void s.replaceTrack(m.on ? t : null).catch(() => {}));
      else if ('sdp' in m) answered = pc.setRemoteDescription(m).catch(() => {});
      // An address sent before the answer is in the answer already.
      else if ('candidate' in m) void answered?.then(() => pc.addIceCandidate(m)).catch(() => {});
    });
    port.onDisconnect.addListener(() => {
      pc.close();
      links.delete(pc);
    });
    void pc
      .setLocalDescription()
      .then(() => port.postMessage(pc.localDescription!.toJSON()))
      .catch(() => port.disconnect());
  };
  browser.runtime.onConnect.addListener(onConnect);
  return () => {
    still = undefined;
    v.srcObject = null;
    delete w.recluxCamera;
    browser.runtime.onConnect.removeListener(onConnect);
    links.forEach((pc) => pc.close());
  };
}
