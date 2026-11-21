<script lang="ts">
  // Two simple choices, as in the V2 sketch: Quality (720p / 1080p) and FPS (50 / 60).
  import Segmented from './Segmented.svelte';
  import { findPreset, presetId } from './presets';
  import { hardware1080 } from './settings';

  let { value = $bindable(), name }: { value: string; name: string } = $props();

  const p = $derived(findPreset(value));
  const QUALITY = [
    { value: '720', label: '720p' },
    { value: '1080', label: '1080p' },
  ];
  const FPS = [
    { value: '50', label: '50 fps' },
    { value: '60', label: '60 fps' },
  ];
  // 1080p stays selectable everywhere, with a word of warning where only software encoding is possible (owner's
  // call, 21 Nov 2026; Firefox here: 46 fps at 1080p60, report §45). Never shown where a hardware encoder exists.
  let software = $state(false);
  $effect(() => {
    const fps = p.fps;
    void hardware1080(fps).then((yes) => (software = !yes));
  });
</script>

<Segmented
  legend="Quality"
  name="{name}-quality"
  options={QUALITY}
  bind:value={() => String(p.height), (h) => (value = presetId(+h, p.fps))}
/>
<Segmented
  legend="FPS"
  name="{name}-fps"
  options={FPS}
  bind:value={() => String(p.fps), (f) => (value = presetId(p.height, +f))}
/>
{#if p.height === 1080 && software}
  <p class="note" role="status">This computer has no hardware video encoder, so 1080p may skip frames. 720p is smoother.</p>
{/if}

<style>
  .note {
    grid-column: 1 / -1; /* under both choices, where they sit side by side */
    margin: 0;
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
</style>
