import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
// ponytail: names depend on the -b flag read from the command line (defineConfig cannot take the browser here), upgrade path: WXT option per browser.
declare const process: { argv: string[] }; // Node's, without adding @types/node
const firefox = process.argv.some((a: string, i: number, all: string[]) => a === 'firefox' && (all[i - 1] === '-b' || all[i - 1] === '--browser'));

export default defineConfig({
  srcDir: 'src',
  hooks: {
    // WXT adds the overlay's <all_urls> as a required host permission, which would show "Read and change all your
    // data on all websites" at install. Keep it optional instead: asked only when Webcam or Cursor zoom is turned on.
    'build:manifestGenerated': (_wxt, manifest) => {
      delete manifest.host_permissions;
    },
  },
  modules: ['@wxt-dev/module-svelte'],
  // Folder and .zip names people see: the build folder, and the files on the website.
  outDirTemplate: firefox ? 'reclux-firefox-extension{{modeSuffix}}' : 'reclux-extension-all-in-one{{modeSuffix}}',
  zip: {
    // "v2" is the major version (2.0.0). Change it with the version number, only when the owner says so.
    artifactTemplate: firefox ? 'reclux-firefox-extension-v2{{modeSuffix}}.zip' : 'reclux-extension-v2{{modeSuffix}}.zip',
    sourcesTemplate: 'reclux-sources-v2{{modeSuffix}}.zip',
    // The sources zip (needed by Firefox's add-on review) only needs the code, not our notes and store files.
    excludeSources: ['report.md', 'docs/**', 'spike/**', 'brand/**'],
  },
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
    // unlimitedStorage: without it the private recording storage is capped (about 10 GB here), too small for 2 hours of 1080p60.
    // power: keeps the PC awake while recording (a hidden tab cannot use the web wake lock). No install warning.
    // Firefox has no power API, so it is left out there.
    // scripting: puts the webcam circle and cursor tracking on web pages while recording. No install warning by itself.
    // activeTab: one picture of the page the user is on when they press Start recording, shown behind the share box
    // and the countdown (report §41). No install warning.
    permissions: ['downloads', 'unlimitedStorage', 'scripting', 'activeTab', ...(browser === 'firefox' ? [] : ['power'])],
    // Web page access is asked only when the user turns on Webcam or Cursor zoom, never at install (report §37).
    optional_host_permissions: ['<all_urls>'],
    // The webcam circle is a Reclux page shown inside the web page, so the camera permission stays with Reclux,
    // never with the website.
    web_accessible_resources: [{ resources: ['bubble.html', 'chunks/*', 'assets/*'], matches: ['<all_urls>'] }],
  }),
});
