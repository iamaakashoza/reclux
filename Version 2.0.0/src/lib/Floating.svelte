<script lang="ts">
  // Contents of the floating window: the recording bar, and the webcam circle when web pages are not allowed.
  import RecordingBar from './RecordingBar.svelte';
  import { session } from './session.svelte';

  let video: HTMLVideoElement | undefined = $state();
  $effect(() => {
    if (video) video.srcObject = session.camera && session.camVisible ? (session.cameraStream ?? null) : null;
  });
</script>

<div class="float">
  {#if session.camera && session.camVisible && session.cameraStream}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} class="cam" autoplay muted playsinline aria-label="Your webcam"></video>
  {/if}
  <RecordingBar />
</div>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    overflow: hidden;
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
    border: 3px solid rgb(255 255 255 / 85%);
    box-shadow: var(--shadow);
    background: #0e1116;
  }
</style>
