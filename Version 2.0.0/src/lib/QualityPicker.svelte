<script lang="ts">
  // Two simple choices, as in the V2 sketch: Quality (720p / 1080p) and FPS (50 / 60).
  import Segmented from './Segmented.svelte';
  import { findPreset, presetId } from './presets';

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
