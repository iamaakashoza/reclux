<script lang="ts">
  // Screen 1: the toolbar popup. Quick choices, then the recorder page opens.
  // The popup closes when it loses focus, and screen sharing needs a click on a page, so recording starts there.
  // What to record (tab, window, screen) is asked by the browser itself at that moment.
  import Button from '../../lib/Button.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Logo from '../../lib/Logo.svelte';
  import PageFeatures from '../../lib/PageFeatures.svelte';
  import QualityPicker from '../../lib/QualityPicker.svelte';
  import Toggle from '../../lib/Toggle.svelte';
  import { loadSettings, saveSettings, suggestedPreset } from '../../lib/settings';

  const s = $state(loadSettings());
  void suggestedPreset().then((id) => id && (s.presetId = id)); // before the first save below
  $effect(() => saveSettings({ ...s }));

  const openRecorder = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/recorder.html') });
    window.close();
  };
</script>

<main>
  <header><Logo height={20} /></header>
  <h1>What are you recording today?</h1>
  <div class="pair"><QualityPicker name="popup" bind:value={s.presetId} /></div>
  <div class="audio">
    <Toggle icon="mic" label="Microphone" bind:checked={s.mic} />
    <Toggle icon="speaker" label="System audio" bind:checked={s.system} />
    <PageFeatures bind:camera={s.camera} bind:zoom={s.zoom} compact />
  </div>
  <Button variant="primary" size="lg" icon="record" block onclick={openRecorder}>Start recording</Button>
  <p class="offline"><Icon name="shield" size={14} /> Works offline · Saved on this device</p>
</main>

<style>
  main {
    display: grid;
    gap: var(--s-3);
    width: 22.5rem;
    padding: var(--s-4) var(--s-5) var(--s-4);
  }
  h1 {
    font-size: var(--t-lg);
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.25;
  }
  /* Quality and FPS side by side, so Start recording stays inside the browser's 600 px popup limit. */
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
  }
  .audio {
    display: grid;
    gap: var(--s-2);
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
