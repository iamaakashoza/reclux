// Shown on web pages while Reclux records: the webcam circle (draggable, can be hidden), cursor positions for
// cursor zoom, and a small control bar when no Reclux controls window is open (it was closed).
// Injected only while recording and only after the user allowed page access. Nothing is collected when idle.
import { OVERLAY_PORT, type OverlayMessage, type OverlayState } from '../lib/overlay-protocol';
import { iconSvg } from '../lib/icons';
import { fmtClock } from '../lib/presets';

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime', // never at install: the recorder injects it while recording
  main() {
    const w = window as unknown as { __reclux?: () => void };
    if (window.top !== window) return;
    const go = () => {
      if (!w.__reclux && document.documentElement) boot();
    };
    // Back/Forward can bring a page back from the browser's memory with its connection closed, without telling it:
    // remove the old overlay and connect again. (Not recording any more: the connection fails and it removes itself.)
    addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      w.__reclux?.();
      go();
    });
    // A page the browser loaded ahead (a search typed in the address bar) waits until it is really shown.
    if ((document as Document & { prerendering?: boolean }).prerendering) document.addEventListener('prerenderingchange', go, { once: true });
    else go();
  },
});

/** Runs as soon as the page starts loading (report §41), so the circle never waits for slow ads or images. */
function boot() {
  const w = window as unknown as { __reclux?: () => void };

  const port = browser.runtime.connect({ name: OVERLAY_PORT });
  const send = (m: OverlayMessage) => {
    try {
      port.postMessage(m);
    } catch {} // the recorder went away
  };

  // A closed shadow root, so the page's styles cannot change the overlay and the overlay cannot change the page.
  const host = document.createElement('reclux-overlay');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .cam { position: absolute; left: 0; top: 0; width: 180px; height: 180px; border-radius: 50%;
      border: 3px solid #f7f7f5; box-shadow: 0 8px 28px rgb(8 8 8 / 30%); pointer-events: auto;
      cursor: grab; touch-action: none; background: #080808; user-select: none; -webkit-user-select: none;
      will-change: transform; }
    .cam.drag { cursor: grabbing; }
    .cam iframe { position: relative; width: 100%; height: 100%; border: 0; border-radius: 50%; pointer-events: none; display: block; }
    .still { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; pointer-events: none; }
    .hide { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; border: 0; border-radius: 50%;
      background: rgb(8 8 8 / 75%); color: #f7f7f5; font-size: 16px; line-height: 28px; cursor: pointer; opacity: 0;
      transition: opacity 120ms; }
    .cam:hover .hide, .hide:focus-visible { opacity: 1; }
    .bar { --fg: #080808; --inv: #f7f7f5; --fill: rgb(8 8 8 / 6%); --ok: #0d6e37; --ok-bg: #e7f6ed;
      position: absolute; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px;
      border-radius: 999px; background: rgb(255 255 255 / 70%); color: var(--fg); border: 1px solid rgb(8 8 8 / 9%);
      box-shadow: 0 8px 32px rgb(8 8 8 / 14%); pointer-events: auto; font-size: 13px;
      font-weight: 600; backdrop-filter: blur(16px) saturate(120%); }
    @media (prefers-color-scheme: dark) {
      .bar { --fg: #f7f7f5; --inv: #080808; --fill: rgb(247 247 245 / 9%); --ok: #6ee69b; --ok-bg: rgb(34 197 94 / 16%);
        background: rgb(28 28 27 / 72%); border-color: rgb(247 247 245 / 12%); box-shadow: 0 8px 32px rgb(0 0 0 / 45%); }
    }
    .bar button { width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--fill); color: inherit;
      display: grid; place-items: center; cursor: pointer; }
    .bar button.stop { background: #f20b18; color: #f7f7f5; }
    .time { font: 700 16px ui-monospace, Consolas, monospace; font-variant-numeric: tabular-nums; }
    .status { color: var(--ok); background: var(--ok-bg); border-radius: 999px; padding: 2px 8px; }
    .status.paused { background: var(--fg); color: var(--inv); }
    button:focus-visible { outline: 3px solid var(--fg); outline-offset: 2px; }
    [hidden] { display: none !important; }
  </style>
  <div class="cam" hidden><img class="still" alt=""><iframe title="Your webcam" allow="camera"></iframe><button class="hide" aria-label="Hide webcam" title="Hide webcam">×</button></div>
  <div class="bar" role="toolbar" aria-label="Reclux recording controls" hidden>
    <span class="status"></span><span class="time">00:00:00</span>
    <button class="pause"></button>
    <button class="stop" aria-label="Stop and edit" title="Stop and edit">${iconSvg('stop', 18)}</button>
    <button class="camera" aria-label="Show or hide webcam" title="Webcam">${iconSvg('camera', 18)}</button>
  </div>`;
  document.documentElement.append(host);

  const cam = root.querySelector<HTMLDivElement>('.cam')!;
  const frame = cam.querySelector('iframe')!;
  const stillImg = cam.querySelector<HTMLImageElement>('.still')!;
  const bar = root.querySelector<HTMLDivElement>('.bar')!;
  const pauseBtn = bar.querySelector<HTMLButtonElement>('.pause')!;
  const PAUSE = iconSvg('pause', 18);
  const PLAY = iconSvg('play', 18);
  let state: OverlayState | undefined;

  // Circle centre in px. Moved with a transform, so dragging never makes the page lay itself out again.
  let at = { x: 0, y: 0 };
  const place = (x: number, y: number) => {
    // Keep the whole circle on screen, also after the window is resized.
    at = { x: Math.min(innerWidth - 92, Math.max(92, x)), y: Math.min(innerHeight - 92, Math.max(92, y)) };
    cam.style.transform = `translate(${at.x - 90}px, ${at.y - 90}px)`;
  };

  let still: Promise<unknown> = Promise.resolve();
  port.onMessage.addListener((s: OverlayState) => {
    state = s;
    // The webcam picture of a moment ago, under the live video until that starts (no empty flash on a new page).
    // The circle waits until that picture is ready to draw: Firefox decodes it a moment later, a black flash.
    if (s.still) {
      stillImg.src = s.still;
      still = stillImg.decode().catch(() => {});
    }
    void still.then(() => (cam.hidden = !state?.camera));
    // Load the circle's page the first time the circle is shown, then keep it: removing it on Hide webcam stalled
    // this page (and so the recording of it) for up to a second in Brave (report §45.4). Hidden, it gets no picture.
    if (s.camera && !frame.src) frame.src = browser.runtime.getURL('/bubble.html');
    if (!drag) place(s.pos.x * innerWidth, s.pos.y * innerHeight);
    bar.hidden = !s.bar;
    bar.querySelector<HTMLButtonElement>('.camera')!.hidden = !s.webcam;
    const paused = s.phase === 'paused';
    const status = bar.querySelector<HTMLSpanElement>('.status')!;
    status.textContent =
      s.phase === 'countdown' ? `Starting in ${s.count}` : s.phase === 'finishing' ? 'Finishing…' : paused ? 'Paused' : '● Recording';
    status.classList.toggle('paused', paused);
    bar.querySelector('.time')!.textContent = fmtClock(s.elapsed);
    pauseBtn.innerHTML = paused ? PLAY : PAUSE;
    pauseBtn.setAttribute('aria-label', paused ? 'Resume recording' : 'Pause recording');
    pauseBtn.disabled = s.phase !== 'recording' && s.phase !== 'paused';
  });
  // The recorder disconnects when recording ends (or its tab closes): clean up completely.
  // Tell the recorder whether this page is on screen: when no page is, the controls window shows the circle.
  const seen = () => send({ type: 'seen', on: document.visibilityState === 'visible' });
  seen();
  document.addEventListener('visibilitychange', seen);
  const end = () => {
    host.remove();
    removeEventListener('pointermove', onMove, true);
    document.removeEventListener('visibilitychange', seen);
    try {
      port.disconnect();
    } catch {} // already closed
    w.__reclux = undefined;
  };
  w.__reclux = end;
  port.onDisconnect.addListener(end);

  pauseBtn.onclick = () => send({ type: 'cmd', cmd: state?.phase === 'paused' ? 'resume' : 'pause' });
  bar.querySelector<HTMLButtonElement>('.stop')!.onclick = () => send({ type: 'cmd', cmd: 'stop' });
  bar.querySelector<HTMLButtonElement>('.camera')!.onclick = () => send({ type: 'cmd', cmd: 'camera' });
  root.querySelector<HTMLButtonElement>('.hide')!.onclick = (e) => {
    e.stopPropagation();
    send({ type: 'cmd', cmd: 'camera' });
  };

  // Drag the circle anywhere. Its position is shared with the other tabs.
  // The press must not do what a press on a page normally does (start selecting text): that selection was the
  // blue square, and it could steal the drag so the circle stuck (Issue 5c).
  let drag: { dx: number; dy: number } | undefined; // where the circle was grabbed, so it does not jump
  cam.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.hide')) return;
    e.preventDefault();
    drag = { dx: e.clientX - at.x, dy: e.clientY - at.y };
    cam.classList.add('drag');
    cam.setPointerCapture(e.pointerId);
  });
  cam.addEventListener('pointermove', (e) => {
    if (drag) place(e.clientX - drag.dx, e.clientY - drag.dy);
  });
  const endDrag = () => {
    if (!drag) return;
    drag = undefined;
    cam.classList.remove('drag');
    send({ type: 'pos', x: at.x / innerWidth, y: at.y / innerHeight });
  };
  cam.addEventListener('pointerup', endDrag);
  cam.addEventListener('pointercancel', endDrag);
  cam.addEventListener('lostpointercapture', endDrag);
  cam.addEventListener('dragstart', (e) => e.preventDefault());

  // Cursor positions for cursor zoom, about 20 a second, only from the window the user is working in.
  let last = 0;
  const onMove = (e: PointerEvent) => {
    if (state?.phase !== 'recording' || !document.hasFocus()) return;
    // Only the page itself: never while dragging the circle, or over the circle or the bar (owner's call).
    if (drag || e.composedPath().includes(host)) return;
    const now = performance.now();
    if (now - last < 50) return;
    last = now;
    send({
      type: 'cursor',
      vx: e.clientX / innerWidth, // inside the page: matches a recorded tab
      vy: e.clientY / innerHeight,
      sx: e.screenX / screen.width, // on the screen: matches a recorded screen
      sy: e.screenY / screen.height,
      wx: (e.screenX - screenX) / outerWidth, // inside the browser window: matches a recorded window
      wy: (e.screenY - screenY) / outerHeight,
    });
  };
  addEventListener('pointermove', onMove, { capture: true, passive: true });
}
