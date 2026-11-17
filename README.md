# Reclux

Offline-first screen recorder for Chrome, Brave, Edge, Opera and Firefox. No account, no upload.

## Build from source

Needs Node.js 20 or newer and npm.

The current version is in [Version 2.0.0/](<Version 2.0.0/>). The 1.0.0 release is kept unchanged in [Version 1.0.0/](<Version 1.0.0/>); build it the same way from inside that folder.

```
cd "Version 2.0.0"
npm ci
npm run build           # Chrome, Brave, Edge, Opera  -> .output/reclux-extension-all-in-one
npm run build:firefox   # Firefox (Manifest V3)       -> .output/reclux-firefox-extension
npm run zip             # store zip for Chrome
npm run zip:firefox     # store zip for Firefox, plus the sources zip
npm run check           # type check
```

Reclux is shared as the extension .zip files. Steps for each browser are on [the website](https://reclux.netlify.app).

See what changed in each version in the [release notes](CHANGELOG.md).

Logo and brand files are in [Version 2.0.0/brand/](<Version 2.0.0/brand/README.md>).

Built with WXT, Svelte 5 and TypeScript. The video library is [Mediabunny](https://mediabunny.dev) (an npm dependency, not copied code).
