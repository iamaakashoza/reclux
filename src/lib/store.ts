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

/** Mark this tab as the owner of the file. Returns a function that lets go. */
export function holdStored(name: string): Promise<() => void> {
  return new Promise((resolve) => {
    void navigator.locks.request(lockName(name), () => new Promise<void>((release) => resolve(release)));
  });
}

export const markSaved = (name: string) => localStorage.setItem(savedKey(name), '1');

/** Files from an earlier session that were never saved. Already-saved leftovers are cleaned up. */
export async function findUnsaved(): Promise<Stored[]> {
  const d = await dir();
  const held = new Set((await navigator.locks.query()).held?.map((l) => l.name));
  const entries = (d as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries();
  const out: Stored[] = [];
  for await (const [name, h] of entries) {
    if (h.kind !== 'file' || held.has(lockName(name))) continue;
    if (localStorage.getItem(savedKey(name))) {
      await removeStored(name);
      continue;
    }
    const f = await (h as FileSystemFileHandle).getFile();
    if (f.size > 0) out.push({ name, size: f.size, modified: f.lastModified });
  }
  return out.sort((a, b) => b.modified - a.modified);
}
