// Where Reclux opens (owner's call, 19 Nov 2026, report §41):
//  - Start recording opens Reclux as a TAB right next to the user's page, in the window they are working in, so the
//    browser's share box shows there (not in a new window). A picture of their page sits behind it, so it looks
//    see-through, and the countdown plays over that picture.
//  - While recording, the user's page comes back to the front and only a small controls window shows, bottom-right.
//  - After Stop, the Reclux tab comes to the front with the editor.

/** "#start<tab id>" tells the recorder page it was opened by Start recording, and which tab to go back to. */
export const START = '#start';
/** The picture of the user's page, handed from the toolbar popup to the Reclux tab (same origin, one key). */
export const BACKDROP = 'reclux.backdrop';

type Tab = { id?: number; index: number; windowId?: number };

/** Opens the recorder tab next to the given tab (the page the user is on). */
export const openRecorder = (from?: Tab) =>
  browser.tabs.create({
    url: browser.runtime.getURL(`/recorder.html${START}${from?.id ?? ''}`),
    active: true,
    ...(from ? { index: from.index + 1, windowId: from.windowId } : {}),
  });

/** The tab Start recording was pressed on, or undefined. */
export const startedFrom = (hash: string) => (hash.startsWith(START) ? Number(hash.slice(START.length)) || undefined : undefined);

/** Back to the user's page (if it still exists). */
export const showTab = (id: number | undefined) =>
  id === undefined ? Promise.resolve() : browser.tabs.update(id, { active: true }).then(() => {}, () => {});

/** Closes this Reclux tab (the user cancelled before recording began). */
export async function closeThisTab() {
  const me = await browser.tabs.getCurrent().catch(() => undefined);
  if (me?.id !== undefined) await browser.tabs.remove(me.id).catch(() => {});
}

// The screen this page is on (availLeft/Top are not in TypeScript's list, but every browser has them).
const area = (s: Screen) => {
  const a = s as Screen & { availLeft?: number; availTop?: number };
  return { x: a.availLeft ?? 0, y: a.availTop ?? 0, w: a.availWidth, h: a.availHeight };
};
const GAP = 16;

let controls: number | undefined;

/**
 * Opens the small controls window bottom-right and returns its page (a blank Reclux page the recorder fills with
 * the controls, so they share the live recording state). Opened without taking the focus from the user's page.
 */
export async function openControls(width: number, height: number): Promise<Window | undefined> {
  const a = area(screen);
  const opts = { url: browser.runtime.getURL('/controls.html'), type: 'popup' as const, width, height, left: a.x + a.w - width - GAP, top: a.y + a.h - height - GAP };
  // Not every browser accepts "focused: false"; then it opens focused, which is fine.
  const win = await browser.windows.create({ ...opts, focused: false }).catch(() => browser.windows.create(opts));
  controls = win?.id;
  rounded = '';
  for (let i = 0; i < 60 && controls !== undefined; i++) {
    const view = (browser.extension.getViews({ windowId: controls }) as unknown as Window[])[0];
    if (view?.document.readyState === 'complete') {
      await measureFrame(view);
      return view;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

// The browser's title bar and borders around the controls (they differ per browser). Measured ONCE, while the new
// window is still: right after a resize, the browser's size and the page's size lag each other (Opera, Brave), and
// measuring then gave windows 2 px tall or cutting off the bar (report §41). A window's frame never changes.
let frame = { w: 0, h: 0 };
async function measureFrame(view: Window) {
  let last = '';
  for (let i = 0; i < 20 && controls !== undefined; i++) {
    const win = await browser.windows.get(controls).catch(() => undefined);
    if (!win) return;
    const now = [(win.width ?? 0) - view.innerWidth, (win.height ?? 0) - view.innerHeight];
    if (now.join() === last) break; // the same twice in a row: settled
    last = now.join();
    frame = { w: Math.min(160, Math.max(0, now[0]!)), h: Math.min(160, Math.max(0, now[1]!)) };
    await new Promise((r) => setTimeout(r, 100));
  }
}

let fitting = false;
let again = false;
// The last size asked for that the browser rounded to another (screen scaling: Chrome made 574×349 into 576×350,
// then 576×351). Never ask for it again: each ask moved the window by the difference, so it crept across the
// screen, and each rounding fired a resize that asked again (Chrome, Opera, report §42).
let rounded = '';

/**
 * Sizes the controls window around `el` (the controls), keeping its bottom-right corner where it is.
 * Run whenever the controls or the window change size; it does nothing once they fit.
 */
export async function fitControls(view: Window, el: HTMLElement) {
  if (fitting) return void (again = true); // fit once more when this one is done
  fitting = true;
  try {
    for (let i = 0; i < 3 && controls !== undefined; i++) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const w = Math.ceil(r.width) + frame.w;
      const h = Math.ceil(r.height) + frame.h;
      const win = await browser.windows.get(controls).catch(() => undefined);
      if (!win || win.state === 'minimized') return; // set aside for the pin (always on top): leave it
      if (win.width === w && win.height === h) {
        // At the right size, yet a pixel short inside (screen scaling rounds the frame, Firefox at 125 %):
        // the frame is that much bigger, so try again with it.
        const [sw, sh] = [Math.ceil(r.width) - view.innerWidth, Math.ceil(r.height) - view.innerHeight];
        if ((sw <= 0 && sh <= 0) || sw > 4 || sh > 4) return; // fits (or as close as this browser allows)
        frame = { w: frame.w + Math.max(0, sw), h: frame.h + Math.max(0, sh) };
        continue;
      }
      if (rounded === `${w}x${h}`) return; // asked before: this is as close as the browser gets
      const right = (win.left ?? 0) + (win.width ?? w);
      const bottom = (win.top ?? 0) + (win.height ?? h);
      try {
        // Chrome throws at once (not in the promise) on a size it does not accept.
        await browser.windows.update(controls, { width: w, height: h, left: right - w, top: bottom - h });
      } catch {}
      await new Promise((done) => setTimeout(done, 150));
      const now = await browser.windows.get(controls).catch(() => undefined);
      if (!now) return;
      // Another size than asked (rounded, or the browser's own smallest window): as close as it gets, stop.
      if (now.width !== w || now.height !== h) return void (rounded = `${w}x${h}`);
    }
  } finally {
    fitting = false;
    if (again) {
      again = false;
      setTimeout(() => void fitControls(view, el), 300);
    }
  }
}

/** Out of the way while the always-on-top controls (pin) are open, back when they close. */
export const minimiseControls = (min: boolean) =>
  controls === undefined
    ? Promise.resolve()
    : browser.windows.update(controls, min ? { state: 'minimized' } : { state: 'normal' }).then(() => {}, () => {});

export function closeControls() {
  if (controls !== undefined) void browser.windows.remove(controls).catch(() => {});
  controls = undefined;
}
