import { v4 as uuid } from 'uuid';
import { maxLevel, convertStep } from '../audio/velocityConfig.js';

// Note value options — each step represents this many quarter-note beats
export const NOTE_VALUES = [
  { key: '1/32', label: '1/32', beatsPerStep: 1 / 8 },
  { key: '1/16', label: '1/16', beatsPerStep: 1 / 4 },
  { key: '1/8',  label: '1/8',  beatsPerStep: 1 / 2 },
  { key: '1/4',  label: '1/4',  beatsPerStep: 1 },
  { key: 'd1/4', label: '♩.',   beatsPerStep: 3 / 2 },
  { key: '1/2',  label: '1/2',  beatsPerStep: 2 },
];

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
  };
}

export function createInitialState() {
  const stepsPerPage = 16;
  return {
    pages: [makePage('Page 1', stepsPerPage)],
    currentPageIndex: 0,
    stepsPerPage,
    bpm: 120,
    noteValue: '1/4',   // key from NOTE_VALUES — what one grid step represents
    swing: 0,           // 0-100, 0=straight, 50=triplet feel, 100=hard swing
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
      track.steps[stepIndex] = (track.steps[stepIndex] + 1) % (max + 1);
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

    case 'SET_SWING':
      return { ...state, swing: Math.max(0, Math.min(100, action.swing)) };

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
      stashed[oldMode] = [...track.steps];

      // Restore from stash if available, otherwise convert
      if (stashed[mode]) {
        track.steps = stashed[mode];
        delete stashed[mode];
      } else {
        track.steps = track.steps.map((v) => convertStep(v, oldMode, mode));
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
          if (track.steps.length < newSteps) {
            track.steps = [...track.steps, ...new Array(newSteps - track.steps.length).fill(0)];
          } else {
            track.steps = track.steps.slice(0, newSteps);
          }
        }
      }
      return { ...state, pages, stepsPerPage: newSteps };
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

    case 'LOAD_STATE':
      return { ...action.state };

    default:
      return state;
  }
}
