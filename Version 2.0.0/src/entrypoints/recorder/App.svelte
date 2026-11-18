<script lang="ts">
  // The recorder page: start card → countdown → recording bar (Screen 2) → editor (Screens 3–4) → export (Screen 5).
  // Two ways to be open:
  //  - the small Reclux window (Start recording in the popup): asks to share at once, counts down in the middle of the
  //    screen, shrinks into the recording controls at the bottom-right, and grows into the editor after Stop;
  //  - a normal tab (recovering a lost recording, or opened by hand): the start card with its Record button.
  import Banner from '../../lib/Banner.svelte';
  import Button from '../../lib/Button.svelte';
  import Editor from '../../lib/Editor.svelte';
  import Export from '../../lib/Export.svelte';
  import Floating from '../../lib/Floating.svelte';
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
  import { START, countdownSize, fitWindow, growWindow, minimiseWindow, pickerSize } from '../../lib/window';

  const mini = location.hash === START;
  session.mini = mini;
  if (mini) history.replaceState(null, '', location.pathname); // a reload must not start again

  // Record = the browser's share picker only. The floating window used to open from this same click, and taking the
  // focus from the picker made Chrome and Edge close it as "denied" (Issue 4). It now opens only from Keep on top.
  const record = async () => {
    await start();
    // Picked: bring this window back over the shared tab or window, so the countdown is seen.
    if (mini && session.phase === 'countdown') void minimiseWindow(false);
  };

  onMount(() => {
    // A crash or closed tab can leave a recording behind. Offer to get it back.
    void refreshRecoverable();
    // The small window asks to share straight away. Firefox refuses without a click here, so it shows a button.
    if (mini) void record();
  });

  const live = $derived(session.phase === 'recording' || session.phase === 'paused');
  const preset = $derived(findPreset(session.presetId));
  let view = $state<'edit' | 'export'>('edit');
  let solid = $state(loadSettings().solid);
  // The small window while recording: only the controls.
  const compact = $derived(mini && live);

  // Lighter glass while recording: the screen behind moves, so blur would be redrawn every frame.
  $effect(() => {
    document.documentElement.toggleAttribute('data-recording', live);
  });
  // The floating window only lives while recording.
  $effect(() => {
    if (session.phase === 'idle' || session.phase === 'finished') closeFloating();
  });

  // The small window's size follows what it shows.
  let main: HTMLElement | undefined = $state();
  let placed = false;
  let opened = true; // the window was just made at picker size: re-sizing it now would nudge the open picker
  $effect(() => {
    if (!mini) return;
    if (session.phase === 'finished') {
      void growWindow();
      return;
    }
    if (!compact) {
      placed = false;
      if (session.phase === 'idle' && opened) opened = false;
      else void (session.phase === 'idle' ? pickerSize() : countdownSize());
      return;
    }
    if (!main) return;
    // Recording: exactly the size of the controls (bar, circle, notices). Bottom-right the first time; after that it
    // stays where the user put it.
    const el = main;
    const fit = () => {
      // Set aside for Keep on top: leave it so (Firefox would bring a minimised window back when it is resized).
      if (document.hidden || session.floating) return;
      const r = el.getBoundingClientRect();
      void fitWindow(r.width, r.height, placed ? 'keep' : 'corner');
      placed = true;
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // Covered by other windows when recording began (fit skipped): fit it when it is seen again.
    document.addEventListener('visibilitychange', fit);
    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', fit);
    };
  });
  // Keep on top: the always-on-top controls replace this window until they are closed.
  let wasFloating = false;
  $effect(() => {
    const f = session.floating;
    if (!mini || f === wasFloating) return;
    wasFloating = f;
    if (f || live) void minimiseWindow(f);
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

{#snippet warnings()}
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
{/snippet}

<div class="app" class:full={session.phase === 'finished'} class:mini={mini && session.phase !== 'finished'} class:compact>
  {#if !mini || session.phase === 'finished'}
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
  {/if}

  <main bind:this={main}>
    <!-- The small window's countdown shows only the countdown. Notices wait for the controls window. -->
    {#if !(mini && session.phase === 'countdown')}
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
    {/if}

    {#if session.phase === 'idle' && mini}
      <!-- Behind the browser's share window. Seen when it was cancelled, and in Firefox, which needs this click. -->
      <section class="ask" aria-labelledby="ask-title">
        <Logo height={22} />
        <h2 id="ask-title">Choose what to share</h2>
        <p class="hint">Your browser asks: a tab, a window or your whole screen.</p>
        <Button variant="primary" size="lg" icon="record" onclick={record}>Choose what to share</Button>
      </section>
    {:else if session.phase === 'idle'}
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
          <span>Mic {session.mic ? 'on' : 'off'}</span>{#if session.system}<span>System audio on</span>{/if}
          <span>{session.camera ? 'Webcam' : 'Normal'}</span>
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
        <div class="count glass" role="status" aria-live="assertive">{session.count || '…'}</div>
        <!-- At 0 the encoder can still be getting ready on a busy computer. -->
        <p>{session.count ? `Recording starts in ${session.count} s` : 'Starting…'}</p>
        <Button variant="ghost" onclick={reset}>Cancel</Button>
      </section>
    {:else if compact}
      <!-- The small window while recording: the controls, and the webcam circle when it is not on web pages. -->
      <Floating />
      {#if canFloat() && !session.floating}
        <Button icon="window" onclick={openFloating}>Keep on top</Button>
      {/if}
      {@render warnings()}
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
        {@render warnings()}
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
  /* The small window (share, countdown): everything in the middle. */
  .mini {
    grid-template-rows: minmax(0, 1fr);
  }
  .mini main {
    align-content: center;
    justify-items: center;
    padding: var(--s-4);
  }
  /* The small window while recording: as small as its contents, which the window is then sized to. */
  .app.compact {
    display: block;
    min-height: 0;
  }
  .compact main {
    justify-items: center;
    width: max-content;
    max-width: none;
    margin: 0;
    padding: var(--s-2);
    gap: var(--s-2);
  }
  .compact main > :global(.banner) {
    max-width: 30rem;
  }
  /* Editor: notices keep their own height, the editor takes the rest. */
  .full main {
    display: flex;
    flex-direction: column;
  }
  .full main > :global(.editor) {
    flex: 1;
  }
  .ask {
    display: grid;
    justify-items: center;
    gap: var(--s-3);
    text-align: center;
  }
  .ask h2 {
    font-size: var(--t-lg);
    font-weight: 700;
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
  .mini .center {
    margin-top: 0;
  }
  /* The countdown: big, on its own disc, in the middle (of the screen, in the small window). */
  .count {
    display: grid;
    place-items: center;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    font: 800 140px / 1 var(--font-mono);
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
