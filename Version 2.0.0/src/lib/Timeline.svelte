<script lang="ts">
  // Screen 3 timeline: a ruler, the clip, and a playhead. Click or drag anywhere to move the playhead;
  // arrow keys move it by 1 s (Shift: 5 s). Zoom stretches the timeline; it scrolls sideways when wider than the view.
  import { fmtTime } from './presets';

  let {
    duration,
    current,
    zoom,
    label,
    onseek,
  }: { duration: number; current: number; zoom: number; label: string; onseek: (t: number) => void } = $props();

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
  <div class="inner" style:width="{width + 2 * PAD}px">
    <div class="ruler" aria-hidden="true">
      {#each ticks as t (t)}
        {@const major = Math.abs(t / step - Math.round(t / step)) < 1e-6}
        <span class="tick" class:major style:left="{x(t)}px">
          {#if major}<b>{step < 1 ? `${fmtTime(Math.floor(t))}.${Math.round((t % 1) * 10)}` : fmtTime(Math.round(t))}</b>{/if}
        </span>
      {/each}
    </div>
    <div class="clip" style:left="{x(0)}px" style:width="{width}px" aria-hidden="true">
      <span>{label}</span>
    </div>
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
