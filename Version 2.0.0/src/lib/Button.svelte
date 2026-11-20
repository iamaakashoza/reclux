<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  // Capsule buttons (owner's call, 20 Nov 2026):
  //  primary   = the one solid red action per view (Record, Save changes, Export)
  //  secondary = a red outline: the other actions next to it (Cancel, Delete video, Recover it)
  //  neutral   = a plain fill: tools (Undo, Split, Play, Zoom)
  //  ghost     = text only: quiet links (Back to editing)
  // Icon-only buttons need `label`.
  let {
    variant = 'neutral',
    icon,
    label,
    onclick,
    disabled = false,
    block = false,
    size = 'md',
    pressed,
    children,
  }: {
    variant?: 'primary' | 'secondary' | 'neutral' | 'ghost';
    icon?: string;
    label?: string;
    onclick?: (e: MouseEvent) => void;
    disabled?: boolean;
    block?: boolean;
    size?: 'md' | 'lg';
    /** A switch-like button (Trim): shown dark while on. */
    pressed?: boolean;
    children?: Snippet;
  } = $props();
</script>

<button
  type="button"
  class="{variant} {size}"
  class:block
  class:round={!children}
  aria-label={children ? undefined : label}
  title={label}
  aria-pressed={pressed}
  {onclick}
  {disabled}
>
  {#if icon}<Icon name={icon} size={size === 'lg' ? 22 : 20} />{/if}
  {#if children}{@render children()}{/if}
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    min-height: var(--tap);
    padding: 0 var(--s-4);
    border: 1px solid transparent;
    border-radius: var(--r-pill);
    background: var(--fill);
    font-weight: 600;
    font-size: var(--t-sm);
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--ease), transform var(--ease);
  }
  button:hover:not(:disabled) {
    background: var(--fill-hover);
  }
  button:active:not(:disabled) {
    transform: scale(0.97);
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .round {
    width: var(--tap);
    padding: 0;
    flex: none;
  }
  .lg {
    min-height: 52px;
    padding: 0 var(--s-5);
    font-size: var(--t-md);
  }
  .lg.round {
    width: 52px;
  }
  .primary {
    background: var(--c-accent);
    color: var(--c-on-accent);
    box-shadow: 0 4px 14px rgb(242 11 24 / 26%);
  }
  .primary:hover:not(:disabled) {
    background: var(--c-accent-hover);
  }
  [aria-pressed='true'],
  [aria-pressed='true']:hover:not(:disabled) {
    background: var(--c-text);
    color: var(--c-bg);
  }
  .ghost {
    background: transparent;
    color: var(--c-text-muted);
  }
  .secondary {
    border: 1.5px solid var(--c-accent);
    background: transparent;
    color: var(--c-accent-text);
  }
  .secondary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--c-accent) 8%, transparent);
  }
  .block {
    width: 100%;
  }
  @media (forced-colors: active) {
    button {
      border-color: ButtonText;
    }
  }
</style>
