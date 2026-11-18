<script lang="ts">
  // Screen 1: the toolbar popup. Normal or Webcam, quality and sound, then Start recording opens the small Reclux
  // window, where the browser asks what to share (a tab, a window or the screen) and the countdown runs.
  // Recording cannot start in this popup: it closes as soon as the browser's share window takes the focus.
  import Button from '../../lib/Button.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Logo from '../../lib/Logo.svelte';
  import PageFeatures from '../../lib/PageFeatures.svelte';
  import QualityPicker from '../../lib/QualityPicker.svelte';
  import Toggle from '../../lib/Toggle.svelte';
  import { loadSettings, saveSettings, suggestedPreset, systemAudioWorks } from '../../lib/settings';
  import { findUnsaved } from '../../lib/store';
  import { openRecorder } from '../../lib/window';

  const s = $state(loadSettings());
  void suggestedPreset().then((id) => id && (s.presetId = id)); // before the first save below
  $effect(() => saveSettings({ ...s }));

  // The new flow skips the recorder's start page, which is where a lost recording is offered back, so say it here.
  let unsaved = $state(0);
  void findUnsaved(false)
    .then((l) => (unsaved = l.length))
    .catch(() => {});

  const start = () => void openRecorder().then(() => window.close());
  const recover = () => void browser.tabs.create({ url: browser.runtime.getURL('/recorder.html') }).then(() => window.close());
</script>

<main>
  <header><Logo height={20} /></header>
  <h1>What are you recording today?</h1>
  <!-- The heading asks the question; the group's hidden label is different words, so nothing is read twice. -->
  <PageFeatures bind:camera={s.camera} legend="Recording type" hideLegend />
  <div class="pair"><QualityPicker name="popup" bind:value={s.presetId} /></div>
  <div class="audio">
    <Toggle icon="mic" label="Microphone" bind:checked={s.mic} />
    {#if systemAudioWorks}<Toggle icon="speaker" label="System audio" bind:checked={s.system} />{/if}
  </div>
  {#if unsaved}
    <button class="recover" onclick={recover}><Icon name="warn" size={16} /> A recording was never saved. Recover it</button>
  {/if}
  <div class="end">
    <Button variant="primary" size="lg" icon="record" block onclick={start}>Start recording</Button>
    <p class="offline"><Icon name="shield" size={14} /> Works offline · Saved on this device</p>
  </div>
</main>

<style>
  /* One fixed size in every browser (Issue 2). Each browser sizes its popup to the page, so a page that grows
     with its content (fonts, a hidden switch in Firefox) gave a different size in each. 600 px is the browsers' limit. */
  :global(html),
  :global(body),
  :global(#app) {
    width: 360px;
    height: 560px;
    min-height: 0;
    margin: 0;
    overflow: hidden;
    /* The browser draws the popup's outer frame and its corners; the page only fills it. */
    background: transparent;
  }
  main {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    height: 100%;
    padding: var(--s-4) var(--s-5);
    /* 8 px corners on our card. The browser's own frame around it keeps the browser's corners. */
    border-radius: 8px;
    background: var(--backdrop);
  }
  h1 {
    font-size: var(--t-lg);
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.25;
  }
  /* Quality and FPS side by side. */
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
  }
  .audio {
    display: grid;
    gap: var(--s-2);
  }
  .recover {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 36px;
    padding: 0 var(--s-3);
    border: 1px solid var(--glass-border);
    border-radius: var(--r-pill);
    background: var(--c-warn-bg);
    color: var(--c-warn);
    font-size: var(--t-xs);
    font-weight: 600;
    cursor: pointer;
  }
  /* Start recording always sits at the bottom, so it does not move when a line above appears. */
  .end {
    display: grid;
    gap: var(--s-3);
    margin-top: auto;
  }
  .offline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
</style>
