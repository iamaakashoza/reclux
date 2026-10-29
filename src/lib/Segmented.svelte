<script lang="ts">
  import Icon from './Icon.svelte';

  let {
    value = $bindable(),
    options,
    name,
    legend,
  }: {
    value: string;
    options: { value: string; label: string; icon: string }[];
    name: string;
    legend: string;
  } = $props();
</script>

<fieldset>
  <legend>{legend}</legend>
  <div class="row">
    {#each options as o (o.value)}
      <label class:on={value === o.value}>
        <input type="radio" {name} value={o.value} bind:group={value} />
        <Icon name={o.icon} />
        <span>{o.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: var(--s-2);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--s-1);
    padding: var(--s-1);
    border-radius: var(--r-md);
    background: var(--c-surface-2);
  }
  label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: var(--tap);
    padding: var(--s-2);
    border-radius: var(--r-sm);
    font-size: var(--t-xs);
    font-weight: 600;
    color: var(--c-text-muted);
    cursor: pointer;
    transition: background var(--ease), color var(--ease);
  }
  label.on {
    background: var(--c-bg);
    color: var(--c-text);
    box-shadow: var(--shadow);
  }
  label:has(input:focus-visible) {
    outline: 3px solid var(--c-focus);
    outline-offset: 1px;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
</style>
