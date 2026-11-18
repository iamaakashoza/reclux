// The small Reclux window (owner's call, 18 Nov 2026): "Start recording" opens the recorder as a small window in the
// middle of the screen instead of a tab. The browser's share picker shows over it, then the countdown, then the
// same window shrinks into the recording controls and, after Stop, grows into the editor.

/** "#start" tells the recorder page it was opened by Start recording, so it asks to share at once (no Record click). */
export const START = '#start';
// Chrome fits its share picker inside the window that asks, so the window starts big enough for the picker,
// then becomes the small countdown window once sharing is chosen.
const PICKER_SIZE = { width: 820, height: 640 };
const COUNTDOWN_SIZE = { width: 420, height: 420 };

// The screen this window is on (availLeft/Top are not in TypeScript's list, but every browser has them).
const area = () => {
  const s = screen as Screen & { availLeft?: number; availTop?: number };
  return { x: s.availLeft ?? 0, y: s.availTop ?? 0, w: s.availWidth, h: s.availHeight };
};
const centred = (w: number, h: number) => {
  const a = area();
  return { left: Math.round(a.x + (a.w - w) / 2), top: Math.round(a.y + (a.h - h) / 2) };
};

/** Opens the recorder in its small window. Works from the toolbar popup or any Reclux page. */
export const openRecorder = () =>
  browser.windows.create({
    url: browser.runtime.getURL(`/recorder.html${START}`),
    type: 'popup',
    ...PICKER_SIZE,
    ...centred(PICKER_SIZE.width, PICKER_SIZE.height),
  });

/**
 * Sizes this window (the recorder's own) around content of the given size. The browser's title bar and borders
 * differ per browser, so they are measured (outer − inner size) instead of guessed.
 * 'centre' = middle of the screen (picker, countdown), 'corner' = bottom-right (recording controls),
 * 'keep' = only the size changes (the user may have moved it).
 */
export async function fitWindow(width: number, height: number, where: 'centre' | 'corner' | 'keep') {
  const win = await browser.windows.getCurrent();
  // Minimised (Keep on top): its size cannot be measured then. Firefox even calls a minimised window "visible".
  if (win.state === 'minimized') return;
  // The frame from the browser's own window size: right after a resize, the page's outerWidth can still be the old one.
  // Never bigger than the screen, so the title bar stays reachable.
  const a = area();
  const w = Math.max(200, Math.min(a.w, Math.ceil(width + (win.width ?? outerWidth) - innerWidth)));
  const h = Math.max(100, Math.min(a.h, Math.ceil(height + (win.height ?? outerHeight) - innerHeight)));
  const pos = where === 'keep' ? {} : where === 'centre' ? centred(w, h) : { left: a.x + a.w - w - 16, top: a.y + a.h - h - 16 };
  if (win.id === undefined) return;
  try {
    // Chrome throws at once (not in the promise) on a size it does not accept.
    await browser.windows.update(win.id, { ...(where === 'keep' ? {} : { state: 'normal' as const }), width: w, height: h, ...pos });
  } catch {} // the window keeps its size: still usable
}

export const pickerSize = () => fitWindow(PICKER_SIZE.width, PICKER_SIZE.height, 'centre');
export const countdownSize = () => fitWindow(COUNTDOWN_SIZE.width, COUNTDOWN_SIZE.height, 'centre');

/** Big enough for the editor. */
export async function growWindow() {
  const win = await browser.windows.getCurrent();
  if (win.id !== undefined) await browser.windows.update(win.id, { state: 'maximized' }).catch(() => {});
}

/** Out of the way while the always-on-top controls are open, back when they close. */
export async function minimiseWindow(min: boolean) {
  const win = await browser.windows.getCurrent();
  if (win.id !== undefined) await browser.windows.update(win.id, min ? { state: 'minimized' } : { state: 'normal', focused: true }).catch(() => {});
}
