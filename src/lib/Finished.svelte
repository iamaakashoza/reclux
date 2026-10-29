<script lang="ts">
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import { findPreset, fmtSize, fmtTime } from './presets';
  import { reset, save, session } from './session.svelte';

  const preset = $derived(findPreset(session.presetId));
  let renaming = $state(false);
  let nameEl: HTMLInputElement | undefined = $state();
  $effect(() => {
    if (renaming) nameEl?.select();
  });

  // The recording lives only in memory until saved, so ask before throwing it away.
  const leave = (question: string) => {
    if (session.url && !session.saved && !confirm(question)) return;
    reset();
  };
</script>

<section class="done" aria-label="Recording ready">
  <p class="ok"><Icon name="check" /> {session.saved ? 'Saved to your computer' : 'Recording ready. Not saved yet.'}</p>
  {#if session.url}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video class="video" src={session.url} controls></video>
  {:else}
    <div class="video"><Icon name="play" size={40} /></div>
  {/if}
  <div class="meta">
    {#if renaming}
      <input
        bind:this={nameEl}
        bind:value={session.name}
        aria-label="File name"
        onblur={() => (renaming = false)}
        onkeydown={(e) => e.key === 'Enter' && (renaming = false)}
      />
    {:else}
      <h2>{session.name || 'Reclux recording'}</h2>
    {/if}
    <p>
      {#if session.elapsed}{fmtTime(session.elapsed)} · {/if}{session.actual || preset.label} · {fmtSize(session.bytes / 1e6)} · {session.ext.toUpperCase()}
    </p>
  </div>
  <div class="actions">
    <Button variant="primary" icon="download" onclick={save} disabled={!session.url}>
      {session.saved ? 'Save again' : 'Save file'}
    </Button>
    <Button icon="trash" onclick={() => leave('Discard this recording? It has not been saved.')}>Discard</Button>
    <Button icon="edit" onclick={() => (renaming = true)}>Rename</Button>
    <Button icon="record" onclick={() => leave('This recording has not been saved. Record again and lose it?')}>
      Record again
    </Button>
  </div>
  <p class="tip">Tip: “Save file” opens a window where you can pick any folder or drive, such as D: or E:.</p>
</section>

<style>
  .done {
    display: grid;
    gap: var(--s-4);
  }
  .ok {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    font-weight: 700;
    color: var(--c-ok);
  }
  .video {
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: var(--r-lg);
    background: var(--c-surface-2);
    color: var(--c-text-muted);
  }
  h2 {
    font-size: var(--t-lg);
  }
  input {
    width: 100%;
    min-height: var(--tap);
    padding: 0 var(--s-3);
    border: 1px solid var(--c-focus);
    border-radius: var(--r-md);
    background: var(--c-bg);
    font-size: var(--t-lg);
    font-weight: 700;
  }
  .meta p,
  .tip {
    font-size: var(--t-sm);
    color: var(--c-text-muted);
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--s-3);
  }
</style>
