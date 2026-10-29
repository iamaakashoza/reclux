import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  // The sources zip (needed by Firefox's add-on review) only needs the code, not our notes and store files.
  zip: { excludeSources: ['report.md', 'docs/**', 'store/**', 'spike/**'] },
  manifest: ({ browser }) => ({
    name: 'Reclux',
    // Oldest Chrome/Brave that has everything Reclux needs (report §6). Brave 1.58 is Chromium 116.
    ...(browser === 'firefox'
      ? {
          // Firefox 140+: has WebCodecs (video and audio encoding) and the "no data collected" declaration.
          browser_specific_settings: {
            gecko: { id: 'reclux@iamaakashoza.github.io', strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } },
          },
        }
      : { minimum_chrome_version: '116' }),
    description: 'Offline-first screen recorder. No account, no upload.',
    // downloads: only for the "Save as" window, so people can pick any drive.
    // system.cpu: only to tell a busy computer from a still screen. No install warning.
    // unlimitedStorage: without it the private recording storage is capped (about 10 GB here), too small for 2 hours of 1080p60.
    // power: keeps the PC awake while recording (a hidden tab cannot use the web wake lock). No install warning.
    // Firefox has no system.cpu or power, so they are left out there.
    permissions: ['downloads', 'unlimitedStorage', ...(browser === 'firefox' ? [] : ['system.cpu', 'power'])],
  }),
});
