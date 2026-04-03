import { v4 as uuid } from 'uuid';
import { maxLevel, convertStep } from '../audio/velocityConfig.js';
import { isSplit, masterVelocity } from '../util/stepHelpers.js';

// Note value options — each step represents this many quarter-note beats
export const NOTE_VALUES = [
  { key: '1/32', label: '1/32', beatsPerStep: 1 / 8 },
  { key: '1/16', label: '1/16', beatsPerStep: 1 / 4 },
  { key: '1/8',  label: '1/8',  beatsPerStep: 1 / 2 },
  { key: '1/4',  label: '1/4',  beatsPerStep: 1 },
  { key: 'd1/4', label: '♩.',   beatsPerStep: 3 / 2 },
  { key: '1/2',  label: '1/2',  beatsPerStep: 2 },
];

// Common time signature presets — sets both beatsPerBar and noteValue
export const TIME_SIGNATURES = [
  { label: '4/4',  num: 4,  denom: 4,  noteValue: '1/4' },
  { label: '3/4',  num: 3,  denom: 4,  noteValue: '1/4' },
  { label: '2/4',  num: 2,  denom: 4,  noteValue: '1/4' },
  { label: '5/4',  num: 5,  denom: 4,  noteValue: '1/4' },
  { label: '6/8',  num: 6,  denom: 8,  noteValue: '1/8' },
  { label: '7/8',  num: 7,  denom: 8,  noteValue: '1/8' },
  { label: '12/8', num: 12, denom: 8,  noteValue: '1/8' },
  { label: '2/2',  num: 2,  denom: 2,  noteValue: '1/2' },
];

// Step count options per time signature.
// Each entry: { steps, stepValue, default? }
// stepValue is what each grid step represents.
const STEP_CONFIGS = {
  '4/4':  [
    { steps: 4,  stepValue: '1/4' },
    { steps: 8,  stepValue: '1/8' },
    { steps: 16, stepValue: '1/16', default: true },
    { steps: 32, stepValue: '1/16' },
  ],
  '3/4':  [
    { steps: 3,  stepValue: '1/4' },
    { steps: 6,  stepValue: '1/8' },
    { steps: 12, stepValue: '1/16', default: true },
    { steps: 24, stepValue: '1/16' },
  ],
  '2/4':  [
    { steps: 2,  stepValue: '1/4' },
    { steps: 4,  stepValue: '1/8' },
    { steps: 8,  stepValue: '1/16', default: true },
    { steps: 16, stepValue: '1/16' },
  ],
  '5/4':  [
    { steps: 5,  stepValue: '1/4' },
    { steps: 10, stepValue: '1/8' },
    { steps: 20, stepValue: '1/16', default: true },
  ],
  '6/8':  [
    { steps: 6,  stepValue: '1/8' },
    { steps: 12, stepValue: '1/16', default: true },
    { steps: 24, stepValue: '1/16' },
  ],
  '7/8':  [
    { steps: 7,  stepValue: '1/8' },
    { steps: 14, stepValue: '1/16', default: true },
    { steps: 28, stepValue: '1/16' },
  ],
  '12/8': [
    { steps: 12, stepValue: '1/8', default: true },
    { steps: 24, stepValue: '1/8' },
  ],
  '2/2':  [
    { steps: 2,  stepValue: '1/2' },
    { steps: 4,  stepValue: '1/4' },
    { steps: 8,  stepValue: '1/8', default: true },
    { steps: 16, stepValue: '1/16' },
  ],
};

/**
 * Get step configs for a time signature.
 * Returns array of { steps, stepValue, default? }.
 */
export function getStepConfigs(timeSigLabel) {
  return STEP_CONFIGS[timeSigLabel] || STEP_CONFIGS['4/4'];
}

/**
 * Get the default step config for a time signature.
 */
export function getDefaultStepConfig(timeSigLabel) {
  const configs = getStepConfigs(timeSigLabel);
  return configs.find(c => c.default) || configs[0];
}

/**
 * Find the step value for a given step count within a time signature.
 */
export function getStepValueForCount(timeSigLabel, stepsPerPage) {
  const configs = getStepConfigs(timeSigLabel);
  const match = configs.find(c => c.steps === stepsPerPage);
  if (match) return match.stepValue;
  // Fallback: find closest config
  const sorted = [...configs].sort((a, b) => Math.abs(a.steps - stepsPerPage) - Math.abs(b.steps - stepsPerPage));
  return sorted[0]?.stepValue || '1/4';
}

export const TRACK_COLORS = [
  '#FF6B6B', '#FFB347', '#A8E06C', '#5BC0EB',
  '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1',
];

const DEFAULT_GROUPS = ['kick', 'snare', 'hihat-close', 'clap'];

function makeTrack(index, stepsPerPage) {
  const group = DEFAULT_GROUPS[index] || 'kick';
  return {
    id: uuid(),
    name: group.charAt(0).toUpperCase() + group.slice(1),
    color: TRACK_COLORS[index % TRACK_COLORS.length],
    sourceType: 'drumMachine',
    instrument: 'TR-808',
    group,
    soundfontName: null,
    customSampleName: null,
    volume: 80,
    reverb: 20,
    velMode: 3,           // 1, 3, or 7
    _stashedSteps: {},    // { [mode]: steps } for lossless switching
    mute: false,
    solo: false,
    steps: new Array(stepsPerPage).fill(0),
  };
}

