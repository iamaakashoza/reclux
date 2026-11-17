<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  // Capsule buttons. Buttons sit on glass as plain fills (never glass on glass).
  // primary = the one tinted action per view (Record, Stop, Export). Icon-only buttons need `label`.
  let {
    variant = 'neutral',
    icon,
    label,
    onclick,
    disabled = false,
    block = false,
    size = 'md',
    children,
  }: {
    variant?: 'primary' | 'neutral' | 'ghost' | 'danger';
    icon?: string;
    label?: string;
    onclick?: (e: MouseEvent) => void;
    disabled?: boolean;
    block?: boolean;
    size?: 'md' | 'lg';
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
    box-shadow: 0 6px 18px rgb(215 38 61 / 30%), inset 0 1px 0 rgb(255 255 255 / 25%);
  }
  .primary:hover:not(:disabled) {
    background: var(--c-accent-hover);
  }
  .ghost {
    background: transparent;
    color: var(--c-text-muted);
  }
  .danger {
    color: var(--c-accent-text);
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
