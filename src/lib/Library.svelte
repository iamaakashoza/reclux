<script lang="ts">
  import Icon from './Icon.svelte';

  // Sample rows for the design only. Phase 4 reads the real list from IndexedDB.
  const ITEMS = [
    { name: 'Reclux 2026-10-27 16.20', meta: '12:48 · 1080p · 61 MB', fmt: 'MP4' },
    { name: 'Weekly demo', meta: '45:02 · 1080p · 270 MB', fmt: 'MP4' },
    { name: 'Bug report', meta: '02:10 · 720p · 8 MB', fmt: 'WebM' },
  ];
</script>

<section aria-labelledby="lib-title">
  <h2 id="lib-title"><Icon name="folder" /> Recordings</h2>
  <ul>
    {#each ITEMS as it (it.name)}
      <li>
        <div class="thumb"><Icon name="play" size={18} /></div>
        <div class="info">
          <strong>{it.name}</strong>
          <span>{it.meta}</span>
        </div>
        <span class="badge">{it.fmt}</span>
      </li>
    {/each}
  </ul>
</section>

<style>
  h2 {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin-bottom: var(--s-3);
    font-size: var(--t-md);
  }
  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--s-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-height: calc(var(--tap) + 16px);
    padding: var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
  }
  .thumb {
    display: grid;
    place-items: center;
    flex: none;
    width: 56px;
    aspect-ratio: 16 / 9;
    border-radius: var(--r-sm);
    background: var(--c-surface-2);
    color: var(--c-text-muted);
  }
  .info {
    display: grid;
    min-width: 0;
    flex: 1;
    font-size: var(--t-sm);
  }
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .info span {
    font-size: var(--t-xs);
    color: var(--c-text-muted);
  }
  .badge {
    padding: 2px var(--s-2);
    border-radius: var(--r-sm);
    background: var(--c-surface-2);
    font-size: var(--t-xs);
    font-weight: 700;
  }
</style>
