<script lang="ts">
  // "What are you recording?": Normal (screen only) or Webcam (screen + the webcam circle).
  // The circle is shown on web pages, so picking Webcam asks the browser for page access (once). That access also
  // turns on cursor zoom. Without it, the circle shows in the Reclux window instead.
  import Button from './Button.svelte';
  import Segmented from './Segmented.svelte';
  import { askPageAccess, hasPageAccess } from './overlay';

  let { camera = $bindable(), legend, hideLegend = false }: { camera: boolean; legend: string; hideLegend?: boolean } = $props();

  let access = $state(true);
  void hasPageAccess().then((a) => (access = a));
  // Straight from the click: the browser only shows its question then.
  const ask = async () => (access = await askPageAccess());
  const KINDS = [
    { value: 'normal', label: 'Normal' },
    { value: 'webcam', label: 'Webcam' },
  ];
</script>

<Segmented
  {legend}
  {hideLegend}
  name="kind"
  options={KINDS}
  bind:value={
    () => (camera ? 'webcam' : 'normal'),
    (v) => {
      camera = v === 'webcam';
      if (camera && !access) void ask();
    }
  }
/>
{#if camera && !access}
  <p class="need">
    The circle needs access to web pages. Nothing is sent.
    <Button variant="ghost" onclick={ask}>Allow</Button>
  </p>
{/if}

<style>
  .need {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-1) var(--s-2);
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  .need :global(button) {
    min-height: 32px;
    padding: 0 var(--s-3);
    color: var(--c-text);
    background: var(--fill);
  }
</style>
