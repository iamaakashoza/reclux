<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    variant = 'neutral',
    icon,
    onclick,
    disabled = false,
    block = false,
    children,
  }: {
    variant?: 'primary' | 'neutral' | 'ghost';
    icon?: string;
    onclick?: () => void;
    disabled?: boolean;
    block?: boolean;
    children: Snippet;
  } = $props();
</script>

<button class={variant} class:block {onclick} {disabled}>
  {#if icon}<Icon name={icon} />{/if}
  {@render children()}
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    min-height: var(--tap);
    padding: 0 var(--s-4);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
    font-weight: 600;
    font-size: var(--t-sm);
    cursor: pointer;
    transition: background var(--ease), border-color var(--ease);
  }
  button:hover:not(:disabled) {
    background: var(--c-surface-2);
  }
  button:active:not(:disabled) {
    transform: translateY(1px);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .primary {
    background: var(--c-accent);
    border-color: var(--c-accent);
    color: var(--c-on-accent);
  }
  .primary:hover:not(:disabled) {
    background: var(--c-accent-hover);
  }
  .ghost {
    background: transparent;
    border-color: transparent;
    color: var(--c-text-muted);
  }
  .block {
    width: 100%;
    min-height: calc(var(--tap) + 4px);
    font-size: var(--t-md);
  }
</style>
