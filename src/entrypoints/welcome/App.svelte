<script lang="ts">
  import { tick } from 'svelte';
  import Banner from '../../lib/Banner.svelte';
  import Button from '../../lib/Button.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Logo from '../../lib/Logo.svelte';
  import HowItWorks from './HowItWorks.svelte';
  import Segmented from '../../lib/Segmented.svelte';
  import Toggle from '../../lib/Toggle.svelte';
  import { PRESETS } from '../../lib/presets';
  import { loadSettings, saveSettings } from '../../lib/settings';

  // The wizard saves the same choices the popup and recorder page use.
  const s = $state(loadSettings());
  $effect(() => saveSettings({ ...s }));

  const isFirefox = navigator.userAgent.includes('Firefox/');
  const SOURCES = [
    { value: 'tab', label: 'Tab', icon: 'tab' },
    { value: 'window', label: 'Window', icon: 'window' },
    { value: 'screen', label: 'Screen', icon: 'screen' },
  ];
  const STEPS = ['Welcome', 'Your defaults', 'How it works', 'Ready'];

  let step = $state(0);
  let heading = $state<HTMLElement>();

  // Move focus to the new step's heading, so keyboard and screen reader users start at the top of it.
  async function go(to: number) {
    step = Math.min(STEPS.length - 1, Math.max(0, to));
    await tick();
    heading?.focus();
  }

  const openRecorder = () => (location.href = browser.runtime.getURL('/recorder.html'));
</script>