function makePage(name, stepsPerPage, tracks = null) {
  return {
    id: uuid(),
    name,
    tracks: tracks || DEFAULT_GROUPS.map((_, i) => makeTrack(i, stepsPerPage)),
    sectionHeadings: [],  // [{ id, step, label }]
  };
}

export function createInitialState() {
  const stepsPerPage = 16;
  return {
    pages: [makePage('Page 1', stepsPerPage)],
    currentPageIndex: 0,
    stepsPerPage,
    bpm: 120,
    noteValue: '1/4',   // key from NOTE_VALUES — time sig beat unit
    beatsPerBar: 4,     // time signature numerator
    stepValue: '1/16',  // key from NOTE_VALUES — what one grid step represents
    swing: 0,           // 0-100, 0=straight, 50=triplet feel, 100=hard swing
    swingTarget: '8th', // '8th' or '16th' — which note values swing applies to
    humanize: 0,        // 0-100, random timing variation in ms
    chainMode: false,
  };
}

export function sequencerReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_CELL': {
      const { trackIndex, stepIndex } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex].tracks[trackIndex];
      const max = maxLevel(track.velMode || 3);
      const cur = track.steps[stepIndex];
      // For split cells, toggle cycles the master velocity (first sub-step)
      if (isSplit(cur)) {
        cur[0] = (cur[0] + 1) % (max + 1);
      } else {
        track.steps[stepIndex] = (cur + 1) % (max + 1);
      }
      return { ...state, pages };
    }

    case 'SET_CELL': {
      const { trackIndex, stepIndex, velocity } = action;
      const pages = structuredClone(state.pages);
      pages[state.currentPageIndex].tracks[trackIndex].steps[stepIndex] = velocity;
      return { ...state, pages };
    }

    case 'SET_TRACK_PROP': {
      const { trackIndex, prop, value } = action;
      const pages = structuredClone(state.pages);
      pages[state.currentPageIndex].tracks[trackIndex][prop] = value;
      return { ...state, pages };
    }

    case 'SET_TRACK_SOURCE': {
      const { trackIndex, sourceType, instrument, group, soundfontName, customSampleName, kitId, kitSample, name } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex].tracks[trackIndex];
      track.sourceType = sourceType;
      track.instrument = instrument || null;
      track.group = group || null;
      track.soundfontName = soundfontName || null;
      track.customSampleName = customSampleName || null;
      track.kitId = kitId || null;
      track.kitSample = kitSample || null;
      if (name) track.name = name;
      return { ...state, pages };
    }

    case 'ADD_TRACK': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      const idx = page.tracks.length;
      page.tracks.push(makeTrack(idx, state.stepsPerPage));
      return { ...state, pages };
    }

    case 'REMOVE_TRACK': {
      const { trackIndex } = action;
      const pages = structuredClone(state.pages);
      pages[state.currentPageIndex].tracks.splice(trackIndex, 1);
      return { ...state, pages };
    }

    case 'ADD_PAGE': {
      const pages = structuredClone(state.pages);
      // Copy track structure from current page but with empty steps
      const currentTracks = pages[state.currentPageIndex].tracks;
      const newTracks = currentTracks.map((t) => ({
        ...t,
        id: uuid(),
        steps: new Array(state.stepsPerPage).fill(0),
      }));
      pages.push(makePage(`Page ${pages.length + 1}`, state.stepsPerPage, newTracks));
      return { ...state, pages };
    }

    case 'REMOVE_PAGE': {
      if (state.pages.length <= 1) return state;
      const { pageIndex } = action;
      const pages = state.pages.filter((_, i) => i !== pageIndex);
      const currentPageIndex = Math.min(state.currentPageIndex, pages.length - 1);
      return { ...state, pages, currentPageIndex };
    }

    case 'SET_CURRENT_PAGE':
      return { ...state, currentPageIndex: action.pageIndex };

    case 'SET_BPM':
      return { ...state, bpm: Math.max(20, Math.min(300, action.bpm)) };

    case 'SET_NOTE_VALUE':
      return { ...state, noteValue: action.noteValue };

    case 'SET_TIME_SIG': {
      const ts = TIME_SIGNATURES.find(t => t.num === action.beatsPerBar && t.noteValue === action.noteValue);
      const label = ts?.label || '4/4';
      const cfg = getDefaultStepConfig(label);
      const newSteps = cfg.steps;
      // Default step div: /8 denoms → 8th note, /4 and /2 denoms → 16th note
      const defaultStepDiv = (ts?.denom || 4) >= 8 ? '1/8' : '1/16';
      const pages = structuredClone(state.pages);
      for (const page of pages) {
        for (const track of page.tracks) {
          // Non-destructive: only grow, never truncate
          if (track.steps.length < newSteps) {
            track.steps = [...track.steps, ...new Array(newSteps - track.steps.length).fill(0)];
          }
        }
      }
      return {
        ...state,
        pages,
        beatsPerBar: action.beatsPerBar,
        noteValue: action.noteValue,
        stepsPerPage: newSteps,
        stepValue: defaultStepDiv,
      };
    }

    case 'SET_STEP_VALUE':
      return { ...state, stepValue: action.stepValue };

    case 'SET_SWING':
      return { ...state, swing: Math.max(0, Math.min(100, action.swing)) };

    case 'SET_SWING_TARGET':
      return { ...state, swingTarget: action.swingTarget };

    case 'SET_HUMANIZE':
      return { ...state, humanize: Math.max(0, Math.min(100, action.humanize)) };

    case 'SET_TRACK_VEL_MODE': {
      const { trackIndex, mode } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex].tracks[trackIndex];
      const oldMode = track.velMode || 3;
      if (mode === oldMode) return state;

      // Stash current steps under old mode key
      const stashed = { ...(track._stashedSteps || {}) };
      stashed[oldMode] = structuredClone(track.steps);

      // Convert a step value (plain or split array) between modes
      const convertStepValue = (v) => {
        if (isSplit(v)) return v.map(sv => convertStep(sv, oldMode, mode));
        return convertStep(v, oldMode, mode);
      };

      // Restore from stash if available, otherwise convert
      if (stashed[mode]) {
        track.steps = stashed[mode];
        delete stashed[mode];
      } else {
        track.steps = track.steps.map(convertStepValue);
      }

      track.velMode = mode;
      track._stashedSteps = stashed;
      return { ...state, pages };
    }

    case 'SET_STEPS_PER_PAGE': {
      const newSteps = action.stepsPerPage;
      const pages = structuredClone(state.pages);
      for (const page of pages) {
        for (const track of page.tracks) {
          // Non-destructive: only grow the array, never truncate.
          // stepsPerPage controls the visible window; extra steps are preserved.
          if (track.steps.length < newSteps) {
            track.steps = [...track.steps, ...new Array(newSteps - track.steps.length).fill(0)];
          }
        }
      }
      // Auto-derive stepValue from time sig + new step count
      const ts = TIME_SIGNATURES.find(t => t.num === state.beatsPerBar && t.noteValue === state.noteValue);
      const stepValue = getStepValueForCount(ts?.label || '4/4', newSteps);
      return { ...state, pages, stepsPerPage: newSteps, stepValue };
    }

    case 'TOGGLE_CHAIN_MODE':
      return { ...state, chainMode: !state.chainMode };

    case 'CLEAR_PAGE': {
      const pages = structuredClone(state.pages);
      for (const track of pages[state.currentPageIndex].tracks) {
        track.steps.fill(0);
      }
      return { ...state, pages };
    }

    case 'ADD_SECTION_HEADING': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page.sectionHeadings) page.sectionHeadings = [];
      page.sectionHeadings.push({
        id: uuid(),
        step: action.step,
        label: action.label,
      });
      return { ...state, pages };
    }

    case 'UPDATE_SECTION_HEADING': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page.sectionHeadings) page.sectionHeadings = [];
      const heading = page.sectionHeadings.find(h => h.id === action.id);
      if (heading) heading.label = action.label;
      return { ...state, pages };
    }

    case 'MOVE_SECTION_HEADING': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page.sectionHeadings) page.sectionHeadings = [];
      const heading = page.sectionHeadings.find(h => h.id === action.id);
      if (heading) heading.step = action.step;
      return { ...state, pages };
    }

    case 'REMOVE_SECTION_HEADING': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page.sectionHeadings) page.sectionHeadings = [];
      page.sectionHeadings = page.sectionHeadings.filter(h => h.id !== action.id);
      return { ...state, pages };
    }

    case 'SPLIT_CELL': {
      const { trackIndex, stepIndex, splitCount } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex].tracks[trackIndex];
      const cur = track.steps[stepIndex];
      const baseVel = isSplit(cur) ? cur[0] : cur;
      const arr = new Array(splitCount).fill(0);
      arr[0] = baseVel;
      track.steps[stepIndex] = arr;
      return { ...state, pages };
    }

    case 'UNSPLIT_CELL': {
      const { trackIndex, stepIndex } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex].tracks[trackIndex];
      const cur = track.steps[stepIndex];
      track.steps[stepIndex] = isSplit(cur) ? masterVelocity(cur) : cur;
      return { ...state, pages };
    }

    case 'TOGGLE_SUBSTEP': {
      const { trackIndex, stepIndex, subIndex } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex].tracks[trackIndex];
      const cur = track.steps[stepIndex];
      if (isSplit(cur)) {
        const max = maxLevel(track.velMode || 3);
        cur[subIndex] = (cur[subIndex] + 1) % (max + 1);
      }
      return { ...state, pages };
    }

    case 'SET_SUBSTEP': {
      const { trackIndex, stepIndex, subIndex, velocity } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex].tracks[trackIndex];
      const cur = track.steps[stepIndex];
      if (isSplit(cur)) {
        cur[subIndex] = velocity;
      }
      return { ...state, pages };
    }

    case 'LOAD_STATE':
      return { ...action.state };

    default:
      return state;
  }
}
