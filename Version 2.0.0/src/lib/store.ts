// Recordings live in the browser's private disk storage (OPFS), not in RAM.
// A file is "in use" while a tab holds a lock on it, so a second tab never mistakes a
// live recording for a crashed one. The lock disappears by itself if the tab crashes.
export interface Stored {
  name: string;
  size: number;
  modified: number;
}

const dir = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('recordings', { create: true });
const lockName = (name: string) => `reclux:${name}`;
const savedKey = (name: string) => `reclux.saved.${name}`;

export async function getStored(name: string): Promise<File> {
  return (await (await dir()).getFileHandle(name)).getFile();
}

export async function removeStored(name: string) {
  try {
    await (await dir()).removeEntry(name);
  } catch {
    // already gone
  }
  localStorage.removeItem(savedKey(name));
}

/** Puts a finished file in place of another, under that name. */
export async function replaceStored(from: string, to: string) {
  const handle = await (await dir()).getFileHandle(from);
  // Chromium and Firefox have this, but the page type library does not list it yet.
  await (handle as unknown as { move(name: string): Promise<void> }).move(to);
}

/** Mark this tab as the owner of the file. Returns a function that lets go. */
export function holdStored(name: string): Promise<() => void> {
  return new Promise((resolve) => {
    void navigator.locks.request(lockName(name), () => new Promise<void>((release) => resolve(release)));
  });
}

/** Marks a file as nothing to recover (saved, or not started yet), or `false` to clear that again. */
export const markSaved = (name: string, on = true) =>
  on ? localStorage.setItem(savedKey(name), '1') : localStorage.removeItem(savedKey(name));

/**
 * Files from an earlier session that were never saved. Already-saved leftovers are cleaned up, unless `clean` is
 * false: the toolbar popup only looks, because a Reclux window may be finishing a .tmp file right now.
 */
export async function findUnsaved(clean = true): Promise<Stored[]> {
  const d = await dir();
  const held = new Set((await navigator.locks.query()).held?.map((l) => l.name));
  const entries = (d as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries();
  const out: Stored[] = [];
  for await (const [name, h] of entries) {
    if (h.kind !== 'file' || held.has(lockName(name))) continue;
    // A half-written rebuild from a crash (the original is still there), or a file already saved.
    if (name.endsWith('.tmp') || localStorage.getItem(savedKey(name))) {
      if (clean) await removeStored(name);
      continue;
    }
    const f = await (h as FileSystemFileHandle).getFile();
    if (f.size > 0) out.push({ name, size: f.size, modified: f.lastModified });
  }
  return out.sort((a, b) => b.modified - a.modified);
}
