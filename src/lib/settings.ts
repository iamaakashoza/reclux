// Remembered choices. The popup and the recorder page share one origin, so one localStorage key serves both.
import type { Format } from './capture';
import { PRESETS } from './presets';

export const SOURCES = [
  { value: 'tab', label: 'Tab', icon: 'tab' },
  { value: 'window', label: 'Window', icon: 'window' },
  { value: 'screen', label: 'Screen', icon: 'screen' },
];

interface Settings {
  source: 'tab' | 'window' | 'screen';
  presetId: string;
  format: Format;
  mic: boolean;
  system: boolean;
}

const DEFAULTS: Settings = { source: 'screen', presetId: '1080p30', format: 'mp4', mic: true, system: true };

const KEY = 'reclux.settings';

/** Saved choices, with anything missing or invalid replaced by the default. */
export function loadSettings(): Settings {
  let s: Partial<Settings> = {};
  try {
    s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {}
  return {
    source: ['tab', 'window', 'screen'].includes(s.source!) ? s.source! : DEFAULTS.source,
    presetId: PRESETS.some((p) => p.id === s.presetId) ? s.presetId! : DEFAULTS.presetId,
    format: s.format === 'webm' ? 'webm' : DEFAULTS.format,
    mic: typeof s.mic === 'boolean' ? s.mic : DEFAULTS.mic,
    system: typeof s.system === 'boolean' ? s.system : DEFAULTS.system,
  };
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {} // private window or blocked storage: just do not remember
}
