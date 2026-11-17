// The floating controls window (Screen 2): an always-on-top window that stays visible over any tab or app.
// Chromium only (Document Picture-in-Picture). Firefox gets the small bar on web pages instead.
import { mount, unmount } from 'svelte';
import Floating from './Floating.svelte';
import { session } from './session.svelte';

type PipApi = { requestWindow(o: { width: number; height: number }): Promise<Window> };
const api = () => (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;

export const canFloat = () => !!api();
let win: Window | undefined;

/** Must run straight from a click (the browser allows it only then). */
export function openFloating() {
  const pip = api();
  if (!pip || win) return;
  const withCam = session.camera && !session.pageAccess; // no circle on web pages: show it here instead
  pip
    .requestWindow({ width: 480, height: withCam ? 360 : 150 })
    .then((w) => {
      win = w;
      // Same styles as this page, and the same light/dark, solid and "recording" switches.
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => w.document.head.append(n.cloneNode(true)));
      for (const a of ['data-solid', 'data-recording']) w.document.documentElement.toggleAttribute(a, document.documentElement.hasAttribute(a));
      w.document.title = 'Reclux';
      const app = mount(Floating, { target: w.document.body });
      session.floating = true;
      w.addEventListener('pagehide', () => {
        unmount(app);
        win = undefined;
        session.floating = false;
      });
    })
    .catch(() => {}); // blocked or no click: the controls stay in the Reclux tab and on web pages
}

export const closeFloating = () => win?.close();
