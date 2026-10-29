# Reclux

Offline-first screen recorder for Chrome, Brave, Edge, Opera and Firefox. No account, no upload.

## Build from source

Needs Node.js 20 or newer and npm.

```
npm ci
npm run build           # Chrome, Brave, Edge, Opera  -> .output/chrome-mv3
npm run build:firefox   # Firefox (Manifest V3)       -> .output/firefox-mv3
npm run zip             # store zip for Chrome
npm run zip:firefox     # store zip for Firefox, plus the sources zip
npm run check           # type check
```

Built with WXT, Svelte 5 and TypeScript. The video library is [Mediabunny](https://mediabunny.dev) (an npm dependency, not copied code).
