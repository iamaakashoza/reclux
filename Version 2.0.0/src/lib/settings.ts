// Remembered choices. The popup and the recorder page share one origin, so one localStorage key serves both.
import type { Format } from './capture';
import { DEFAULT_PRESET, PRESETS } from './presets';

// No "what to record" choice: the browser's own picker asks for that when recording starts.
interface Settings {
  presetId: string;
  format: Format;
  mic: boolean;
  system: boolean;
  /** "Reduce transparency": solid surfaces instead of glass. Firefox has no system setting for it. */
  solid: boolean;
}

const DEFAULTS: Settings = { presetId: DEFAULT_PRESET, format: 'mp4', mic: true, system: true, solid: false };

const KEY = 'reclux.settings';

/** Saved choices, with anything missing or invalid replaced by the default. */
export function loadSettings(): Settings {
  let s: Partial<Settings> = {};
  try {
    s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {}
  return {
    presetId: PRESETS.some((p) => p.id === s.presetId) ? s.presetId! : DEFAULTS.presetId,
    format: s.format === 'webm' ? 'webm' : DEFAULTS.format,
    mic: typeof s.mic === 'boolean' ? s.mic : DEFAULTS.mic,
    system: typeof s.system === 'boolean' ? s.system : DEFAULTS.system,
    solid: s.solid === true,
  };
}

/** Saves the given choices, keeping the others (each page only edits some of them). */
export function saveSettings(s: Partial<Settings>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadSettings(), ...s }));
  } catch {} // private window or blocked storage: just do not remember
  applyLook();
}

/** Solid or glass surfaces, on every page. Also follows changes made in another Reclux page. */
export function applyLook() {
  document.documentElement.toggleAttribute('data-solid', loadSettings().solid);
}
addEventListener('storage', applyLook);

/**
 * First run only: if this computer has no hardware H.264 encoder for 1080p60, start on 720p instead.
 * Software encoding at 1080p60 is what dropped frames in V1 (report §34). The user can still pick 1080p.
 * Firefox 140–142 always answers "yes" here, so it simply keeps 1080p.
 */
export async function suggestedPreset(): Promise<string | undefined> {
  try {
    if (localStorage.getItem(KEY) !== null || typeof VideoEncoder === 'undefined') return;
    const { supported } = await VideoEncoder.isConfigSupported({
      codec: 'avc1.64002a', // H.264 High, level 4.2: enough for 1080p60
      width: 1920,
      height: 1080,
      framerate: 60,
      bitrate: 20e6,
      hardwareAcceleration: 'prefer-hardware',
    });
    return supported ? undefined : '720p60';
  } catch {
    return;
  }
}
