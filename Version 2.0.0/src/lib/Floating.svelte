<script lang="ts">
  // The recording controls: the bar, and the webcam circle when no web page on screen can show it (no page access,
  // or a page no extension may touch: browser pages, PDFs, Opera's search results).
  // Shown in the small controls window and in the always-on-top window (the pin).
  import Icon from './Icon.svelte';
  import RecordingBar from './RecordingBar.svelte';
  import { session } from './session.svelte';

  let video: HTMLVideoElement | undefined = $state();
  $effect(() => {
    if (video) video.srcObject = session.camVisible ? (session.cameraStream ?? null) : null;
  });
</script>

<div class="float">
  {#if session.camVisible && session.cameraStream && (!session.pageAccess || !session.onPage)}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} class="cam" autoplay muted playsinline aria-label="Your webcam"></video>
  {/if}
  <RecordingBar />
  {#if session.camera && session.cameraError}
    <p class="camerr" role="status"><Icon name="camera" size={16} /> {session.cameraError}</p>
  {/if}
</div>

<style>
  /* Only the always-on-top window's own page (this sits right in its body). */
  :global(body:has(> .float)) {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: var(--backdrop);
  }
  :global(html:has(> body > .float)) {
    overflow: hidden; /* sized to the controls: never scrollbars */
  }
  .camerr {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    max-width: 30rem;
    font-size: var(--t-xs);
    font-weight: 600;
    color: var(--c-danger);
  }
  .float {
    display: grid;
    justify-items: center;
    gap: var(--s-3);
    padding: var(--s-2);
  }
  .cam {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    object-fit: cover;
    transform: scaleX(-1);
    border: 3px solid var(--off-white);
    box-shadow: var(--shadow);
    background: var(--black);
  }
</style>
