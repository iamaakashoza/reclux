<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    kind = 'info',
    title,
    children,
    actions,
  }: {
    kind?: 'info' | 'warn' | 'error';
    title: string;
    children?: Snippet;
    actions?: Snippet;
  } = $props();
</script>

<div class="banner {kind}" role={kind === 'error' ? 'alert' : 'status'}>
  <Icon name={kind === 'info' ? 'info' : 'warn'} />
  <div class="body">
    <strong>{title}</strong>
    {#if children}<p>{@render children()}</p>{/if}
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </div>
</div>

<style>
  .banner {
    display: flex;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    border-radius: var(--r-md);
    font-size: var(--t-sm);
  }
  .banner > :global(svg) {
    flex: none;
    margin-top: 2px;
  }
  .body {
    display: grid;
    gap: var(--s-1);
    min-width: 0;
  }
  p {
    color: inherit;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    margin-top: var(--s-2);
  }
  .info {
    background: var(--c-info-bg);
    color: var(--c-info);
  }
  .warn {
    background: var(--c-warn-bg);
    color: var(--c-warn);
  }
  .error {
    background: var(--c-error-bg);
    color: var(--c-error);
  }
</style>
