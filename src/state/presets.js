import { v4 as uuid } from 'uuid';
import presetsData from '../data/presets.json';

/**
 * Track colors assigned by index.
 */
const TRACK_COLORS = [
  '#A8E06C', '#FFB347', '#FF6B6B', '#5BC0EB',
  '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1',
];

/**
 * Map Funklet velocity (0-4) → drumlet velMode=3 (0=off, 1=S, 2=M, 3=H).
 */
function mapVelocity(v) {
  if (v === 0) return 0;
  if (v === 1) return 1;
  if (v <= 2) return 2;
  return 3;
}

/**
 * Parse a Funklet 32-step string and downsample to 16 steps.
 */
function parseAndDownsample(str) {
  const raw = str.split('').map((c) => mapVelocity(parseInt(c)));
  const out = [];
  for (let i = 0; i < raw.length; i += 2) {
    out.push(Math.max(raw[i], raw[i + 1] || 0));
  }
  return out;
}

/**
 * Hydrate a JSON track into a full track object.
 * Uses the preset-level kit config as default, track can override.
 */
function hydrateTrack(jsonTrack, index, presetKit) {
  const kit = presetKit || { type: 'drumMachine', id: 'TR-808' };

  // Determine source type from kit config
  const isCustomKit = kit.type === 'kit';
  const sourceType = isCustomKit ? 'kit' : (kit.type || 'drumMachine');

  return {
    id: uuid(),
    name: jsonTrack.name,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
    sourceType,
    instrument: isCustomKit ? null : (kit.id || 'TR-808'),
    group: jsonTrack.group,
    kitId: isCustomKit ? kit.id : null,
    kitSample: isCustomKit ? jsonTrack.group : null,
    soundfontName: null,
    customSampleName: null,
    volume: 80,
    reverb: 20,
    velMode: jsonTrack.velMode || 3,
    _stashedSteps: {},
    mute: false,
    solo: false,
    steps: parseAndDownsample(jsonTrack.steps),
  };
}

/**
 * Hydrate a JSON preset into the shape the Library component expects.
 */
function hydratePreset(jsonPreset) {
  return {
    ...jsonPreset,
    tracks: jsonPreset.tracks.map((t, i) => hydrateTrack(t, i, jsonPreset.kit)),
  };
}

/**
 * Load and hydrate all preset categories from the JSON data.
 * Can also accept an external array (e.g. from an API) in the same format.
 */
export function loadPresetCategories(data = presetsData) {
  return data.categories.map((cat) => ({
    name: cat.name,
    presets: cat.presets.map(hydratePreset),
  }));
}

/**
 * Load a single preset by name (for embed/demo use).
 */
export function loadPresetByName(name, data = presetsData) {
  for (const cat of data.categories) {
    const found = cat.presets.find((p) => p.name === name);
    if (found) return hydratePreset(found);
  }
  return null;
}

/**
 * The default category list, hydrated from the bundled JSON.
 */
export const PRESET_CATEGORIES = loadPresetCategories();

/**
 * Convert a hydrated preset into a full sequencer state for LOAD_STATE.
 */
export function presetToState(preset) {
  return {
    pages: [{
      id: uuid(),
      name: 'Page 1',
      tracks: preset.tracks.map((t) => ({ ...t, id: uuid() })),
    }],
    currentPageIndex: 0,
    stepsPerPage: 16,
    bpm: preset.bpm,
    swing: preset.swing || 0,
    humanize: 0,
    chainMode: false,
  };
}
