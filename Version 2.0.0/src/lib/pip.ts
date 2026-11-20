// The recording controls in their own windows:
//  - the small controls window (opened by the Reclux tab when recording starts, lib/window.ts);
//  - the always-on-top window (the pin in the bar): Document Picture-in-Picture, which stays over every tab and app.
// Both show the same Floating controls, mounted from the Reclux tab, so they share its live recording state.
import { mount, unmount } from 'svelte';
import Floating from './Floating.svelte';
import { session } from './session.svelte';
import { minimiseControls } from './window';

type PipApi = { requestWindow(o: { width: number; height: number }): Promise<Window>; window: Window | null };
const api = (w: Window) => (w as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;

/** Puts the controls into another Reclux window, with this page's styles. onClose runs when that window closes. */
export function mountControls(w: Window, onClose: () => void) {
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => w.document.head.append(n.cloneNode(true)));
  w.document.documentElement.toggleAttribute('data-recording', document.documentElement.hasAttribute('data-recording'));
  w.document.title = 'Reclux';
  const app = mount(Floating, { target: w.document.body });
  w.addEventListener('pagehide', () => {
    unmount(app);
    onClose();
  });
}

/** True when the window the bar is in can open an always-on-top window. */
export const canFloat = (host: Window) => !!api(host);
let win: Window | undefined;

/**
 * The pin. Must run straight from a click in `host` (the window the bar is in): browsers allow an always-on-top
 * window only then. The window that holds the bar steps aside until the always-on-top one is closed.
 */
export function openFloating(host: Window) {
  const pip = api(host);
  if (!pip || win) return;
  const box = host.document.querySelector('.float')?.getBoundingClientRect();
  pip
    // No controls in `host` to measure (the pin in the Reclux tab): room for the circle when it shows in there.
    .requestWindow({ width: Math.ceil(box?.width ?? 560), height: Math.ceil(box?.height ?? (session.cameraStream && (!session.pageAccess || !session.onPage) ? 360 : 150)) })
    .then((w) => {
      win = w;
      mountControls(w, () => {
        win = undefined;
        session.floating = false;
        void minimiseControls(false);
      });
      session.floating = true;
      void minimiseControls(true);
    })
    .catch(() => {}); // blocked: the controls stay where they are
}

export const closeFloating = () => win?.close();
