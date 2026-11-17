<script lang="ts">
  import Button from './Button.svelte';
  import { findPreset, fmtSize, fmtTime } from './presets';
  import { pause, resume, session, stop, toggleMute } from './session.svelte';

  const paused = $derived(session.phase === 'paused');
  const preset = $derived(findPreset(session.presetId));
</script>

<section class="bar" aria-label="Recording controls">
  <div class="top">
    <span class="status" role="status">
      <span class="dot" class:paused></span>{session.finishing ? `Finishing the file… ${Math.round(session.finishShare * 100)}%` : paused ? 'Paused' : 'Recording'}
    </span>
    <time class="timer" role="timer" aria-label="Elapsed time">{fmtTime(session.elapsed)}</time>
    <ul>
      <li>Asked: {preset.label}</li>
      {#if session.actual}<li>Browser reports: {session.actual}</li>{/if}
      <li title="The saved file always plays at this rate.">File: {preset.fps} fps locked</li>
      {#if session.fps !== null}
        <li title="How many frames each second show a new picture from your screen. The rest repeat the last picture. A still screen sends few, which is normal. Tab and Window send more than Entire screen.">
          {session.fps === 0 ? 'Screen is still' : `New pictures: ${session.fps}/s`}
        </li>
      {/if}
      {#if session.ducked !== null}
        <li class:on={session.ducked} title="While you speak, system sound in the recording drops to 48%. What you hear on your speakers stays the same, so listen to the saved file.">
          {session.ducked ? 'Voice heard · Music in file: 48%' : 'Music in file: 100%'}
        </li>
      {/if}
      {#if session.cpu !== null}<li title="How busy the processor is, on average.">CPU {session.cpu}%</li>{/if}
      <li>{fmtSize(session.bytes / 1e6)}</li>
      <li>{session.ext.toUpperCase()}</li>
    </ul>
  </div>
  <div class="actions">
    {#if paused}
      <Button icon="play" onclick={resume} disabled={session.finishing}>Resume</Button>
    {:else}
      <Button icon="pause" onclick={pause} disabled={session.finishing}>Pause</Button>
    {/if}
    <Button variant="primary" icon="stop" onclick={stop} disabled={session.finishing}>Stop</Button>
    <Button icon={session.muted ? 'mic-off' : 'mic'} onclick={toggleMute} disabled={session.finishing}>
      {session.muted ? 'Unmute' : 'Mute'}
    </Button>
  </div>
</section>

<style>
  .bar {
    display: grid;
    gap: var(--s-4);
    padding: var(--s-4);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-3) var(--s-5);
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    font-weight: 700;
    font-size: var(--t-sm);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--c-accent-text);
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--c-accent);
    animation: pulse 1.4s ease-in-out infinite;
  }
  .dot.paused {
    background: var(--c-text-muted);
    animation: none;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
  .timer {
    font: 700 var(--t-timer) / 1 var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    padding: 2px var(--s-3);
    border-radius: var(--r-pill);
    background: var(--c-surface-2);
    font-size: var(--t-xs);
    font-weight: 600;
    color: var(--c-text-muted);
  }
  li.on {
    background: var(--c-accent);
    color: var(--c-on-accent);
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--s-3);
  }
  .actions :global(button) {
    min-height: calc(var(--tap) + 8px);
  }
  /* Touch tablets: bigger, stacked icon + label */
  @media (pointer: coarse) {
    .actions :global(button) {
      flex-direction: column;
      gap: var(--s-1);
      min-height: 72px;
    }
  }
</style>
