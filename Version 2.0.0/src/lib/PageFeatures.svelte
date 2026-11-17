<script lang="ts">
  // Webcam circle and Cursor zoom switches. Both show things on web pages, so turning one on asks the
  // browser for page access (once). Without it: the circle shows in the floating window, cursor zoom is off.
  import Button from './Button.svelte';
  import Toggle from './Toggle.svelte';
  import { askPageAccess, hasPageAccess } from './overlay';

  let { camera = $bindable(), zoom = $bindable(), compact = false }: { camera: boolean; zoom: boolean; compact?: boolean } = $props();

  let access = $state(true);
  void hasPageAccess().then((a) => (access = a));
  // Straight from the click: the browser only shows its question then.
  const ask = async () => (access = await askPageAccess());
  const turned = (on: boolean) => on && !access && void ask();
</script>

<Toggle icon="camera" label="Webcam" hint={compact ? undefined : 'A circle you can drag, recorded with the screen'} bind:checked={camera} onchange={turned} />
<Toggle icon="zoom" label="Cursor zoom" hint={compact ? undefined : 'Zooms where you work on web pages'} bind:checked={zoom} onchange={turned} />
{#if (camera || zoom) && !access}
  <p class="need">
    {compact ? 'Needs access to web pages. Nothing is collected or sent.' : 'Reclux needs access to web pages to show the circle and follow your cursor. Nothing is collected or sent.'}
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
