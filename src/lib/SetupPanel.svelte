<script lang="ts">
  import Banner from './Banner.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import Segmented from './Segmented.svelte';
  import Toggle from './Toggle.svelte';
  import { PRESETS, MAX_SECONDS, findPreset, fmtSize, sizeMB } from './presets';
  import { refreshDisk, session } from './session.svelte';

  let { onstart }: { onstart: () => void } = $props();

  const preset = $derived(findPreset(session.presetId));
  // Re-check the free space on load and whenever the quality changes.
  $effect(() => {
    void session.presetId;
    void refreshDisk();
  });
  const need = $derived(fmtSize(sizeMB(preset, MAX_SECONDS)));
  const SOURCES = [
    { value: 'tab', label: 'Tab', icon: 'tab' },
    { value: 'window', label: 'Window', icon: 'window' },
    { value: 'screen', label: 'Screen', icon: 'screen' },
  ];
</script>

<div class="panel">
  <Segmented legend="What to record" name="source" options={SOURCES} bind:value={session.source} />

  <div class="field">
    <label for="quality">Quality</label>
    <select id="quality" bind:value={session.presetId}>
      {#each PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
    </select>
    <p class="hint">
      About {fmtSize(sizeMB(preset, 60))} per minute · {need} for 2 hours
      {#if preset.fps >= 50}<br /><strong>Needs a fast computer.</strong>{/if}
    </p>
  </div>

  <div class="field">
    <label for="format">Format</label>
    <select id="format" bind:value={session.format}>
      <option value="mp4">MP4 (recommended)</option>
      <option value="webm">WebM</option>
    </select>
  </div>

  <div class="field">
    <span class="label">Audio</span>
    <Toggle icon="mic" label="Microphone" bind:checked={session.mic} />
    <Toggle icon="speaker" label="System audio" bind:checked={session.system} />
  </div>

  {#if session.lowDisk}
    <Banner kind="warn" title="Low disk space">
      {#if session.free !== null}Only {fmtSize(session.free / 1e6)} is free for recordings.{/if}
      2 hours at this quality could need about {need}. Free up space on the drive that holds your browser
      (usually C:) or lower the quality. When it is done, you can save the file to another drive like D: or E:.
      {#snippet actions()}
        <Button onclick={() => (session.presetId = '720p30')}>Lower quality</Button>
      {/snippet}
    </Banner>
  {/if}

  <Button variant="primary" icon="record" block onclick={onstart}>Start recording</Button>

  <p class="offline"><Icon name="shield" size={16} /> Works offline · Saved on this device</p>
</div>

<style>
  .panel {
    display: grid;
    gap: var(--s-4);
  }
  .field {
    display: grid;
    gap: var(--s-2);
  }
  label[for],
  .label {
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
  .hint {
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  .hint strong {
    color: var(--c-warn);
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