<main>
  <header>
    <h1><Logo height={28} /></h1>
    {#if step < STEPS.length - 1}
      <button class="skip" onclick={() => go(STEPS.length - 1)}>Skip setup</button>
    {/if}
  </header>

  <nav aria-label="Setup progress">
    <ol>
      {#each STEPS as name, i (name)}
        <li class:done={i < step} class:now={i === step} aria-current={i === step ? 'step' : undefined}>
          <span class="num">{#if i < step}<Icon name="check" size={14} />{:else}{i + 1}{/if}</span>
          <span class="name">{name}</span>
        </li>
      {/each}
    </ol>
  </nav>

  <section class="card" aria-labelledby="step-title">
    {#if step === 0}
      <h2 id="step-title" tabindex="-1" bind:this={heading}>Welcome to Reclux</h2>
      <p class="lead">Record your screen with sound. Everything stays on this computer.</p>
      <ul class="points">
        <li><Icon name="shield" size={24} /><span><strong>No account, no upload.</strong> Your recordings are never sent anywhere.</span></li>
        <li><Icon name="folder" size={24} /><span><strong>You choose where to save</strong> (any folder, downloads, or drives such as D: or E:).</span></li>
        <li><Icon name="play" size={24} /><span><strong>Works offline.</strong> No internet needed, ever.</span></li>
      </ul>
      <details class="why">
        <summary>
          <span class="why-icon"><Icon name="shield" size={22} /></span>
          <span class="why-text">
            <strong>Why does Reclux need permission?</strong>
            <small>Please read: what each permission does, and why Reclux asks for it.</small>
          </span>
          <span class="why-open">
            <span class="closed-label">Read</span><span class="open-label">Close</span>
            <Icon name="chevron" size={18} />
          </span>
        </summary>
        <ul class="perms">
          <li><Icon name="download" size={18} /><span><strong>Downloads:</strong> shows the “Save as” window, so you can pick the folder.</span></li>
          <li><Icon name="folder" size={18} /><span><strong>Unlimited storage:</strong> keeps long recordings safely while you record.</span></li>
          {#if !isFirefox}
            <li><Icon name="sliders" size={18} /><span><strong>CPU:</strong> tells you if your computer is too slow to keep up.</span></li>
            <li><Icon name="play" size={18} /><span><strong>Power:</strong> keeps the computer awake while recording.</span></li>
          {/if}
        </ul>
        <p class="small">Your browser always asks before Reclux can see your screen or microphone.</p>
      </details>
    {:else if step === 1}
      <h2 id="step-title" tabindex="-1" bind:this={heading}>Choose your defaults</h2>
      <p class="lead">You can change these any time, in the toolbar popup or on the recorder page.</p>
      <div class="form">
        <Segmented legend="What to record" name="wiz-source" options={SOURCES} bind:value={s.source} />
        <div class="field">
          <label for="wiz-quality">Quality</label>
          <select id="wiz-quality" bind:value={s.presetId}>
            {#each PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
          </select>
          <p class="small">The saved file always plays at the frame rate you choose.{#if !isFirefox}{' '}For the smoothest motion, record a Tab or Window: browsers send fewer new pictures from an entire screen.{/if}</p>
        </div>
        <div class="field">
          <label for="wiz-format">Format</label>
          <select id="wiz-format" bind:value={s.format}>
            <option value="mp4">MP4 (recommended)</option>
            <option value="webm">WebM</option>
          </select>
        </div>
        <div class="field">
          <span class="label">Audio</span>
          <Toggle icon="mic" label="Microphone" bind:checked={s.mic} />
          <Toggle icon="speaker" label="System audio" bind:checked={s.system} />
        </div>
        {#if isFirefox}
          <Banner kind="info" title="Firefox">
            Choose MP4: WebM is much slower to encode in Firefox. System audio is not available in Firefox.
          </Banner>
        {/if}
      </div>
    {:else if step === 2}
      <h2 id="step-title" tabindex="-1" bind:this={heading}>How a recording works</h2>
      <HowItWorks {isFirefox} />
      <Banner kind="warn" title="Always press Save file">
        Until you save, the video lives in the browser’s private storage on this computer. Clearing the browser’s data would delete it.
        If something goes wrong, Reclux offers to recover it next time.
      </Banner>
    {:else}
      <h2 id="step-title" tabindex="-1" bind:this={heading}>You are ready</h2>
      <p class="lead">Press the button below to open the recorder.</p>
      <Banner kind="info" title="Tip: pin Reclux to the toolbar">
        Click the puzzle icon in your browser’s toolbar, then the pin next to Reclux. You can then start from the popup.
      </Banner>
      <div class="end">
        <Button variant="primary" icon="record" onclick={openRecorder}>Open recorder</Button>
      </div>
    {/if}
  </section>

  <footer>
    <Button variant="ghost" disabled={step === 0} onclick={() => go(step - 1)}>Back</Button>
    {#if step < STEPS.length - 1}
      <Button variant="primary" onclick={() => go(step + 1)}>Next</Button>
    {/if}
  </footer>
</main>

<style>
  main {
    display: grid;
    gap: var(--s-4);
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--s-5) var(--s-4) var(--s-6);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .skip {
    min-height: var(--tap);
    padding: 0 var(--s-3);
    background: none;
    border: 0;
    color: var(--c-text-muted);
    text-decoration: underline;
    cursor: pointer;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  nav ol {
    display: flex;
    gap: var(--s-2);
  }
  nav li {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding-top: var(--s-2);
    border-top: 3px solid var(--c-border);
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  nav li.done,
  nav li.now {
    border-top-color: var(--c-accent);
  }
  nav li.now {
    color: var(--c-text);
    font-weight: 700;
  }
  .num {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--c-surface-2);
    font-weight: 700;
  }
  nav li.done .num,
  nav li.now .num {
    background: var(--c-accent);
    color: #fff;
  }
  @media (max-width: 520px) {
    nav .name {
      display: none;
    }
    nav li.now .name {
      display: inline;
    }
  }
  .card {
    display: grid;
    gap: var(--s-4);
    align-content: start;
    min-height: 22rem;
    padding: var(--s-5);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  h2 {
    font-size: var(--t-xl);
    outline: none;
  }
  .lead {
    font-size: var(--t-md);
    color: var(--c-text-muted);
  }
  .points,
  .perms {
    display: grid;
    gap: var(--s-3);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .points li {
    display: flex;
    gap: var(--s-3);
    align-items: flex-start;
  }
  .points :global(svg) {
    flex: none;
    margin-top: 2px;
    color: var(--c-accent);
  }
  .why {
    border: 1px solid var(--c-info);
    border-radius: var(--r-md);
    background: var(--c-info-bg);
    color: var(--c-text);
  }
  .why summary {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-height: var(--tap);
    padding: var(--s-3);
    border-radius: var(--r-md);
    cursor: pointer;
    list-style: none; /* our own arrow replaces the small browser triangle */
  }
  .why summary::-webkit-details-marker {
    display: none;
  }
  .why-icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: var(--r-sm);
    background: var(--c-bg);
    color: var(--c-info);
  }
  .why-text {
    flex: 1;
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .why-text small {
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  .why-open {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
    flex: none;
    padding: var(--s-1) var(--s-2) var(--s-1) var(--s-3);
    border-radius: var(--r-pill);
    background: var(--c-info);
    color: var(--c-bg);
    font-size: var(--t-xs);
    font-weight: 700;
    transition: background var(--ease);
  }
  .why summary:hover .why-open {
    background: var(--c-text);
  }
  .why-open :global(svg) {
    transition: transform var(--ease);
  }
  .why[open] .why-open :global(svg) {
    transform: rotate(180deg);
  }
  .open-label,
  .why[open] .closed-label {
    display: none;
  }
  .why[open] .open-label {
    display: inline;
  }
  .perms {
    padding: 0 var(--s-3);
    font-size: var(--t-sm);
  }
  .perms li {
    display: flex;
    gap: var(--s-2);
    align-items: flex-start;
  }
  .perms :global(svg) {
    flex: none;
    margin-top: 1px;
    color: var(--c-info);
  }
  .why > .small {
    margin: var(--s-3);
  }
  .small {
    font-size: var(--t-xs);
    color: var(--c-text-muted);
    margin-top: var(--s-2);
  }
  .form,
  .field {
    display: grid;
    gap: var(--s-2);
  }
  .form {
    gap: var(--s-4);
  }
  label[for],
  .label {
    font-size: var(--t-sm);
    font-weight: 600;
  }
  select {
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background-color: var(--c-bg);
  }
  .end {
    display: flex;
    justify-content: center;
    padding-top: var(--s-2);
  }
  footer {
    display: flex;
    justify-content: space-between;
  }
</style>
