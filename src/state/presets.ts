import { v4 as uuid } from 'uuid';
import presetsData from '../data/presets.json';
import type { Track, VelMode } from './sequencerReducer.js';

const TRACK_COLORS = [
  '#A8E06C', '#FFB347', '#FF6B6B', '#5BC0EB',
  '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1',
] as const;

export interface PresetKit {
  type?: string;
  id?: string;
}

export interface PresetTrackJson {
  name: string;
  group: string;
  velMode?: VelMode;
  steps: string;
}

export interface PresetJson {
  name: string;
  bpm: number;
  swing?: number;
  cover?: string;
  body?: string;
  notes?: string;
  credit?: string;
  creditUrl?: string;
  links?: { wikipedia?: string; spotify?: string; youtube?: string };
  kit?: PresetKit;
  tracks: PresetTrackJson[];
}

export interface HydratedPreset extends Omit<PresetJson, 'tracks'> {
  inTheStyleOf: boolean;
  tracks: Track[];
}

export interface PresetCategoryJson {
  name: string;
  presets: PresetJson[];
}

export interface PresetData {
  categories: PresetCategoryJson[];
}

export interface PresetCategory {
  name: string;
  presets: HydratedPreset[];
}

function mapVelocity(v: number): number {
  if (v === 0) return 0;
  if (v === 1) return 1;
  if (v <= 2) return 2;
  return 3;
}

function parseAndDownsample(str: string): number[] {
  const raw = str.split('').map((c) => mapVelocity(parseInt(c, 10)));
  const out: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    out.push(Math.max(raw[i] ?? 0, raw[i + 1] ?? 0));
  }
  return out;
}

function hydrateTrack(jsonTrack: PresetTrackJson, index: number, presetKit?: PresetKit): Track {
  const kit: PresetKit = presetKit ?? { type: 'drumMachine', id: 'TR-808' };
  const isCustomKit = kit.type === 'kit';
  const sourceType = isCustomKit ? 'kit' : (kit.type ?? 'drumMachine');

  return {
    id: uuid(),
    name: jsonTrack.name,
    color: TRACK_COLORS[index % TRACK_COLORS.length]!,
    sourceType,
    instrument: isCustomKit ? null : (kit.id ?? 'TR-808'),
    group: jsonTrack.group,
    kitId: isCustomKit ? (kit.id ?? null) : null,
    kitSample: isCustomKit ? jsonTrack.group : null,
    soundfontName: null,
    customSampleName: null,
    volume: 80,
    reverb: 20,
    velMode: (jsonTrack.velMode ?? 3) as VelMode,
    _stashedSteps: {},
    mute: false,
    solo: false,
    steps: parseAndDownsample(jsonTrack.steps),
  };
}

/** Drummer categories get "In the style of" treatment */
export const DRUMMER_CATEGORIES = new Set([
  'Clyde Stubblefield',
  'Bernard Purdie',
  'Zigaboo Modeliste',
  'James Gadson',
  'Tony Allen',
  'Stevie Wonder',
]);

function hydratePreset(jsonPreset: PresetJson, categoryName?: string): HydratedPreset {
  return {
    ...jsonPreset,
    inTheStyleOf: categoryName ? DRUMMER_CATEGORIES.has(categoryName) : false,
    tracks: jsonPreset.tracks.map((t, i) => hydrateTrack(t, i, jsonPreset.kit)),
  };
}

export function loadPresetCategories(data: PresetData = presetsData as PresetData): PresetCategory[] {
  return data.categories.map((cat) => ({
    name: cat.name,
    presets: cat.presets.map((p) => hydratePreset(p, cat.name)),
  }));
}

export function loadPresetByName(name: string, data: PresetData = presetsData as PresetData): HydratedPreset | null {
  for (const cat of data.categories) {
    const found = cat.presets.find((p) => p.name === name);
    if (found) return hydratePreset(found);
  }
  return null;
}

export const PRESET_CATEGORIES: PresetCategory[] = loadPresetCategories();

/**
 * Convert a hydrated preset into a partial sequencer state for LOAD_STATE.
 * Note: this is a partial — the reducer will fill missing required fields.
 */
export function presetToState(preset: HydratedPreset) {
  return {
    pages: [{
      id: uuid(),
      name: 'Page 1',
      tracks: preset.tracks.map((t) => ({ ...t, id: uuid() })),
    }],
    currentPageIndex: 0,
    stepsPerPage: 16,
    bpm: preset.bpm,
    swing: preset.swing ?? 0,
    humanize: 0,
    chainMode: false,
  };
}
