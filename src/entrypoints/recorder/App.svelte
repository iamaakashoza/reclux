<script lang="ts">
  import Banner from '../../lib/Banner.svelte';
  import Button from '../../lib/Button.svelte';
  import ControlBar from '../../lib/ControlBar.svelte';
  import Finished from '../../lib/Finished.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Library from '../../lib/Library.svelte';
  import SetupPanel from '../../lib/SetupPanel.svelte';
  import { MAX_SECONDS, WARN_SECONDS, findPreset } from '../../lib/presets';
  import { LOW_FREE } from '../../lib/disk';
  import { onMount, tick } from 'svelte';
  import { fmtSize } from '../../lib/presets';
  import {
    discardRecoverable,
    keepAsIs,
    lowerFps,
    previewElapsed,
    recover,
    refreshRecoverable,
    reset,
    session,
    setPhase,
    start,
    type Phase,
  } from '../../lib/session.svelte';

  // A crash or closed tab can leave a recording behind. Offer to get it back.
  onMount(refreshRecoverable);

  const PHASES: { id: Phase; label: string }[] = [
    { id: 'idle', label: 'Setup' },
    { id: 'countdown', label: 'Countdown' },
    { id: 'recording', label: 'Recording' },
    { id: 'paused', label: 'Paused' },
    { id: 'finished', label: 'Finished' },
  ];

  const live = $derived(session.phase === 'recording' || session.phase === 'paused');
  const locked = $derived(session.phase !== 'idle');
  const showLibrary = $derived(session.phase === 'idle' || session.phase === 'finished');

  // When the screen changes, move keyboard focus to its first button, so it is not lost when the old one disappears.
  const focusStage = () => {
    const b = document.querySelector<HTMLElement>('.stage button:not([disabled])');
    if (!b) return;
    b.dataset.ring = '';
    b.addEventListener('blur', () => delete b.dataset.ring, { once: true });
    b.focus();
  };
  let lastPhase = session.phase;
  $effect(() => {
    const now = session.phase;
    if (now === lastPhase) return;
    lastPhase = now;
    if (now === 'idle') return;
    void tick().then(focusStage);
    // The screen-share window can still hold focus at this moment. If so, try again when this window gets it back.
    addEventListener('focus', () => document.activeElement === document.body && focusStage(), { once: true });
  });

  // Closing this tab would lose a live or unsaved recording, so the browser asks first.
  $effect(() => {
    const guard = live || (session.phase === 'finished' && !!session.url && !session.saved);
    if (!guard) return;
    const ask = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', ask);
    return () => window.removeEventListener('beforeunload', ask);
  });

  // ponytail: design-preview bar and the sample library are for design review only. Open recorder.html#preview to see them; delete before release.
  const showPreview = location.hash.includes('preview');
  let theme = $state('system');
  $effect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  });

  // Open a screen directly, e.g. recorder.html#recording,dark,lowdisk
  for (const t of location.hash.slice(1).split(',')) {
    if (PHASES.some((p) => p.id === t)) setPhase(t as Phase);
    else if (t === 'dark' || t === 'light') theme = t;
    else if (t === 'lowdisk') session.lowDisk = true;
    else if (t === 'slow') session.struggling = true;
  }

  const wantFps = $derived(findPreset(session.presetId).fps);
</script>

