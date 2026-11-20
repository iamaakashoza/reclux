<script lang="ts">
  // Screen 3 timeline: a ruler, the kept parts of the video, the cursor-zoom lane, and a playhead. Click or drag
  // anywhere to move the playhead; arrow keys move it by 1 s (Shift: 5 s). The − Zoom + buttons stretch the timeline
  // for exact cuts; it scrolls sideways when wider than the view. All times here are times of the edited video.
  // Trim (owner's call, 19 Nov 2026): arrows on both ends of the selected part. Drag the left one to cut the
  // beginning, the right one to cut the end. The cut-away part is greyed while dragging; it goes on release.
  import { fmtTime } from './presets';

  type Piece = { i: number; k: number; at: number; len: number; scale: number };
  let {
    duration,
    current,
    zoom,
    label,
    parts,
    active,
    zooms = [],
    picked = -1,
    trimming = false,
    onseek,
    onpick,
    ontrim,
  }: {
    duration: number;
    current: number;
    zoom: number;
    label: string;
    parts: { at: number; len: number }[];
    active: number; // the selected part (under the playhead): Split, Trim and Delete act on it
    zooms?: Piece[];
    picked?: number; // the selected zoom
    trimming?: boolean; // show the trim arrows on the selected part
    onseek: (t: number) => void;
    onpick: (i: number) => void;
    ontrim: (side: 'in' | 'out', t: number) => void; // cut the part's start up to t, or its end from t
  } = $props();

  let view: HTMLDivElement | undefined = $state();
  let viewWidth = $state(800);
  const PAD = 16; // room so the playhead and trim arrows are not cut off at 0 and at the end
  const MIN = 0.1; // shortest part a trim may leave (as in edit.ts)
  const width = $derived(Math.max(viewWidth - 2 * PAD, 1) * zoom);
  const pxPerSec = $derived(duration > 0 ? width / duration : 0);
  const x = (t: number) => PAD + t * pxPerSec;

  // Labels at least ~90 px apart, on a "nice" step.
  const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const step = $derived(STEPS.find((s) => s * pxPerSec >= 90) ?? 3600);
  const ticks = $derived(
    pxPerSec ? Array.from({ length: Math.floor(duration / (step / 5)) + 1 }, (_, i) => i * (step / 5)) : [],
  );

  const timeAt = (clientX: number) => {
    const r = view!.getBoundingClientRect();
    return Math.min(duration, Math.max(0, (clientX - r.left + view!.scrollLeft - PAD) / pxPerSec));
  };
  const down = (e: PointerEvent) => {
    if (!pxPerSec) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onseek(timeAt(e.clientX));
  };
  const move = (e: PointerEvent) => {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) onseek(timeAt(e.clientX));
  };
  const key = (e: KeyboardEvent) => {
    const by = e.shiftKey ? 5 : 1;
    const to = { ArrowLeft: current - by, ArrowRight: current + by, Home: 0, End: duration }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    onseek(Math.min(duration, Math.max(0, to)));
  };

  // Trim arrows. While dragging, the layout stays put (the part is held: at its end the playhead would select the
  // next part) and the video shows the frame at the arrow.
  const selected = $derived(parts[active]);
  let drag = $state<{ side: 'in' | 'out'; t: number; p: { at: number; len: number } } | null>(null);
  const part = $derived(drag?.p ?? selected);
  const lo = $derived(drag?.side === 'in' ? drag.t : (part?.at ?? 0));
  const hi = $derived(drag?.side === 'out' ? drag.t : (part ? part.at + part.len : 0));
  const clampTo = (side: 'in' | 'out', t: number) =>
    side === 'in' ? Math.min(part!.at + part!.len - MIN, Math.max(part!.at, t)) : Math.max(part!.at + MIN, Math.min(part!.at + part!.len, t));
  const grab = (e: PointerEvent, side: 'in' | 'out') => {
    if (!part || !pxPerSec) return;
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const p = part;
    drag = { side, t: side === 'in' ? p.at : p.at + p.len, p };
    const follow = (m: PointerEvent) => {
      drag = { side, t: clampTo(side, timeAt(m.clientX)), p };
      onseek(Math.min(drag.t, p.at + p.len - 0.05)); // not the very end: that is the next part's first frame
    };
    const done = () => {
      el.removeEventListener('pointermove', follow);
      el.removeEventListener('pointerup', done);
      el.removeEventListener('pointercancel', done);
      const d = drag;
      drag = null;
      if (d) ontrim(side, d.t);
    };
    el.addEventListener('pointermove', follow);
    el.addEventListener('pointerup', done);
    el.addEventListener('pointercancel', done);
  };
  // Keyboard: the left arrow's → cuts 1 s more from the start, the right arrow's ← 1 s more from the end (Shift: 5 s).
  const nudge = (e: KeyboardEvent, side: 'in' | 'out') => {
    if (!part) return;
    const by = e.shiftKey ? 5 : 1;
    if (side === 'in' && e.key === 'ArrowRight') ontrim('in', clampTo('in', part.at + by));
    else if (side === 'out' && e.key === 'ArrowLeft') ontrim('out', clampTo('out', part.at + part.len - by));
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  // Keep the playhead in view while playing or zoomed.
  $effect(() => {
    if (!view) return;
    const px = x(current);
    if (px < view.scrollLeft + PAD || px > view.scrollLeft + view.clientWidth - PAD) {
      view.scrollLeft = px - view.clientWidth / 3;
    }
  });
</script>

<div
  class="timeline"
  bind:this={view}
  bind:clientWidth={viewWidth}
  role="slider"
  tabindex="0"
  aria-label="Playhead"
  aria-valuemin={0}
  aria-valuemax={Math.round(duration)}
  aria-valuenow={Math.round(current)}
  aria-valuetext="{fmtTime(Math.round(current))} of {fmtTime(Math.round(duration))}"
  onpointerdown={down}
  onpointermove={move}
  onkeydown={key}
>
  <div class="inner" class:lanes={zooms.length > 0} style:width="{width + 2 * PAD}px">
    <div class="ruler" aria-hidden="true">
      {#each ticks as t (t)}
        {@const major = Math.abs(t / step - Math.round(t / step)) < 1e-6}
        <span class="tick" class:major class:first={t === 0} style:left="{x(t)}px">
          {#if major}<b>{step < 1 ? `${fmtTime(Math.floor(t))}.${Math.round((t % 1) * 10)}` : fmtTime(Math.round(t))}</b>{/if}
        </span>
      {/each}
    </div>
    {#each parts as p, i (i)}
      <div class="clip" class:active={i === active && (parts.length > 1 || trimming)} class:trim={trimming && i === active} style:left="{x(p.at)}px" style:width="{Math.max(2, p.len * pxPerSec - 2)}px" aria-hidden="true">
        <span>{i === 0 ? label : `Part ${i + 1}`}</span>
      </div>
    {/each}
    {#if trimming && part}
      <!-- What the trim cuts away, greyed while dragging. -->
      <div class="away" style:left="{x(part.at)}px" style:width="{(lo - part.at) * pxPerSec}px" aria-hidden="true"></div>
      <div class="away" style:left="{x(hi)}px" style:width="{(part.at + part.len - hi) * pxPerSec}px" aria-hidden="true"></div>
      <button
        type="button"
        class="arrow in"
        style:left="{x(lo)}px"
        aria-label="Trim start: drag right to cut the beginning (or press the right arrow key)"
        title="Drag to cut the beginning"
        onpointerdown={(e) => grab(e, 'in')}
        onkeydown={(e) => nudge(e, 'in')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <button
        type="button"
        class="arrow out"
        style:left="{x(hi)}px"
        aria-label="Trim end: drag left to cut the end (or press the left arrow key)"
        title="Drag to cut the end"
        onpointerdown={(e) => grab(e, 'out')}
        onkeydown={(e) => nudge(e, 'out')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    {/if}
    {#each zooms as z (`${z.i}-${z.k}`)}
      <button
        type="button"
        class="zoom"
        class:picked={z.i === picked}
        style:left="{x(z.at)}px"
        style:width="{z.len * pxPerSec}px"
        aria-label="Cursor zoom {z.i + 1}, {z.scale}×, at {fmtTime(Math.floor(z.at))}. Select it to delete it."
        aria-pressed={z.i === picked}
        onpointerdown={(e) => e.stopPropagation()}
        onclick={() => onpick(z.i)}
      >
        <span>Zoom {z.scale}×</span>
      </button>
    {/each}
    <div class="playhead" style:left="{x(current)}px" aria-hidden="true"></div>
  </div>
</div>

<style>
  /* Full width, flat: no card around it (owner's call). */
  .timeline {
    position: relative;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: var(--s-2);
    background: var(--c-surface);
    border-top: 1px solid var(--c-border);
    cursor: pointer;
    touch-action: pan-y;
    user-select: none;
  }
  .inner {
    position: relative;
    height: 112px;
  }
  .inner.lanes {
    height: 140px;
  }
  .ruler {
    position: absolute;
    inset: 0 0 auto;
    height: 34px;
    border-bottom: 1px solid var(--c-border);
  }
  .tick {
    position: absolute;
    bottom: 0;
    width: 1px;
    height: 6px;
    background: var(--c-text-muted);
    opacity: 0.5;
  }
  .tick.major {
    height: 12px;
    opacity: 1;
  }
  .tick b {
    position: absolute;
    bottom: 14px;
    left: 0;
    transform: translateX(-50%);
    font: 600 var(--t-xs) / 1 var(--font-mono);
    color: var(--c-text-muted);
    white-space: nowrap;
  }
  .clip {
    position: absolute;
    top: 46px;
    height: 52px;
    display: flex;
    align-items: center;
    padding: 0 var(--s-3);
    border-radius: var(--r-sm);
    /* Ink on the page colour: black parts in light mode, off-white parts in dark mode. */
    background: color-mix(in srgb, var(--c-text) 85%, transparent);
    color: var(--c-bg);
    font-size: var(--t-xs);
    font-weight: 600;
    overflow: clip; /* clip, not hidden: hidden would stop the name below from sticking in view */
    white-space: nowrap;
  }
  /* The selected part (Split, Trim and Delete act on it). */
  .clip.active {
    box-shadow: 0 0 0 2px var(--c-accent);
  }
  .clip span {
    position: sticky;
    left: var(--s-3);
  }
  /* Trimming: the name starts after the arrow, so the arrow never covers it. */
  .clip.trim {
    padding-left: calc(22px + var(--s-2));
  }
  .clip.trim span {
    left: calc(22px + var(--s-2));
  }
  /* Trim: the part being cut away, and the two arrows. */
  .away {
    position: absolute;
    top: 46px;
    height: 52px;
    background: repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--c-bg) 80%, transparent) 0 6px,
      color-mix(in srgb, var(--c-bg) 55%, transparent) 6px 12px
    );
    pointer-events: none;
  }
  .arrow {
    position: absolute;
    top: 40px;
    width: 22px;
    height: 64px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--r-sm);
    background: var(--c-accent);
    color: var(--c-on-accent);
    box-shadow: 0 2px 8px rgb(242 11 24 / 35%);
    cursor: ew-resize;
    touch-action: none;
    z-index: 2;
  }
  /* Inside the part's ends, so they never stick out past the timeline. */
  .arrow.out {
    transform: translateX(-100%);
  }
  .arrow svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  /* Cursor zoom blocks: a lane under the clip. Select one, then Delete removes it. */
  .zoom {
    position: absolute;
    top: 106px;
    height: 24px;
    display: flex;
    align-items: center;
    padding: 0 var(--s-2);
    border-radius: var(--r-pill);
    background: var(--c-surface-2);
    border: 1px solid var(--c-border);
    color: var(--c-text);
    font: 700 11px var(--font);
    overflow: clip;
    white-space: nowrap;
    cursor: pointer;
  }
  .zoom.picked {
    background: var(--c-text);
    border-color: var(--c-text);
    color: var(--c-bg);
    z-index: 1;
  }
  .playhead {
    position: absolute;
    top: 4px;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--c-accent);
    pointer-events: none;
    z-index: 3;
  }
  .playhead::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 12px;
    height: 12px;
    border-radius: 3px 3px 50% 50%;
    background: var(--c-accent);
    transform: translateX(-50%);
  }
  /* 00:00 starts right of its tick: centred it was cut off at the edge and hidden by the playhead. */
  .tick.first b {
    transform: translateX(6px);
  }
  .timeline:focus-visible {
    outline-offset: -3px;
  }
</style>
