// Keeps the PC (and screen) awake while recording. The web wake lock only works in a visible tab,
// and the recorder tab is usually hidden, so this uses the extension power API (Chromium only).
// ponytail: Firefox has no chrome.power, so nothing happens there. Add a wake-lock fallback with the Firefox phase.
export function keepAwake(on: boolean) {
  try {
    if (on) browser.power?.requestKeepAwake('display');
    else browser.power?.releaseKeepAwake();
  } catch {}
}
