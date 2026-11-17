<script lang="ts">
  // Screen 3 timeline: a ruler, the kept parts of the video, the zoom lane, and a playhead. Click or drag anywhere
  // to move the playhead; arrow keys move it by 1 s (Shift: 5 s). Zoom stretches the timeline; it scrolls sideways
  // when wider than the view. All times here are times of the edited video.
  import { fmtTime } from './presets';

  type Piece = { i: number; k: number; at: number; len: number; scale: number; first: boolean; last: boolean };
  let {
    duration,
    current,
    zoom,
    label,
    parts,
    active,
    zooms = [],
    picked = -1,
    onseek,
    onpick,
    ongrab,
    onedge,
  }: {
    duration: number;
    current: number;
    zoom: number;
    label: string;
    parts: { at: number; len: number }[];
    active: number; // the part under the playhead (Split, Trim and Delete act on it)
    zooms?: Piece[];
    picked?: number; // the selected zoom
    onseek: (t: number) => void;
    onpick: (i: number) => void;
    ongrab: () => void; // a zoom edge drag begins (one Undo step)
    onedge: (i: number, side: 'start' | 'end', t: number) => void;
  } = $props();

  let view: HTMLDivElement | undefined = $state();
  let viewWidth = $state(800);
  const PAD = 16; // room so the playhead handle is not cut off at 0 and at the end
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
  // Dragging a zoom's edge changes when it starts or ends. Followed on the window: the handle itself can move
  // to another piece of the block while dragging across a cut.
  const grab = (e: PointerEvent, i: number, side: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    ongrab();
    const move = (m: PointerEvent) => onedge(i, side, timeAt(m.clientX));
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };
  const key = (e: KeyboardEvent) => {
    const by = e.shiftKey ? 5 : 1;
    const to = { ArrowLeft: current - by, ArrowRight: current + by, Home: 0, End: duration }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    onseek(Math.min(duration, Math.max(0, to)));
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
        <span class="tick" class:major style:left="{x(t)}px">
          {#if major}<b>{step < 1 ? `${fmtTime(Math.floor(t))}.${Math.round((t % 1) * 10)}` : fmtTime(Math.round(t))}</b>{/if}
        </span>
      {/each}
    </div>
    {#each parts as p, i (i)}
      <div class="clip" class:active={i === active && parts.length > 1} style:left="{x(p.at)}px" style:width="{Math.max(2, p.len * pxPerSec - 2)}px" aria-hidden="true">
        <span>{i === 0 ? label : `Part ${i + 1}`}</span>
      </div>
    {/each}
    {#each zooms as z (`${z.i}-${z.k}`)}
      <button
        type="button"
        class="zoom"
        class:picked={z.i === picked}
        style:left="{x(z.at)}px"
        style:width="{z.len * pxPerSec}px"
        aria-label="Zoom {z.i + 1}, {z.scale}×, at {fmtTime(Math.floor(z.at))}"
        aria-pressed={z.i === picked}
        onpointerdown={(e) => e.stopPropagation()}
        onclick={() => onpick(z.i)}
      >
        <span>Zoom {z.scale}×</span>
        {#if z.i === picked}
          {#if z.first}<i class="edge start" onpointerdown={(e) => grab(e, z.i, 'start')} aria-hidden="true"></i>{/if}
          {#if z.last}<i class="edge end" onpointerdown={(e) => grab(e, z.i, 'end')} aria-hidden="true"></i>{/if}
        {/if}
      </button>
    {/each}
    <div class="playhead" style:left="{x(current)}px" aria-hidden="true"></div>
  </div>
</div>

<style>
  .timeline {
    position: relative;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: var(--s-2);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
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
  /* Cursor zoom blocks: a lane under the clip. */
  .zoom {
    position: absolute;
    top: 106px;
    height: 24px;
    display: flex;
    align-items: center;
    padding: 0 var(--s-2);
    border-radius: var(--r-pill);
    background: color-mix(in srgb, var(--c-focus) 28%, var(--c-surface));
    border: 1px solid color-mix(in srgb, var(--c-focus) 70%, transparent);
    color: var(--c-text);
    font: 700 11px var(--font);
    overflow: clip;
    white-space: nowrap;
    cursor: pointer;
  }
  .zoom.picked {
    overflow: visible;
    background: color-mix(in srgb, var(--c-focus) 55%, var(--c-surface));
    border-color: var(--c-focus);
    z-index: 1;
  }
  /* Drag handles on the selected zoom's ends. */
  .edge {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 10px;
    border-radius: var(--r-pill);
    background: var(--c-focus);
    cursor: ew-resize;
    touch-action: none;
  }
  .edge.start {
    left: -5px;
  }
  .edge.end {
    right: -5px;
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
    background: linear-gradient(180deg, color-mix(in srgb, var(--c-lux) 38%, var(--c-surface)), color-mix(in srgb, var(--c-lux) 24%, var(--c-surface)));
    border: 1px solid color-mix(in srgb, var(--c-lux) 60%, transparent);
    font-size: var(--t-xs);
    font-weight: 600;
    overflow: clip; /* clip, not hidden: hidden would stop the name below from sticking in view */
    white-space: nowrap;
  }
  /* The part Split, Trim and Delete act on. */
  .clip.active {
    border: 2px solid var(--c-lux);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-lux) 35%, transparent);
  }
  .clip span {
    position: sticky;
    left: var(--s-3);
  }
  .playhead {
    position: absolute;
    top: 4px;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--c-accent);
    pointer-events: none;
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
  .timeline:focus-visible {
    outline-offset: -3px;
  }
</style>
