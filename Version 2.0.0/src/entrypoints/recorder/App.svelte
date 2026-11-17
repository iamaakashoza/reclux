<script lang="ts">
  // The recorder page: start card → countdown → recording bar (Screen 2) → editor (Screens 3–4) → export (Screen 5).
  import Banner from '../../lib/Banner.svelte';
  import Button from '../../lib/Button.svelte';
  import Editor from '../../lib/Editor.svelte';
  import Export from '../../lib/Export.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Logo from '../../lib/Logo.svelte';
  import RecordingBar from '../../lib/RecordingBar.svelte';
  import SetupPanel from '../../lib/SetupPanel.svelte';
  import { MAX_SECONDS, WARN_SECONDS, findPreset, fmtSize } from '../../lib/presets';
  import { LOW_FREE } from '../../lib/disk';
  import { loadSettings, saveSettings } from '../../lib/settings';
  import { onMount, tick } from 'svelte';
  import { discardRecoverable, recover, refreshRecoverable, reset, session, start } from '../../lib/session.svelte';
  import { canFloat, closeFloating, openFloating } from '../../lib/pip';

  // Record: the browser's screen picker, and the floating controls window, both need this same click.
  const record = () => {
    // Picker cancelled or blocked: recording never started, so close the floating window again.
    void start().then(() => session.phase === 'idle' && closeFloating());
    openFloating();
  };

  // A crash or closed tab can leave a recording behind. Offer to get it back.
  onMount(refreshRecoverable);

  const live = $derived(session.phase === 'recording' || session.phase === 'paused');
  const preset = $derived(findPreset(session.presetId));
  let view = $state<'edit' | 'export'>('edit');
  let solid = $state(loadSettings().solid);

  // Lighter glass while recording: the screen behind moves, so blur would be redrawn every frame.
  $effect(() => {
    document.documentElement.toggleAttribute('data-recording', live);
  });
  // The floating window only lives while recording.
  $effect(() => {
    if (session.phase === 'idle' || session.phase === 'finished') closeFloating();
  });

  // When the screen changes, move keyboard focus to its first button, so it is not lost when the old one disappears.
  const focusMain = () => {
    const b = document.querySelector<HTMLElement>('main button:not([disabled])');
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
    if (now === 'finished') view = 'edit';
    if (now === 'idle') return;
    void tick().then(focusMain);
    // The screen-share window can still hold focus at this moment. If so, try again when this window gets it back.
    addEventListener('focus', () => document.activeElement === document.body && focusMain(), { once: true });
  });

  // Closing this tab would lose a live or unsaved recording, so the browser asks first.
  $effect(() => {
    const guard = live || (session.phase === 'finished' && !session.saved) || session.exporting;
    if (!guard) return;
    const ask = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', ask);
    return () => window.removeEventListener('beforeunload', ask);
  });
</script>

