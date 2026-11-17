<script lang="ts">
  import Icon from './Icon.svelte';

  let {
    value = $bindable(),
    options,
    name,
    legend,
  }: {
    value: string;
    options: { value: string; label: string; icon?: string }[];
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
        {#if o.icon}<Icon name={o.icon} />{/if}
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
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: var(--s-1);
    padding: var(--s-1);
    border-radius: var(--r-pill);
    background: var(--fill);
    border: 1px solid var(--glass-border);
  }
  label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: calc(var(--tap) - 4px);
    padding: var(--s-1) var(--s-2);
    border-radius: var(--r-pill);
    font-size: var(--t-sm);
    font-weight: 600;
    color: var(--c-text-muted);
    cursor: pointer;
    transition: background var(--ease), color var(--ease);
  }
  label:hover:not(.on) {
    color: var(--c-text);
  }
  label.on {
    background: var(--fill-strong);
    color: var(--c-text);
    box-shadow: var(--shadow), inset 0 1px 0 rgb(255 255 255 / 20%);
  }
  @media (forced-colors: active) {
    label.on {
      outline: 2px solid Highlight;
    }
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
