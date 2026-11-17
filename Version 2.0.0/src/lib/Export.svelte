<script lang="ts">
  // Screen 5: the final video on the left, its details on the right.
  // "Export video" opens the browser's Save As window, so any folder or drive works (Downloads, D:, E:…).
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

  <aside class="details">
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
      <Banner kind="error" title="Something went wrong">{session.error}</Banner>
    {/if}

    <div class="actions">
      <Button variant="primary" size="lg" icon="download" onclick={save} disabled={session.exporting}>
        {session.saved ? 'Export again' : 'Export video'}
      </Button>
      <Button variant="danger" size="lg" icon="trash" onclick={() => (ask = 'delete')} disabled={session.exporting}>Delete video</Button>
    </div>
    <div class="more">
      <Button variant="ghost" icon="edit" onclick={onback} disabled={session.exporting}>Back to editing</Button>
      <Button
        variant="ghost"
        icon="record"
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
    <Button onclick={() => (ask = '')}>Cancel</Button>
    <Button variant="primary" icon="trash" onclick={() => { ask = ''; reset(); }}>
      {ask === 'delete' ? 'Delete video' : 'Delete and start new'}
    </Button>
  {/snippet}
</Modal>

<style>
  .export {
    display: grid;
    gap: var(--s-5);
    align-items: start;
    align-content: start;
  }
  .preview video {
    display: block;
    width: 100%;
    max-height: 72vh;
    border-radius: var(--r-lg);
    background: #000;
    box-shadow: var(--shadow);
  }
  .details {
    display: grid;
    gap: var(--s-4);
    padding: var(--s-5);
    border-radius: var(--r-xl);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
  }
  h2 {
    font-size: var(--t-lg);
    font-weight: 700;
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
    background: var(--c-bg);
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
  dl {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    gap: var(--s-3);
    margin: 0;
  }
  dl div {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-md);
    background: var(--c-surface-2);
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
    color: var(--c-ok);
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--s-2);
  }
  .more {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--s-2);
  }
  /* Desktop: video left, details right (as in the sketch). */
  @media (min-width: 900px) {
    .export {
      grid-template-columns: minmax(0, 1fr) 22rem;
    }
  }
</style>
