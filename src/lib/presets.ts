// Quality presets. Bitrates are starting points from report.md §7; tune after real tests.
export interface Preset {
  id: string;
  label: string;
  height: 720 | 1080;
  fps: 30 | 50 | 60;
  mbps: number;
}

export const PRESETS: Preset[] = [
  { id: '720p30', label: '720p · 30 fps', height: 720, fps: 30, mbps: 5 },
  { id: '720p50', label: '720p · 50 fps', height: 720, fps: 50, mbps: 6.5 },
  { id: '720p60', label: '720p · 60 fps', height: 720, fps: 60, mbps: 7.5 },
  { id: '1080p30', label: '1080p · 30 fps', height: 1080, fps: 30, mbps: 8 },
  { id: '1080p50', label: '1080p · 50 fps', height: 1080, fps: 50, mbps: 10 },
  { id: '1080p60', label: '1080p · 60 fps', height: 1080, fps: 60, mbps: 12 },
];

export const DEFAULT_PRESET = PRESETS[3]!;

export const findPreset = (id: string) => PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;

/** Size in MB after `seconds` of recording at this preset. */
export const sizeMB = (p: Preset, seconds: number) => (p.mbps / 8) * seconds;

export const fmtSize = (mb: number) =>
  mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : mb >= 1 ? `${Math.round(mb)} MB` : `${Math.round(mb * 1000)} KB`;

export const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

export const MAX_SECONDS = 2 * 60 * 60;
export const WARN_SECONDS = MAX_SECONDS - 15 * 60;
