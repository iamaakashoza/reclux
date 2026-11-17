// Shown on web pages while Reclux records: the webcam circle (draggable, can be hidden), cursor positions for
// cursor zoom, and, where there is no floating window (Firefox), a small control bar.
// Injected only while recording and only after the user allowed page access. Nothing is collected when idle.
import { OVERLAY_PORT, type OverlayMessage, type OverlayState } from '../lib/overlay-protocol';
import { fmtClock } from '../lib/presets';

export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime', // never at install: the recorder injects it while recording
  main() {
    const w = window as unknown as { __reclux?: boolean };
    if (w.__reclux || window.top !== window) return;
    w.__reclux = true;

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
      .cam { position: absolute; width: 180px; height: 180px; margin: -90px 0 0 -90px; border-radius: 50%;
        border: 3px solid rgb(255 255 255 / 85%); box-shadow: 0 8px 28px rgb(0 0 0 / 35%); pointer-events: auto;
        cursor: grab; touch-action: none; background: #0e1116; }
      .cam.drag { cursor: grabbing; }
      .cam iframe { width: 100%; height: 100%; border: 0; border-radius: 50%; pointer-events: none; display: block; }
      .hide { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; border: 0; border-radius: 50%;
        background: rgb(14 17 22 / 75%); color: #fff; font-size: 16px; line-height: 28px; cursor: pointer; opacity: 0;
        transition: opacity 120ms; }
      .cam:hover .hide, .hide:focus-visible { opacity: 1; }
      .bar { position: absolute; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px;
        border-radius: 999px; background: rgb(22 26 33 / 94%); color: #eef0f4; border: 1px solid rgb(255 255 255 / 12%);
        box-shadow: 0 10px 30px rgb(0 0 0 / 40%); pointer-events: auto; font-size: 13px; font-weight: 600; }
      .bar button { width: 36px; height: 36px; border: 0; border-radius: 50%; background: rgb(255 255 255 / 10%); color: inherit;
        display: grid; place-items: center; cursor: pointer; }
      .bar button.stop { background: #d7263d; color: #fff; }
      .bar svg { width: 18px; height: 18px; fill: currentColor; }
      .time { font: 700 16px ui-monospace, Consolas, monospace; font-variant-numeric: tabular-nums; }
      .status.paused { background: #ffd77a; color: #3d2a00; border-radius: 999px; padding: 2px 8px; }
      button:focus-visible { outline: 3px solid #7fd3e6; outline-offset: 2px; }
      [hidden] { display: none !important; }
    </style>
    <div class="cam" hidden><iframe title="Your webcam" allow="camera"></iframe><button class="hide" aria-label="Hide webcam" title="Hide webcam">×</button></div>
    <div class="bar" role="toolbar" aria-label="Reclux recording controls" hidden>
      <span class="status"></span><span class="time">00:00:00</span>
      <button class="pause"></button>
      <button class="stop" aria-label="Stop and edit" title="Stop and edit"><svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
      <button class="camera" aria-label="Show or hide webcam" title="Webcam"><svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM17 10l4-3v10l-4-3z"/></svg></button>
    </div>`;
    document.documentElement.append(host);

    const cam = root.querySelector<HTMLDivElement>('.cam')!;
    const frame = cam.querySelector('iframe')!;
    const bar = root.querySelector<HTMLDivElement>('.bar')!;
    const pauseBtn = bar.querySelector<HTMLButtonElement>('.pause')!;
    const PAUSE = '<svg viewBox="0 0 24 24"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>';
    const PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
    let state: OverlayState | undefined;

    const place = (x: number, y: number) => {
      // Keep the whole circle on screen, also after the window is resized.
      cam.style.left = `${Math.min(innerWidth - 92, Math.max(92, x * innerWidth))}px`;
      cam.style.top = `${Math.min(innerHeight - 92, Math.max(92, y * innerHeight))}px`;
    };

    port.onMessage.addListener((s: OverlayState) => {
      state = s;
      cam.hidden = !s.camera;
      // Only load the camera page when it is shown, so the camera light is off while hidden.
      if (s.camera && !frame.src) frame.src = browser.runtime.getURL('/bubble.html');
      if (!s.camera && frame.src) frame.removeAttribute('src');
      if (!dragging) place(s.pos.x, s.pos.y);
      bar.hidden = !s.bar;
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
    port.onDisconnect.addListener(() => {
      host.remove();
      removeEventListener('pointermove', onMove, true);
      w.__reclux = false;
    });

    pauseBtn.onclick = () => send({ type: 'cmd', cmd: state?.phase === 'paused' ? 'resume' : 'pause' });
    bar.querySelector<HTMLButtonElement>('.stop')!.onclick = () => send({ type: 'cmd', cmd: 'stop' });
    bar.querySelector<HTMLButtonElement>('.camera')!.onclick = () => send({ type: 'cmd', cmd: 'camera' });
    root.querySelector<HTMLButtonElement>('.hide')!.onclick = (e) => {
      e.stopPropagation();
      send({ type: 'cmd', cmd: 'camera' });
    };

    // Drag the circle anywhere. Its position is shared with the other tabs.
    let dragging = false;
    cam.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.hide')) return;
      dragging = true;
      cam.classList.add('drag');
      cam.setPointerCapture(e.pointerId);
    });
    cam.addEventListener('pointermove', (e) => {
      if (dragging) place(e.clientX / innerWidth, e.clientY / innerHeight);
    });
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      cam.classList.remove('drag');
      send({ type: 'pos', x: e.clientX / innerWidth, y: e.clientY / innerHeight });
    };
    cam.addEventListener('pointerup', endDrag);
    cam.addEventListener('pointercancel', endDrag);

    // Cursor positions for cursor zoom, about 20 a second, only from the window the user is working in.
    let last = 0;
    const onMove = (e: PointerEvent) => {
      if (state?.phase !== 'recording' || !document.hasFocus()) return;
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
  },
});
