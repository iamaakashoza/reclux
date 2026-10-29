<script lang="ts">
  import Icon from './Icon.svelte';

  let {
    checked = $bindable(false),
    label,
    icon,
    hint,
    disabled = false,
  }: { checked?: boolean; label: string; icon: string; hint?: string; disabled?: boolean } = $props();
</script>

<label class:disabled>
  <span class="text">
    <Icon name={icon} />
    <span>
      <span class="label">{label}</span>
      {#if hint}<small>{hint}</small>{/if}
    </span>
  </span>
  <input type="checkbox" role="switch" bind:checked {disabled} />
</label>

<style>
  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    min-height: var(--tap);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
    cursor: pointer;
  }
  .disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .text {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  small {
    display: block;
    font-weight: 400;
    color: var(--c-text-muted);
    font-size: var(--t-xs);
  }
  input {
    appearance: none;
    flex: none;
    position: relative;
    width: 44px;
    height: 26px;
    margin: 0;
    border-radius: var(--r-pill);
    background: var(--c-border);
    transition: background var(--ease);
    cursor: inherit;
  }
  input::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 30%);
    transition: transform var(--ease);
  }
  input:checked {
    background: var(--c-accent);
  }
  input:checked::before {
    transform: translateX(18px);
  }
</style>
