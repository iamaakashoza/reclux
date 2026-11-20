<script lang="ts">
  // Alerts, one look per meaning (owner's call, 20 Nov 2026): Danger red (something failed), Warning yellow (needs
  // your attention), Success green (done), Info blue (good to know). Colours come from the status tokens.
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    kind = 'info',
    title,
    children,
    actions,
  }: {
    kind?: 'danger' | 'warning' | 'success' | 'info';
    title: string;
    children?: Snippet;
    actions?: Snippet;
  } = $props();
  const ICON = { danger: 'danger', warning: 'warn', success: 'success', info: 'info' } as const;
</script>

<div class="banner {kind}" role={kind === 'danger' ? 'alert' : 'status'}>
  <span class="icon"><Icon name={ICON[kind]} /></span>
  <div class="body">
    <strong>{title}</strong>
    {#if children}<p>{@render children()}</p>{/if}
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </div>
</div>

<style>
  .banner {
    --fg: var(--c-info);
    --ic: var(--c-info-icon);
    display: flex;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    border-radius: var(--r-lg);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--fg);
    font-size: var(--t-sm);
  }
  .info {
    --fg: var(--c-info);
    --ic: var(--c-info-icon);
    --bg: var(--c-info-bg);
    --line: var(--c-info-border);
  }
  .warning {
    --fg: var(--c-warning);
    --ic: var(--c-warning-icon);
    --bg: var(--c-warning-bg);
    --line: var(--c-warning-border);
  }
  .danger {
    --fg: var(--c-danger);
    --ic: var(--c-danger-icon);
    --bg: var(--c-danger-bg);
    --line: var(--c-danger-border);
  }
  .success {
    --fg: var(--c-success);
    --ic: var(--c-success-icon);
    --bg: var(--c-success-bg);
    --line: var(--c-success-border);
  }
  .icon {
    display: flex;
    flex: none;
    margin-top: 1px;
    color: var(--ic);
  }
  .body {
    display: grid;
    gap: var(--s-1);
    min-width: 0;
  }
  strong {
    font-weight: 700;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    margin-top: var(--s-2);
  }
  @media (forced-colors: active) {
    .banner {
      border-color: CanvasText;
    }
  }
</style>
