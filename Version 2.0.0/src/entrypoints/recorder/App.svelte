<script lang="ts">
  // The recorder page: start card → countdown → recording → editor (Screens 3–4) → export (Screen 5).
  // Two ways to be open:
  //  - Start recording (toolbar popup): a tab next to the user's page, in their window (report §41). A picture of
  //    their page fills it, the browser's share box shows over it at once (Firefox: one click first), then a big
  //    see-through countdown. At 0 their page comes back and a small controls window shows bottom-right.
  //    After Stop this tab comes to the front with the editor.
  //  - A normal tab (recovering a lost recording, or opened by hand): the start card with its Record button.
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
  import { onMount, tick } from 'svelte';
  import { discardRecoverable, hooks, recover, refreshRecoverable, reset, session, start } from '../../lib/session.svelte';
  import { closeFloating, mountControls } from '../../lib/pip';
  import { BACKDROP, START, closeControls, closeThisTab, fitControls, openControls, showTab, startedFrom } from '../../lib/window';

  // Opened by Start recording: which tab to go back to, and the picture of it.
  const back = startedFrom(location.hash);
  const fromStart = location.hash.startsWith(START);
  let flow = $state(fromStart);
  if (fromStart) history.replaceState(null, '', location.pathname); // a reload must not start again
  const backdrop = (() => {
    if (!fromStart) return '';
    try {
      const shot = localStorage.getItem(BACKDROP) ?? '';
      localStorage.removeItem(BACKDROP);
      return shot;
    } catch {
      return '';
    }
  })();

  // Cancelled before recording began: back to the user's page, and this tab goes away (no "cancelled" notice).
  const leave = async () => {
    await showTab(back);
    await closeThisTab();
  };
  let needsClick = $state(false);
  const record = async () => {
    needsClick = false;
    const r = await start();
    if (r === 'click') needsClick = true;
    else if (r === 'cancelled') {
      if (flow) return void leave();
      session.notices = ['Screen sharing was cancelled or blocked.'];
    }
  };
  const cancel = () => {
    reset();
    if (flow) void leave();
  };
  // Just before recording begins, the user's page comes back, so the first frames show it and not the countdown.
  hooks.beforeGo = async () => {
    if (!flow) return;
    await showTab(back);
    await new Promise((r) => setTimeout(r, 300)); // time for it to be drawn
  };

  onMount(() => {
    // A crash or closed tab can leave a recording behind. Offer to get it back.
    void refreshRecoverable();
    // Ask what to share straight away. Firefox refuses without a click here, so it shows a button.
    if (flow) void record();
  });

  const live = $derived(session.phase === 'recording' || session.phase === 'paused');
  const preset = $derived(findPreset(session.presetId));
  let view = $state<'edit' | 'export'>('edit');
  // The picture of the user's page behind the share box and the countdown.
  const stage = $derived(flow && (session.phase === 'idle' || session.phase === 'countdown'));

  // Lighter glass while recording: the screen behind moves, so blur would be redrawn every frame.
  $effect(() => {
    document.documentElement.toggleAttribute('data-recording', live);
  });

  // While recording: the small controls window, bottom-right, sized to the controls (no scrollbars). Opened when the
  // countdown starts (owner's call, 21 Nov 2026), so its page is ready before recording: opening it during the
  // recording stalled Firefox ~0.3 s and its blank window was recorded (report §45). It shows "Starting in 3…".
  const wanted = $derived(session.phase === 'countdown' || live);
  let opened = false;
  $effect(() => {
    if (!wanted) return void (opened = false);
    if (opened) return;
    opened = true;
    // Counted as open from now, so the bar on web pages never shows (and gets recorded) meanwhile.
    session.controls = true;
    void (async () => {
      const win = await openControls(560, 120);
      // Never found its page (a blank window), or cancelled while it was opening: it must not stay behind.
      if (!win || !wanted) {
        session.controls = false; // the bar on web pages takes over
        return closeControls();
      }
      mountControls(win, () => (session.controls = false));
      const el = win.document.querySelector<HTMLElement>('.float');
      if (!el) return;
      // Re-fit when the controls change (webcam shown, a notice) and when the window itself changes size.
      const fit = () => void fitControls(win, el);
      new (win as unknown as typeof globalThis).ResizeObserver(fit).observe(el);
      win.addEventListener('resize', fit);
    })();
  });
  // Both control windows only live while recording.
  $effect(() => {
    if (session.phase === 'idle' || session.phase === 'finished') {
      closeFloating();
      closeControls();
    }
    // Once recording has begun this tab is a normal Reclux tab (New recording shows the start card). Also when
    // finishing the file failed: then the start card must show, with the recording to recover.
    if (live || session.phase === 'finished') flow = false;
  });
  // The controls run on this page. Reloaded or closed mid-recording, it must take their window along: left behind,
  // it stayed frozen, and its Pause and Stop did nothing.
  addEventListener('pagehide', () => {
    closeFloating();
    closeControls();
  });

  // When the screen changes, move keyboard focus to its first button, so it is not lost when the old one disappears.
  // Without drawing a ring (the outline the owner saw on the controls): the ring shows once the keyboard is used.
  let lastPhase = session.phase;
  $effect(() => {
    const now = session.phase;
    if (now === lastPhase) return;
    lastPhase = now;
    if (now === 'finished') view = 'edit';
    if (now === 'idle') return;
    void tick().then(() => document.querySelector<HTMLElement>('main button:not([disabled])')?.focus({ focusVisible: false } as FocusOptions));
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

<div class="app" class:full={session.phase === 'finished'} class:stage style:--shot={stage && backdrop ? `url("${backdrop}")` : undefined}>
  {#if !stage}
    <header>
      <h1><Logo /></h1>
      <span class="right">
        <a class="guide" href="/welcome.html"><Icon name="guide" size={16} /> Setup guide</a>
        <span class="sep" aria-hidden="true"></span>
        <span class="offline"><Icon name="shield" size={16} /> Works offline</span>
      </span>
    </header>
  {/if}

  <main>
    <!-- The countdown shows only the countdown. -->
    {#if session.phase !== 'countdown'}
      {#if session.error && session.phase !== 'finished'}
        <Banner kind="danger" title="Something went wrong">
          {session.error}
          {#snippet actions()}
            <Button variant="secondary" onclick={() => (session.error = '')}>Dismiss</Button>
          {/snippet}
        </Banner>
      {/if}
      {#each session.notices as n (n)}
        <Banner kind="info" title="Heads up">
          {n}
          {#snippet actions()}
            <Button variant="secondary" onclick={() => (session.notices = session.notices.filter((x) => x !== n))}>Dismiss</Button>
          {/snippet}
        </Banner>
      {/each}
    {/if}

    {#if stage && session.phase === 'idle'}
      <!-- Over the picture of the user's page. Chromium: the browser's share box is open on top of this.
           Firefox: it opens only from a click on this page, so this card asks for that click. -->
      {#if needsClick || session.error}
        <section class="ask glass" aria-labelledby="ask-title">
          <Logo height={22} />
          <h2 id="ask-title">Choose what to share</h2>
          <p class="hint">Your browser asks: a tab, a window or your whole screen.</p>
          <div class="row">
            <Button variant="primary" size="lg" icon="record" onclick={record}>Choose what to share</Button>
            <Button variant="secondary" size="lg" onclick={cancel}>Cancel</Button>
          </div>
        </section>
      {/if}
    {:else if session.phase === 'idle'}
      {#each session.recoverable as item (item.name)}
        <Banner kind="warning" title="Found a recording that was never saved">
          From {new Date(item.modified).toLocaleString()} · {fmtSize(item.size / 1e6)}. It may have been cut short by a
          crash or a closed tab.
          {#snippet actions()}
            {@const busy = session.finishing && session.fileName === item.name}
            <Button variant="secondary" disabled={session.finishing} onclick={() => recover(item)}>
              {busy ? `Getting it ready… ${Math.round(session.finishShare * 100)}%` : 'Recover it'}
            </Button>
            <Button variant="ghost" disabled={session.finishing} onclick={() => discardRecoverable(item)}>Delete</Button>
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
      <!-- Big and see-through, in the middle of the window the user is working in. -->
      <section class="center" aria-label="Starting">
        <div class="count" role="status" aria-live="assertive">{session.count || '…'}</div>
        <!-- At 0 the encoder can still be getting ready on a busy computer. -->
        <div class="under glass">
          <p class="when">{session.count ? `Recording starts in ${session.count} s` : 'Starting…'}</p>
          <Button variant="secondary" onclick={cancel}>Cancel</Button>
        </div>
      </section>
    {:else if live}
      <section class="center" aria-label="Recording">
        <p class="live">
          {session.phase === 'paused'
            ? 'Paused. Nothing is being recorded.'
            : 'Recording. Work in your other tab or window; the controls are in the small Reclux window.'}
        </p>
        <RecordingBar />
        {#if session.elapsed >= MAX_SECONDS}
          <Banner kind="warning" title="2 hours reached">Reclux is still recording. Stop when you are ready.</Banner>
        {:else if session.elapsed >= WARN_SECONDS}
          <Banner kind="info" title="15 minutes left of 2 hours">Recording continues after that. Stop when you are ready.</Banner>
        {/if}
        {#if session.free !== null && session.free < LOW_FREE}
          <Banner kind="warning" title="Disk space is running low">
            About {fmtSize(session.free / 1e6)} left on the drive that holds your browser. If it gets close to full,
            Reclux stops safely and keeps what is recorded so far.
          </Banner>
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
  /* Editor and export fill the window edge to edge (owner's call: full width, no boxed cards). */
  .app.full {
    height: 100vh;
  }
  /* Share box and countdown: the picture of the user's page, slightly dimmed, so Reclux looks see-through. */
  .app.stage {
    grid-template-rows: minmax(0, 1fr);
    background: var(--shot, none) center / cover no-repeat, var(--backdrop);
  }
  .app.stage::before {
    content: '';
    position: fixed;
    inset: 0;
    background: rgb(8 8 8 / 22%);
    pointer-events: none;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2) var(--s-4);
    padding: var(--s-3) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  .right {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
  }
  .guide,
  .offline {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  .guide {
    min-height: var(--tap);
    text-decoration: none;
  }
  .guide:hover {
    color: var(--c-text);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  /* Setup guide | Works offline */
  .sep {
    width: 1px;
    height: 16px;
    background: var(--c-border);
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
  .stage main {
    position: relative; /* over the dimming layer */
    align-content: center;
    justify-items: center;
    max-width: none;
  }
  .stage main > :global(.banner) {
    width: min(36rem, 100%);
  }
  /* Editor and export: no outer padding, they reach the window's edges. */
  .full main {
    display: flex;
    flex-direction: column;
    max-width: none;
    padding: 0;
    gap: 0;
  }
  .full main > :global(.editor),
  .full main > :global(.export) {
    flex: 1;
    min-height: 0;
  }
  .full main > :global(.banner) {
    margin: var(--s-3) var(--s-5) 0;
  }
  .ask {
    display: grid;
    justify-items: center;
    gap: var(--s-3);
    padding: var(--s-6) var(--s-6) var(--s-5);
    border-radius: var(--r-xl);
    text-align: center;
  }
  .ask h2 {
    font-size: var(--t-lg);
    font-weight: 700;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--s-2);
    margin-top: var(--s-2);
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
    gap: var(--s-1);
    min-height: var(--tap);
    border-radius: var(--r-pill);
    font-size: var(--t-sm);
    font-weight: 600;
    color: var(--c-text-muted);
    list-style: none;
    cursor: pointer;
  }
  summary:hover {
    color: var(--c-text);
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
  .stage .center {
    margin-top: 0;
  }
  /* The countdown: large numbers on a clear liquid-glass disc, the user's page showing through. */
  .count {
    display: grid;
    place-items: center;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    font: 700 168px / 1 var(--font);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.04em;
    color: var(--off-white);
    text-shadow: 0 2px 24px rgb(8 8 8 / 35%);
    background: linear-gradient(180deg, rgb(255 255 255 / 26%), rgb(255 255 255 / 8%));
    border: 1px solid rgb(255 255 255 / 55%);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 70%), 0 20px 60px rgb(8 8 8 / 25%);
    backdrop-filter: blur(14px) saturate(180%);
  }
  /* Readable over any page: a glass capsule under the disc. */
  .under {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-1) var(--s-1) var(--s-1) var(--s-4);
    border-radius: var(--r-pill);
  }
  .when {
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .live {
    max-width: 36rem;
    color: var(--c-text-muted);
  }
  @media (prefers-reduced-transparency: reduce) {
    .count {
      background: rgb(8 8 8 / 70%);
      backdrop-filter: none;
    }
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
