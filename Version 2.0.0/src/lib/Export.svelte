<script lang="ts">
  // Screen 5: the final video on the left (70%), its details on the right (30%), edge to edge (owner's call,
  // 19 Nov 2026). "Export video" opens the browser's Save As window, so any folder or drive works (Downloads, D:, E:…).
  import Banner from './Banner.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import Modal from './Modal.svelte';
  import { findPreset, fmtClock, fmtSize } from './presets';
  import { reset, save, session } from './session.svelte';

  let { onback }: { onback: () => void } = $props();

  const p = $derived(findPreset(session.presetId));
  let ask = $state<'' | 'delete' | 'new'>('');
</script>

<section class="export" aria-label="Export video">
  <div class="preview">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video src={session.url} controls preload="metadata"></video>
  </div>

  <aside class="details glass">
    <h2>Export video</h2>

    <label class="field">
      <span>File name</span>
      <span class="name">
        <input bind:value={session.name} spellcheck="false" disabled={session.exporting} />
        <span class="ext">.{session.ext}</span>
      </span>
    </label>

    <dl>
      <div><dt>Format</dt><dd>{session.ext.toUpperCase()}</dd></div>
      <div><dt>Quality</dt><dd>{p.height}p</dd></div>
      <div><dt>FPS</dt><dd>{p.fps}</dd></div>
      <div><dt>Length</dt><dd>{fmtClock(session.elapsed)}</dd></div>
      <div><dt>Size</dt><dd>{fmtSize(session.bytes / 1e6)}</dd></div>
    </dl>

    {#if session.saved}
      <p class="ok" role="status"><Icon name="check" /> Exported to your computer</p>
    {:else if session.exporting}
      <p class="busy" role="status">Exporting… keep this tab open until it finishes.</p>
    {:else}
      <p class="hint">You choose the folder next: Downloads, or another drive like D: or E:.</p>
    {/if}

    {#if session.error}
      <Banner kind="danger" title="Something went wrong">{session.error}</Banner>
    {/if}

    <div class="actions">
      <Button variant="primary" size="lg" icon="download" onclick={save} disabled={session.exporting}>
        {session.saved ? 'Export again' : 'Export video'}
      </Button>
      <Button variant="secondary" size="lg" icon="trash" onclick={() => (ask = 'delete')} disabled={session.exporting}>Delete video</Button>
    </div>
    <div class="more">
      <Button variant="ghost" icon="edit" onclick={onback} disabled={session.exporting}>Back to editing</Button>
      <Button
        variant="ghost"
        icon="plus"
        onclick={() => (session.saved ? reset() : (ask = 'new'))}
        disabled={session.exporting}>New recording</Button
      >
    </div>
  </aside>
</section>

<Modal
  bind:open={() => ask !== '', (v) => !v && (ask = '')}
  title={ask === 'delete' ? 'Delete this video?' : 'Start a new recording?'}
>
  {#if session.saved}
    <p>• It is removed from Reclux. The copy you exported stays on your computer.</p>
  {:else}
    <p>• This video has not been exported yet, so it will be gone for good.</p>
    <p>• This can’t be undone.</p>
  {/if}
  {#snippet actions()}
    <Button variant="secondary" onclick={() => (ask = '')}>Cancel</Button>
    <Button variant="primary" icon="trash" onclick={() => { ask = ''; reset(); }}>
      {ask === 'delete' ? 'Delete video' : 'Delete and start new'}
    </Button>
  {/snippet}
</Modal>

<style>
  /* 70 / 30, full width and height, no gap between the two (owner's call). */
  .export {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(19rem, 3fr);
    height: 100%;
    min-height: 0;
  }
  /* The video fills its side and stays centred, at its own shape. */
  .preview {
    display: grid;
    place-items: center;
    min-height: 0;
    padding: var(--s-5);
  }
  .preview video {
    display: block;
    width: 100%;
    max-height: 100%;
    border-radius: var(--r-md);
    background: var(--black);
    box-shadow: var(--shadow);
  }
  /* See-through glass panel, reaching the window's edge. Every line starts at the same left edge as the heading. */
  .details {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
    min-height: 0;
    overflow-y: auto;
    padding: var(--s-5);
    border-width: 0 0 0 1px;
    border-radius: 0;
  }
  h2 {
    font-size: var(--t-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .field {
    display: grid;
    gap: var(--s-2);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .name {
    display: flex;
    align-items: center;
    min-height: var(--tap);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
  }
  .name:focus-within {
    outline: 3px solid var(--c-focus);
    outline-offset: 1px;
  }
  input {
    flex: 1;
    min-width: 0;
    height: var(--tap);
    padding: 0 0 0 var(--s-3);
    border: 0;
    background: none;
    outline: none;
    font-weight: 500;
  }
  .ext {
    padding: 0 var(--s-3);
    color: var(--c-text-muted);
    font-weight: 500;
  }
  /* Format · Quality · FPS on one row, Length · Size on the next: no tile left on its own. */
  dl {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--s-2);
    margin: 0;
  }
  dl div {
    grid-column: span 2;
  }
  dl div:nth-child(n + 4) {
    grid-column: span 3;
  }
  dl div {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-md);
    background: var(--fill);
  }
  dt {
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  dd {
    margin: 0;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .hint,
  .busy {
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  .ok {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    font-weight: 600;
    color: var(--c-success);
  }
  .actions {
    display: grid;
    gap: var(--s-2);
  }
  /* Back to editing · New recording: one row, at the bottom of the panel. */
  .more {
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    gap: var(--s-2);
    margin-top: auto;
    padding-top: var(--s-3);
    border-top: 1px solid var(--c-border);
  }
  .more :global(button) {
    padding: 0 var(--s-2);
  }
  /* Narrow windows: video above, details below. */
  @media (max-width: 900px) {
    .export {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
      height: auto;
    }
    .details {
      border-width: 1px 0 0;
    }
  }
</style>
