// Free space for recordings. With the unlimitedStorage permission the browser's quota equals
// (space already used by Reclux + free space on the drive that holds the browser profile).
// So quota - usage is the real free space. Measured in Edge: it matched the drive's free space.
// Brave hides it on purpose: it always reports a 2 GB quota, even though writing more works.
// Firefox reports a fixed 10 GB, which is not the free space on the drive.
export const LOW_FREE = 2e9; // warn below 2 GB
export const STOP_FREE = 3e8; // stop below 300 MB, while there is still room to finish the file

const BRAVE_FAKE_QUOTA = 2 ** 31;

/** Free bytes for recordings, or null when the browser cannot tell (Brave, Firefox, or a nonsense number). */
export async function freeBytes(): Promise<number | null> {
  if (navigator.userAgent.includes('Firefox/')) return null;
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota === undefined || usage === undefined || quota === BRAVE_FAKE_QUOTA) return null;
    const free = quota - usage;
    return free > 0 ? free : null;
  } catch {
    return null;
  }
}
