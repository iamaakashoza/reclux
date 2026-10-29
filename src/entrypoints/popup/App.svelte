<script lang="ts">
  import Button from '../../lib/Button.svelte';
  import Icon from '../../lib/Icon.svelte';
  import Segmented from '../../lib/Segmented.svelte';
  import Toggle from '../../lib/Toggle.svelte';
  import { PRESETS } from '../../lib/presets';
  import { loadSettings, saveSettings } from '../../lib/settings';

  // Quick options. They are saved, and the recorder page picks them up.
  // The popup closes when it loses focus, and screen sharing needs a click on a page, so Start happens there.
  const s = $state(loadSettings());
  $effect(() => saveSettings({ ...s }));

  const SOURCES = [
    { value: 'tab', label: 'Tab', icon: 'tab' },
    { value: 'window', label: 'Window', icon: 'window' },
    { value: 'screen', label: 'Screen', icon: 'screen' },
  ];

  const openRecorder = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/recorder.html') });
    window.close();
  };
</script>

<main>
  <h1><span class="logo"></span> Reclux</h1>
  <Segmented legend="What to record" name="source" options={SOURCES} bind:value={s.source} />
  <div class="field">
    <label for="quality">Quality</label>
    <select id="quality" bind:value={s.presetId}>
      {#each PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
    </select>
  </div>
  <div class="field">
    <Toggle icon="mic" label="Microphone" bind:checked={s.mic} />
    <Toggle icon="speaker" label="System audio" bind:checked={s.system} />
  </div>
  <Button variant="primary" icon="record" block onclick={openRecorder}>Open recorder</Button>
  <p class="offline"><Icon name="shield" size={16} /> Works offline · Saved on this device</p>
</main>

<style>
  main {
    display: grid;
    gap: var(--s-3);
    width: 20rem;
    padding: var(--s-4);
  }
  h1 {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    font-size: var(--t-lg);
    font-weight: 800;
  }
  .logo {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-accent);
  }
  .field {
    display: grid;
    gap: var(--s-2);
  }
  label {
    font-size: var(--t-sm);
    font-weight: 600;
  }
  select {
    min-height: var(--tap);
    padding: 0 var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
    cursor: pointer;
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
