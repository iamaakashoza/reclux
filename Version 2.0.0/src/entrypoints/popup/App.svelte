<script lang="ts">
  // Screen 1: the toolbar popup. Normal or Webcam, quality and sound, then Start recording opens Reclux as a tab next
  // to the user's page, where the browser asks what to share and the countdown runs (report §41).
  // Recording cannot start in this popup: it closes as soon as the browser's share window takes the focus.
  import Button from '../../lib/Button.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Logo from '../../lib/Logo.svelte';
  import PageFeatures from '../../lib/PageFeatures.svelte';
  import QualityPicker from '../../lib/QualityPicker.svelte';
  import Toggle from '../../lib/Toggle.svelte';
  import { loadSettings, saveSettings, suggestedPreset, systemAudioWorks } from '../../lib/settings';
  import { findUnsaved } from '../../lib/store';
  import { BACKDROP, openRecorder } from '../../lib/window';

  const s = $state(loadSettings());
  void suggestedPreset().then((id) => id && (s.presetId = id)); // before the first save below
  $effect(() => saveSettings({ ...s }));

  // The new flow skips the recorder's start page, which is where a lost recording is offered back, so say it here.
  let unsaved = $state(0);
  void findUnsaved(false)
    .then((l) => (unsaved = l.length))
    .catch(() => {});

  let starting = false;
  const start = async () => {
    if (starting) return; // a double click opens one Reclux tab, not two
    starting = true;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    // A picture of the user's page, shown behind the share box and the countdown so Reclux looks see-through.
    // Allowed by opening this popup (activeTab). Browser pages cannot be pictured: then a plain background.
    const shot = await browser.tabs.captureVisibleTab({ format: 'jpeg', quality: 70 }).catch(() => '');
    try {
      localStorage.setItem(BACKDROP, shot);
    } catch {} // too big for storage: a plain background
    await openRecorder(tab);
    window.close();
  };
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
    <Button variant="primary" size="lg" icon="record" block onclick={() => void start()}>Start recording</Button>
    <p class="offline"><Icon name="shield" size={14} /> Works offline · Saved on this device</p>
  </div>
</main>

<style>
  /* 360 px wide, as tall as its contents: no empty space (owner's call, 19 Nov 2026).
     The browser draws the popup's frame and its corners. The page fills that frame edge to edge with no corners of
     its own, so there is never a second, square corner behind ours (the "square artifact", report §41). */
  :global(html),
  :global(body),
  :global(#app) {
    width: 360px;
    min-height: 0;
    margin: 0;
    overflow: hidden;
    background: var(--c-bg);
  }
  main {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-4) var(--s-5);
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
    border: 1px solid var(--c-warning-border);
    border-radius: var(--r-pill);
    background: var(--c-warning-bg);
    color: var(--c-warning);
    font-size: var(--t-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .end {
    display: grid;
    gap: var(--s-3);
    margin-top: var(--s-2);
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
