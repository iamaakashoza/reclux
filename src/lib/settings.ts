// Remembered choices. The popup and the recorder page share one origin, so one localStorage key serves both.
import type { Format } from './capture';
import { PRESETS } from './presets';

export type Source = 'tab' | 'window' | 'screen';

export interface Settings {
  source: Source;
  presetId: string;
  format: Format;
  mic: boolean;
  system: boolean;
}

export const DEFAULTS: Settings = { source: 'screen', presetId: '1080p30', format: 'mp4', mic: true, system: true };

const KEY = 'reclux.settings';

/** Saved choices, with anything missing or invalid replaced by the default. */
export function loadSettings(): Settings {
  let s: Partial<Settings> = {};
  try {
    s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {}
  const d = DEFAULTS;
  return {
    source: ['tab', 'window', 'screen'].includes(s.source!) ? s.source! : d.source,
    presetId: PRESETS.some((p) => p.id === s.presetId) ? s.presetId! : d.presetId,
    format: s.format === 'webm' ? 'webm' : d.format,
    mic: typeof s.mic === 'boolean' ? s.mic : d.mic,
    system: typeof s.system === 'boolean' ? s.system : d.system,
  };
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {} // private window or blocked storage: just do not remember
}
