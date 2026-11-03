// Quality presets. These bitrates are ceilings: raising them keeps text sharp next to moving video (report §32),
// and hardware encoders use far less on normal content, so real files stay much smaller than the size shown.
export interface Preset {
  id: string;
  label: string;
  height: 720 | 1080;
  fps: 30 | 50 | 60;
  mbps: number;
}

export const PRESETS: Preset[] = [
  { id: '720p30', label: '720p · 30 fps', height: 720, fps: 30, mbps: 9 },
  { id: '720p50', label: '720p · 50 fps', height: 720, fps: 50, mbps: 11 },
  { id: '720p60', label: '720p · 60 fps', height: 720, fps: 60, mbps: 13 },
  { id: '1080p30', label: '1080p · 30 fps', height: 1080, fps: 30, mbps: 14 },
  { id: '1080p50', label: '1080p · 50 fps', height: 1080, fps: 50, mbps: 17 },
  { id: '1080p60', label: '1080p · 60 fps', height: 1080, fps: 60, mbps: 20 },
];

export const findPreset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[3]!;

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
