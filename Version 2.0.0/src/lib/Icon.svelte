<script lang="ts">
  // One Lucide icon (see icons.ts). The shapes come from a fixed list in the code, so {@html} is safe here.
  import { iconShapes, isFilled } from './icons';

  let { name, size = 20 }: { name: string; size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={isFilled(name) ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {@html iconShapes(name)}
</svg>
