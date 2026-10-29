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
npm run installer       # Windows installer -> .output/Reclux-Setup-<version>.exe (needs Inno Setup 6)
```

## Windows installer

`Reclux-Setup-<version>.exe` copies the extension to `%LOCALAPPDATA%\Reclux\extension` and opens a short guide in Chrome, Brave, Edge or Opera.
Browsers do not let a program add an extension by itself, so the guide walks the user through Developer mode and Load unpacked (about 30 seconds per browser).
No browser policies are changed. Uninstall from Windows Settings > Apps.

Built with WXT, Svelte 5 and TypeScript. The video library is [Mediabunny](https://mediabunny.dev) (an npm dependency, not copied code).