<div class="app">
  <header>
    <h1 class="brand"><span class="logo"></span> Reclux</h1>
    <span class="right">
      <a class="guide" href="/welcome.html">Setup guide</a>
      <span class="offline"><Icon name="shield" size={16} /> Works offline</span>
    </span>
  </header>

  {#if showPreview}
  <aside class="preview" aria-label="Design preview controls">
    <strong>Design preview</strong>
    <div class="chips" role="group" aria-label="Jump to screen">
      {#each PHASES as p (p.id)}
        <button class:on={session.phase === p.id} onclick={() => setPhase(p.id)}>{p.label}</button>
      {/each}
    </div>
    <label><input type="checkbox" bind:checked={session.lowDisk} /> Low disk</label>
    <label><input type="checkbox" bind:checked={session.struggling} /> Slow computer</label>
    <button onclick={() => previewElapsed(WARN_SECONDS)}>Jump to 1h45</button>
    <button onclick={() => previewElapsed(MAX_SECONDS)}>Jump to 2h00</button>
    <label>
      Theme
      <select bind:value={theme}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  </aside>
  {/if}

  <main class="layout">
    <section class="setup" class:locked inert={locked} aria-label="Recording setup">
      <SetupPanel onstart={start} />
    </section>

    <section class="stage" aria-label="Recorder">
      {#if session.error}
        <Banner kind="error" title="Something went wrong">
          {session.error}
          {#snippet actions()}
            <Button onclick={() => (session.error = '')}>Dismiss</Button>
          {/snippet}
        </Banner>
      {/if}
      {#each session.notices as n (n)}
        <Banner kind="info" title="Heads up">{n}</Banner>
      {/each}
      {#if session.phase === 'idle'}
        {#each session.recoverable as item (item.name)}
          <Banner kind="warn" title="Found a recording that was never saved">
            From {new Date(item.modified).toLocaleString()} · {fmtSize(item.size / 1e6)}. It may have been cut short by
            a crash or a closed tab.
            {#snippet actions()}
              <Button onclick={() => recover(item)}>Recover it</Button>
              <Button variant="ghost" onclick={() => discardRecoverable(item)}>Delete</Button>
            {/snippet}
          </Banner>
        {/each}
      {/if}

      {#if session.phase === 'idle'}
        <div class="empty">
          <Icon name="screen" size={48} />
          <h2>Ready when you are</h2>
          <p>Choose what to record, then press Start.</p>
        </div>
      {:else if session.phase === 'countdown'}
        <div class="empty">
          <div class="count" role="status" aria-live="assertive">{session.count}</div>
          <p>Starting in…</p>
          <Button variant="ghost" onclick={reset}>Cancel</Button>
        </div>
      {:else if live}
        <div class="live" class:paused={session.phase === 'paused'}>
          <Icon name={session.phase === 'paused' ? 'pause' : 'screen'} size={40} />
          <p>{session.phase === 'paused' ? 'Paused. Nothing is being recorded.' : 'Recording your screen'}</p>
        </div>

        {#if session.struggling}
          <Banner kind="warn" title="Your computer is struggling">
            {#if session.fps !== null}
              Only about {session.fps} frames per second are arriving (you asked for {wantFps}).
            {:else}
              Frames are being dropped.
            {/if}
            Motion may look choppy.
            {#snippet actions()}
              {#if wantFps > 30}<Button onclick={lowerFps}>Switch to 30 fps</Button>{/if}
              <Button variant="ghost" onclick={keepAsIs}>Keep</Button>
            {/snippet}
          </Banner>
        {/if}
        {#if session.free !== null && session.free < LOW_FREE}
          <Banner kind="warn" title="Disk space is running low">
            About {fmtSize(session.free / 1e6)} left on the drive that holds your browser. If it gets
            close to full, Reclux stops safely and keeps what is recorded so far.
          </Banner>
        {/if}
        {#if session.elapsed >= MAX_SECONDS}
          <Banner kind="warn" title="2 hours reached">
            Reclux is still recording. Stop when you are ready.
          </Banner>
        {:else if session.elapsed >= WARN_SECONDS}
          <Banner kind="info" title="15 minutes left of 2 hours">
            Recording continues after that. Stop when you are ready.
          </Banner>
        {/if}

        <ControlBar />
      {:else}
        <Finished />
      {/if}
    </section>

    {#if showPreview && showLibrary}
      <div class="library"><Library /></div>
    {/if}
  </main>
</div>

<style>
  .app {
    container-type: inline-size;
    min-height: 100vh;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--s-3) var(--s-4);
    border-bottom: 1px solid var(--c-border);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    font-size: var(--t-lg);
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .logo {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-accent);
  }
  .right {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  .guide {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  .offline {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  .preview {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-3);
    padding: var(--s-2) var(--s-4);
    background: var(--c-surface-2);
    font-size: var(--t-xs);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
  }
  .preview button,
  .preview select {
    min-height: 32px;
    padding: 0 var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-pill);
    background: var(--c-bg);
    cursor: pointer;
  }
  .preview button.on {
    background: var(--c-text);
    color: var(--c-bg);
  }
  .layout {
    display: grid;
    gap: var(--s-5);
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--s-5) var(--s-4);
  }
  .setup.locked {
    opacity: 0.5;
  }
  .stage {
    display: grid;
    align-content: start;
    gap: var(--s-4);
    min-width: 0;
  }
  .empty,
  .live {
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--s-3);
    aspect-ratio: 16 / 9;
    border: 1px dashed var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    color: var(--c-text-muted);
    text-align: center;
  }
  .empty h2 {
    color: var(--c-text);
    font-size: var(--t-lg);
  }
  .live {
    border-style: solid;
    background: repeating-linear-gradient(135deg, var(--c-surface), var(--c-surface) 14px, var(--c-surface-2) 14px, var(--c-surface-2) 28px);
  }
  .live.paused {
    background: var(--c-surface);
  }
  .count {
    font: 800 96px / 1 var(--font-mono);
    color: var(--c-text);
  }
  .library {
    grid-column: 1 / -1;
  }

  /* Tablet portrait and up: two columns */
  @container (min-width: 700px) {
    .layout {
      grid-template-columns: 340px 1fr;
      padding: var(--s-6);
    }
  }
  /* Phone-width window: hide the locked setup to leave room for controls */
  @container (max-width: 699px) {
    /* A fixed 16:9 box grows sideways when text is enlarged, so let it grow downward instead. */
    .empty,
    .live {
      aspect-ratio: auto;
      min-height: 12rem;
      padding: var(--s-5) var(--s-4);
    }
    .setup.locked {
      display: none;
    }
  }
</style>
