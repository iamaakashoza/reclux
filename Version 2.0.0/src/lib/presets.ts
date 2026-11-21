// Quality presets. These bitrates are ceilings: raising them keeps text sharp next to moving video (report §32),
// and hardware encoders use far less on normal content, so real files stay much smaller than the size shown.
export interface Preset {
  id: string;
  height: 720 | 1080;
  fps: 50 | 60;
  mbps: number;
}

// V2: quality is locked to 720p/1080p × 50/60 fps (owner's final spec, report §34).
export const PRESETS: Preset[] = [
  { id: '720p50', height: 720, fps: 50, mbps: 11 },
  { id: '720p60', height: 720, fps: 60, mbps: 13 },
  { id: '1080p50', height: 1080, fps: 50, mbps: 17 },
  { id: '1080p60', height: 1080, fps: 60, mbps: 20 },
];

export const DEFAULT_PRESET = '1080p60';
export const findPreset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === DEFAULT_PRESET)!;
export const presetId = (height: number, fps: number) => `${height}p${fps}`;

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

/** Always hours:minutes:seconds, for the recording bar (00:02:45). */
export const fmtClock = (s: number) =>
  [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':');

export const MAX_SECONDS = 2 * 60 * 60;
export const WARN_SECONDS = MAX_SECONDS - 15 * 60;
/** Free space a full 2 hours needs: the recording, plus a second copy while Stop finishes it (finishFile). */
export const needMB = (p: Preset) => 2 * sizeMB(p, MAX_SECONDS);
