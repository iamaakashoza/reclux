<script lang="ts">
  // Screen 2: the recording bar. One glass capsule: status, [pause · stop], timer, size and quality, mic.
  // Paused: the play icon shows and the status turns into a "Paused" warning light.
  import Icon from './Icon.svelte';
  import { findPreset, fmtClock, fmtSize } from './presets';
  import { pause, resume, session, stop, toggleMute } from './session.svelte';

  const paused = $derived(session.phase === 'paused');
  const p = $derived(findPreset(session.presetId));
</script>

<section class="bar glass" aria-label="Recording controls">
  <div class="top">
    <span class="status" class:paused role="status">
      {#if session.phase === 'countdown'}
        Starting in {session.count}…
      {:else if session.finishing}
        Finishing the file… {Math.round(session.finishShare * 100)}%
      {:else if paused}
        <Icon name="pause" size={14} /> Paused
      {:else}
        <span class="dot"></span> Recording
      {/if}
    </span>
    {#if session.ducked}<span class="duck" title="While you speak, system sound in the recording drops to 20%">Music 20%</span>{/if}
  </div>
  <div class="row">
    <button
      class="ctl"
      aria-label={paused ? 'Resume recording' : 'Pause recording'}
      title={paused ? 'Resume' : 'Pause'}
      onclick={paused ? resume : pause}
      disabled={session.finishing || session.phase === 'countdown'}
    >
      <Icon name={paused ? 'play' : 'pause'} size={22} />
    </button>
    <button class="ctl stop" aria-label="Stop and edit" title="Stop and edit" onclick={stop} disabled={session.finishing}>
      <Icon name="stop" size={20} />
    </button>
    <time class="timer" role="timer" aria-label="Recorded time">{fmtClock(session.elapsed)}</time>
    <span class="info">
      <span>{fmtSize(session.bytes / 1e6)}</span>
      <span>{p.height}p · {p.fps} fps</span>
    </span>
    {#if session.camera}<button
      class="ctl small"
      aria-label={session.camVisible ? 'Hide webcam' : 'Show webcam'}
      aria-pressed={!session.camVisible}
      title={session.camVisible ? 'Hide webcam' : 'Show webcam'}
      onclick={() => (session.camVisible = !session.camVisible)}
      disabled={session.finishing}
    >
      <Icon name="camera" size={18} />
    </button>{/if}
    {#if session.mic}<button
      class="ctl small"
      aria-label={session.muted ? 'Unmute microphone' : 'Mute microphone'}
      aria-pressed={session.muted}
      title={session.muted ? 'Unmute' : 'Mute'}
      onclick={toggleMute}
      disabled={session.finishing}
    >
      <Icon name={session.muted ? 'mic-off' : 'mic'} size={18} />
    </button>{/if}
  </div>
</section>

<style>
  .bar {
    display: grid;
    gap: var(--s-2);
    width: fit-content;
    max-width: 100%;
    padding: var(--s-3) var(--s-4) var(--s-3) var(--s-3);
    border-radius: var(--r-xl);
  }
  .top {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding-left: var(--s-1);
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    padding: 2px var(--s-3);
    border-radius: var(--r-pill);
    font-size: var(--t-xs);
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--c-accent-text);
    background: color-mix(in srgb, var(--c-accent) 14%, transparent);
  }
  .status.paused {
    color: var(--c-paused-text);
    background: var(--c-paused-bg);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-accent);
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
  .duck {
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }
  .ctl {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    flex: none;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--fill);
    cursor: pointer;
    transition: background var(--ease), transform var(--ease);
  }
  .ctl:hover:not(:disabled) {
    background: var(--fill-hover);
  }
  .ctl:active:not(:disabled) {
    transform: scale(0.94);
  }
  .ctl:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .ctl.stop {
    background: var(--c-accent);
    color: var(--c-on-accent);
  }
  .ctl.stop:hover:not(:disabled) {
    background: var(--c-accent-hover);
  }
  .ctl.small {
    width: var(--tap);
    height: var(--tap);
    margin-left: var(--s-1);
  }
  .ctl[aria-pressed='true'] {
    color: var(--c-accent-text);
  }
  .timer {
    padding: 0 var(--s-3) 0 var(--s-2);
    font: 700 var(--t-xl) / 1 var(--font-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .info {
    display: grid;
    padding-left: var(--s-3);
    border-left: 1px solid var(--glass-border);
    font-size: var(--t-xs);
    font-weight: 600;
    line-height: 1.4;
    color: var(--c-text-muted);
    white-space: nowrap;
  }
  .info span:first-child {
    color: var(--c-text);
  }
  @media (forced-colors: active) {
    .ctl {
      border: 1px solid ButtonText;
    }
  }
</style>
