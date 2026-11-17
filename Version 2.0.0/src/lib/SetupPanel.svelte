<script lang="ts">
  import Banner from './Banner.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import QualityPicker from './QualityPicker.svelte';
  import Toggle from './Toggle.svelte';
  import { MAX_SECONDS, findPreset, fmtSize, presetId, sizeMB } from './presets';
  import { refreshDisk, session } from './session.svelte';

  let { onstart }: { onstart: () => void } = $props();

  const preset = $derived(findPreset(session.presetId));
  // Re-check the free space on load and whenever the quality changes.
  $effect(() => {
    void session.presetId;
    void refreshDisk();
  });
  const need = $derived(fmtSize(sizeMB(preset, MAX_SECONDS)));
</script>

<div class="panel">
  <QualityPicker name="setup" bind:value={session.presetId} />
  <p class="hint">About {fmtSize(sizeMB(preset, 60))} per minute · {need} for 2 hours</p>

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
    <Toggle
      icon="speaker"
      label="System audio"
      hint={session.system ? 'Your browser asks too. Keep its audio switch on.' : undefined}
      bind:checked={session.system}
    />
  </div>

  {#if session.lowDisk}
    <Banner kind="warn" title="Low disk space">
      {#if session.free !== null}Only {fmtSize(session.free / 1e6)} is free for recordings.{/if}
      2 hours at this quality could need about {need}. Free up space on the drive that holds your browser
      (usually C:) or lower the quality. When it is done, you can save the file to another drive like D: or E:.
      {#snippet actions()}
        <Button onclick={() => (session.presetId = presetId(720, preset.fps))}>Lower quality</Button>
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
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background-color: var(--c-surface);
  }
  .hint {
    font-size: var(--t-xs);
    color: var(--c-text-muted);
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
