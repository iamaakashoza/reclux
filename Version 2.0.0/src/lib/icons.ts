// Icons: Lucide (lucide.dev, ISC licence), packed into Reclux, so they never need the internet.
// Only the icons named here end up in the extension. Their rounded 2 px line suits the Figtree typeface.
import {
  AppWindow,
  BookOpen,
  Brackets,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  Download,
  Folder,
  Info,
  Mic,
  MicOff,
  Monitor,
  OctagonAlert,
  PanelTop,
  Pause,
  Pencil,
  Pin,
  Puzzle,
  Play,
  Plus,
  Minus,
  Redo2,
  Scissors,
  ShieldCheck,
  Square,
  Trash2,
  TriangleAlert,
  Undo2,
  Video,
  Volume2,
  ZoomIn,
  type IconNode,
} from 'lucide';

const ICONS: Record<string, IconNode> = {
  record: Circle,
  play: Play,
  stop: Square,
  pause: Pause,
  mic: Mic,
  'mic-off': MicOff,
  speaker: Volume2,
  tab: PanelTop,
  window: AppWindow,
  screen: Monitor,
  folder: Folder,
  check: Check,
  info: Info,
  warn: TriangleAlert,
  danger: OctagonAlert,
  success: CircleCheck,
  download: Download,
  trash: Trash2,
  edit: Pencil,
  shield: ShieldCheck,
  chevron: ChevronDown,
  undo: Undo2,
  redo: Redo2,
  split: Scissors,
  trim: Brackets,
  plus: Plus,
  minus: Minus,
  camera: Video,
  pin: Pin,
  zoom: ZoomIn,
  guide: BookOpen,
  puzzle: Puzzle,
};

/** Drawn solid: the record dot, play and stop (as on every media player). */
const FILLED = new Set(['record', 'play', 'stop']);

const esc = (v: string | number | undefined) => String(v ?? '').replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The icon's shapes as SVG markup (from the fixed list above, never from user input). */
export const iconShapes = (name: string) =>
  (ICONS[name] ?? [])
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`)
    .join('');

/** A complete <svg> for places outside Svelte (the overlay on web pages). */
export const iconSvg = (name: string, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${FILLED.has(name) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconShapes(name)}</svg>`;

export const isFilled = (name: string) => FILLED.has(name);
