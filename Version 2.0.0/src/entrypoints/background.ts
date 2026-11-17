export default defineBackground(() => {
  // First install: open the welcome guide. Updates and browser restarts do not.
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
  });
});