<div class="app" class:full={session.phase === 'finished'}>
  <header>
    <h1><Logo /></h1>
    <span class="right">
      <a class="guide" href="/welcome.html">Setup guide</a>
      <button
        class="look"
        aria-pressed={solid}
        title="Use solid surfaces instead of see-through glass"
        onclick={() => saveSettings({ solid: (solid = !solid) })}
      >
        <Icon name="contrast" size={16} /> Reduce transparency
      </button>
      <span class="offline"><Icon name="shield" size={16} /> Works offline</span>
    </span>
  </header>

  <main>
    {#if session.error && session.phase !== 'finished'}
      <Banner kind="error" title="Something went wrong">
        {session.error}
        {#snippet actions()}
          <Button onclick={() => (session.error = '')}>Dismiss</Button>
        {/snippet}
      </Banner>
    {/if}
    {#each session.notices as n (n)}
      <Banner kind="info" title="Heads up">
        {n}
        {#snippet actions()}
          <Button onclick={() => (session.notices = session.notices.filter((x) => x !== n))}>Dismiss</Button>
        {/snippet}
      </Banner>
    {/each}

    {#if session.phase === 'idle'}
      {#each session.recoverable as item (item.name)}
        <Banner kind="warn" title="Found a recording that was never saved">
          From {new Date(item.modified).toLocaleString()} · {fmtSize(item.size / 1e6)}. It may have been cut short by a
          crash or a closed tab.
          {#snippet actions()}
            <Button onclick={() => recover(item)}>Recover it</Button>
            <Button variant="ghost" onclick={() => discardRecoverable(item)}>Delete</Button>
          {/snippet}
        </Banner>
      {/each}

      <section class="start glass" aria-labelledby="start-title">
        <h2 id="start-title">Ready to record</h2>
        <p class="chips">
          <span>{preset.height}p</span><span>{preset.fps} fps</span>
          <span>Mic {session.mic ? 'on' : 'off'}</span><span>System audio {session.system ? 'on' : 'off'}</span>
          {#if session.camera}<span>Webcam</span>{/if}{#if session.zoom}<span>Cursor zoom</span>{/if}
        </p>
        <Button variant="primary" size="lg" icon="record" onclick={record}>Record</Button>
        <p class="hint">Your browser asks what to share: a tab, a window or your whole screen.</p>
        <details>
          <summary>Settings <Icon name="chevron" size={16} /></summary>
          <SetupPanel />
        </details>
      </section>
      <p class="foot"><Icon name="shield" size={16} /> Works offline · Saved on this device</p>
    {:else if session.phase === 'countdown'}
      <section class="center" aria-label="Starting">
        <div class="count glass" role="status" aria-live="assertive">{session.count}</div>
        <p>Starting… switch to what you want to record.</p>
        <Button variant="ghost" onclick={reset}>Cancel</Button>
      </section>
    {:else if live}
      <section class="center" aria-label="Recording">
        <p class="live">
          {session.phase === 'paused'
            ? 'Paused. Nothing is being recorded.'
            : 'Recording. Work in your other tab or window; come back here to pause or stop.'}
        </p>
        <RecordingBar />
        {#if !session.floating && canFloat()}
          <Button icon="window" onclick={openFloating}>Pop out controls</Button>
          <p class="hint">A small window that stays on top of every app, so you can pause and stop from anywhere.</p>
        {/if}
        {#if session.free !== null && session.free < LOW_FREE}
          <Banner kind="warn" title="Disk space is running low">
            About {fmtSize(session.free / 1e6)} left on the drive that holds your browser. If it gets close to full,
            Reclux stops safely and keeps what is recorded so far.
          </Banner>
        {/if}
        {#if session.elapsed >= MAX_SECONDS}
          <Banner kind="warn" title="2 hours reached">Reclux is still recording. Stop when you are ready.</Banner>
        {:else if session.elapsed >= WARN_SECONDS}
          <Banner kind="info" title="15 minutes left of 2 hours">Recording continues after that. Stop when you are ready.</Banner>
        {/if}
      </section>
    {:else if view === 'edit'}
      <Editor onsaved={() => (view = 'export')} />
    {:else}
      <Export onback={() => (view = 'edit')} />
    {/if}
  </main>
</div>

<style>
  .app {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 100vh;
  }
  /* The editor fills the window, so the timeline stays in view. */
  .app.full {
    height: 100vh;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2) var(--s-4);
    padding: var(--s-3) var(--s-5);
  }
  .right {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
  }
  .guide,
  .look,
  .offline {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  .guide,
  .look {
    min-height: var(--tap);
  }
  .look {
    padding: 0 var(--s-3);
    border: 1px solid var(--glass-border);
    border-radius: var(--r-pill);
    background: none;
    cursor: pointer;
  }
  .look[aria-pressed='true'] {
    background: var(--fill-strong);
    color: var(--c-text);
  }
  main {
    display: grid;
    align-content: start;
    gap: var(--s-4);
    width: 100%;
    max-width: 1440px;
    min-height: 0;
    margin: 0 auto;
    padding: var(--s-4) var(--s-5) var(--s-5);
  }
  /* Editor: notices keep their own height, the editor takes the rest. */
  .full main {
    display: flex;
    flex-direction: column;
  }
  .full main > :global(.editor) {
    flex: 1;
  }
  .start {
    display: grid;
    justify-items: center;
    gap: var(--s-4);
    width: min(32rem, 100%);
    margin: 6vh auto 0;
    padding: var(--s-6) var(--s-5) var(--s-5);
    border-radius: var(--r-xl);
    text-align: center;
  }
  .start h2 {
    font-size: var(--t-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--s-2);
  }
  .chips span {
    padding: 2px var(--s-3);
    border-radius: var(--r-pill);
    background: var(--fill);
    font-size: var(--t-xs);
    font-weight: 600;
    color: var(--c-text-muted);
  }
  .start :global(.lg) {
    min-width: 12rem;
  }
  .hint {
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  details {
    width: 100%;
    text-align: left;
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
    border-radius: var(--r-pill);
    font-size: var(--t-sm);
    font-weight: 600;
    color: var(--c-text-muted);
    cursor: pointer;
  }
  summary:hover {
    color: var(--c-text);
  }
  summary {
    gap: var(--s-1);
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary :global(svg) {
    transition: transform var(--ease);
  }
  details[open] summary :global(svg) {
    transform: rotate(180deg);
  }
  details[open] summary {
    margin-bottom: var(--s-3);
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  .center {
    display: grid;
    justify-items: center;
    gap: var(--s-4);
    margin-top: 10vh;
    text-align: center;
  }
  .count {
    display: grid;
    place-items: center;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    font: 800 88px / 1 var(--font-mono);
  }
  .live {
    max-width: 36rem;
    color: var(--c-text-muted);
  }
  @media (max-width: 600px) {
    header,
    main {
      padding-left: var(--s-4);
      padding-right: var(--s-4);
    }
    .offline {
      display: none;
    }
  }
</style>
