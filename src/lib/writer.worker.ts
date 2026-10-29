// Owns one file in the browser's private storage (OPFS) and writes into it in place.
// Writing in place (not via createWritable, which only commits on close) means a crash
// or closed tab keeps everything that was already written.
type Msg =
  | { type: 'open'; name: string }
  | { type: 'write'; data: Uint8Array; position: number }
  | { type: 'close' };

// The page type library does not include the worker-only file API, so describe the part we use.
interface SyncHandle {
  write(data: Uint8Array, opts: { at: number }): number;
  flush(): void;
  close(): void;
  truncate(size: number): void;
}
type SyncFile = FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncHandle> };

let handle: SyncHandle | undefined;
let size = 0;
const post = (m: unknown) => (self as unknown as { postMessage(m: unknown): void }).postMessage(m);

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try {
    if (m.type === 'open') {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('recordings', { create: true });
      handle = await ((await dir.getFileHandle(m.name, { create: true })) as SyncFile).createSyncAccessHandle();
      handle.truncate(0);
      post({ type: 'ok' });
    } else if (m.type === 'write') {
      handle!.write(m.data, { at: m.position });
      handle!.flush(); // push to disk now, so little is lost on a crash
      size = Math.max(size, m.position + m.data.byteLength);
      post({ type: 'ok', size });
    } else {
      handle?.flush();
      handle?.close();
      handle = undefined;
      post({ type: 'ok' });
    }
  } catch (err) {
    post({ type: 'error', message: (err as Error).message });
  }
};
