<script lang="ts">
  import type { Snippet } from 'svelte';

  // A glass sheet over a dimmed page. Built on <dialog>, which already traps focus, closes on Esc
  // and tells screen readers it is a dialog. Used instead of the browser's confirm() boxes.
  let {
    open = $bindable(false),
    title,
    children,
    actions,
  }: { open?: boolean; title: string; children: Snippet; actions: Snippet } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<dialog bind:this={dialog} class="glass" aria-labelledby="modal-title" onclose={() => (open = false)}>
  <h2 id="modal-title">{title}</h2>
  <div class="body">{@render children()}</div>
  <div class="actions">{@render actions()}</div>
</dialog>

<style>
  dialog {
    width: min(30rem, calc(100vw - 2 * var(--s-4)));
    padding: var(--s-5);
    border-radius: var(--r-xl);
    color: var(--c-text);
  }
  dialog[open] {
    display: grid;
    gap: var(--s-4);
    animation: rise 180ms ease-out;
  }
  /* The dimming layer. No blur here: one blur per modal (the sheet). */
  dialog::backdrop {
    background: rgb(5 7 10 / 55%);
  }
  h2 {
    font-size: var(--t-lg);
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .body {
    display: grid;
    gap: var(--s-2);
    color: var(--c-text-muted);
    font-size: var(--t-sm);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--s-2);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
  }
</style>
