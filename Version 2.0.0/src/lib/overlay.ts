// Recorder side of the web-page overlay: asks for page access, puts the overlay into open tabs while recording,
// sends it the live state, and receives cursor positions and button presses.
import { OVERLAY_PORT, type OverlayMessage, type OverlayState } from './overlay-protocol';

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
