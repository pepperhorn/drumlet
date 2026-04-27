import { v4 as uuid } from 'uuid';
// JS modules — typed at the boundary until Phase 4 migrates them.
import { maxLevel as maxLevelImpl, convertStep as convertStepImpl } from '../audio/velocityConfig.js';
import { isSplit as isSplitImpl, isMulti as isMultiImpl, masterVelocity as masterVelocityImpl } from '../util/stepHelpers.js';

const maxLevel = maxLevelImpl as (mode: number) => number;
const convertStep = convertStepImpl as (v: number, oldMode: number, newMode: number) => number;
const isSplitFn = isSplitImpl as (s: unknown) => boolean;
const isMultiFn = isMultiImpl as (s: unknown) => boolean;
const masterVelocity = masterVelocityImpl as (s: Step) => number;

function isSplit(s: Step | undefined): s is number[] {
  return isSplitFn(s);
}
function isMulti(s: Step | undefined): s is MultiStep {
  return isMultiFn(s);
}

/* ── Constants ─────────────────────────────────────────────── */

// Note value options — each step represents this many quarter-note beats
export const NOTE_VALUES = [
  { key: '1/32', label: '1/32', beatsPerStep: 1 / 8 },
  { key: '1/16', label: '1/16', beatsPerStep: 1 / 4 },
  { key: '1/8',  label: '1/8',  beatsPerStep: 1 / 2 },
  { key: '1/4',  label: '1/4',  beatsPerStep: 1 },
  { key: 'd1/4', label: '♩.',   beatsPerStep: 3 / 2 },
  { key: '1/2',  label: '1/2',  beatsPerStep: 2 },
] as const;

export type NoteValueKey = (typeof NOTE_VALUES)[number]['key'];

export const TIME_SIGNATURES = [
  { label: '4/4',  num: 4,  denom: 4,  noteValue: '1/4' },
  { label: '3/4',  num: 3,  denom: 4,  noteValue: '1/4' },
  { label: '2/4',  num: 2,  denom: 4,  noteValue: '1/4' },
  { label: '5/4',  num: 5,  denom: 4,  noteValue: '1/4' },
  { label: '6/8',  num: 6,  denom: 8,  noteValue: '1/8' },
  { label: '7/8',  num: 7,  denom: 8,  noteValue: '1/8' },
  { label: '12/8', num: 12, denom: 8,  noteValue: '1/8' },
  { label: '2/2',  num: 2,  denom: 2,  noteValue: '1/2' },
] as const;

export type TimeSigLabel = (typeof TIME_SIGNATURES)[number]['label'];

interface StepConfig {
  steps: number;
  stepValue: NoteValueKey;
  default?: boolean;
}

const STEP_CONFIGS: Record<TimeSigLabel, StepConfig[]> = {
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

export function getStepConfigs(timeSigLabel: string): StepConfig[] {
  return STEP_CONFIGS[timeSigLabel as TimeSigLabel] ?? STEP_CONFIGS['4/4'];
}

export function getDefaultStepConfig(timeSigLabel: string): StepConfig {
  const configs = getStepConfigs(timeSigLabel);
  return configs.find((c) => c.default) ?? configs[0]!;
}

export function getStepValueForCount(timeSigLabel: string, stepsPerPage: number): NoteValueKey {
  const configs = getStepConfigs(timeSigLabel);
  const match = configs.find((c) => c.steps === stepsPerPage);
  if (match) return match.stepValue;
  const sorted = [...configs].sort((a, b) => Math.abs(a.steps - stepsPerPage) - Math.abs(b.steps - stepsPerPage));
  return sorted[0]?.stepValue ?? '1/4';
}

export const TRACK_COLORS = [
  '#FF6B6B', '#FFB347', '#A8E06C', '#5BC0EB',
  '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1',
] as const;

const DEFAULT_GROUPS = ['kick', 'snare', 'hihat-close', 'clap'] as const;

/* ── Step / Track / Page / State types ────────────────────── */

export type SplitCount = 2 | 3 | 4;

export interface MultiStep {
  v: number;
  active: SplitCount;
  s: Partial<Record<SplitCount, number[]>>;
}

/** A single grid cell. number = primitive velocity, MultiStep = split cell with banks. */
export type Step = number | MultiStep | number[];

export type VelMode = 1 | 3 | 7;

export interface Track {
  id: string;
  name: string;
  color: string;
  sourceType: string;
  instrument: string | null;
  group: string | null;
  soundfontName: string | null;
  customSampleName: string | null;
  kitId?: string | null;
  kitSample?: string | null;
  volume: number;
  reverb: number;
  velMode: VelMode;
  _stashedSteps: Partial<Record<VelMode, Step[]>>;
  mute: boolean;
  solo: boolean;
  steps: Step[];
}

export interface SectionHeading {
  id: string;
  step: number;
  label: string;
}

export interface Page {
  id: string;
  name: string;
  tracks: Track[];
  sectionHeadings: SectionHeading[];
}

export interface CellRef {
  trackIndex: number;
  stepIndex: number;
}

export interface SequencerState {
  pages: Page[];
  currentPageIndex: number;
  stepsPerPage: number;
  bpm: number;
  noteValue: NoteValueKey;
  beatsPerBar: number;
  stepValue: NoteValueKey;
  swing: number;
  swingTarget: '8th' | '16th';
  humanize: number;
  chainMode: boolean;
  activeCell: CellRef | null;
  pendingSplit: SplitCount | null;
  /** Internal: scheduler page-advance hook injected at runtime. */
  _onPageAdvance?: (nextPage: number) => void;
}

/* ── Action union ─────────────────────────────────────────── */

export type SetTrackPropAction = {
  type: 'SET_TRACK_PROP';
  trackIndex: number;
  prop: keyof Track;
  value: Track[keyof Track];
};

export type SequencerAction =
  | { type: 'TOGGLE_CELL'; trackIndex: number; stepIndex: number }
  | { type: 'SET_CELL'; trackIndex: number; stepIndex: number; velocity: number }
  | SetTrackPropAction
  | { type: 'SET_TRACK_SOURCE'; trackIndex: number; sourceType: string; instrument?: string | null; group?: string | null; soundfontName?: string | null; customSampleName?: string | null; kitId?: string | null; kitSample?: string | null; name?: string }
  | { type: 'ADD_TRACK' }
  | { type: 'REMOVE_TRACK'; trackIndex: number }
  | { type: 'REORDER_TRACK'; fromIndex: number; toIndex: number }
  | { type: 'ADD_PAGE' }
  | { type: 'REMOVE_PAGE'; pageIndex: number }
  | { type: 'SET_CURRENT_PAGE'; pageIndex: number }
  | { type: 'SET_BPM'; bpm: number }
  | { type: 'SET_NOTE_VALUE'; noteValue: NoteValueKey }
  | { type: 'SET_TIME_SIG'; beatsPerBar: number; noteValue: NoteValueKey }
  | { type: 'SET_STEP_VALUE'; stepValue: NoteValueKey }
  | { type: 'SET_SWING'; swing: number }
  | { type: 'SET_SWING_TARGET'; swingTarget: '8th' | '16th' }
  | { type: 'SET_HUMANIZE'; humanize: number }
  | { type: 'SET_TRACK_VEL_MODE'; trackIndex: number; mode: VelMode }
  | { type: 'SET_STEPS_PER_PAGE'; stepsPerPage: number }
  | { type: 'TOGGLE_CHAIN_MODE' }
  | { type: 'CLEAR_PAGE' }
  | { type: 'ADD_SECTION_HEADING'; step: number; label: string }
  | { type: 'UPDATE_SECTION_HEADING'; id: string; label: string }
  | { type: 'MOVE_SECTION_HEADING'; id: string; step: number }
  | { type: 'REMOVE_SECTION_HEADING'; id: string }
  | { type: 'SET_ACTIVE_CELL'; cell: CellRef | null }
  | { type: 'SET_PENDING_SPLIT'; count: SplitCount | null }
  | { type: 'APPLY_SPLIT'; count: SplitCount; cell?: CellRef }
  | { type: 'UNSPLIT_CELL'; cell?: CellRef }
  | { type: 'TOGGLE_SUBSTEP'; trackIndex: number; stepIndex: number; subIndex: number }
  | { type: 'SET_SUBSTEP'; trackIndex: number; stepIndex: number; subIndex: number; velocity: number }
  | { type: 'LOAD_STATE'; state: SequencerState };

/* ── Factories ────────────────────────────────────────────── */

function makeTrack(index: number, stepsPerPage: number): Track {
  const group = DEFAULT_GROUPS[index] ?? 'kick';
  return {
    id: uuid(),
    name: group.charAt(0).toUpperCase() + group.slice(1),
    color: TRACK_COLORS[index % TRACK_COLORS.length]!,
    sourceType: 'drumMachine',
    instrument: 'TR-808',
    group,
    soundfontName: null,
    customSampleName: null,
    volume: 80,
    reverb: 20,
    velMode: 3,
    _stashedSteps: {},
    mute: false,
    solo: false,
    steps: new Array<Step>(stepsPerPage).fill(0),
  };
}

function makePage(name: string, stepsPerPage: number, tracks: Track[] | null = null): Page {
  return {
    id: uuid(),
    name,
    tracks: tracks ?? DEFAULT_GROUPS.map((_, i) => makeTrack(i, stepsPerPage)),
    sectionHeadings: [],
  };
}

export function createInitialState(): SequencerState {
  const stepsPerPage = 16;
  return {
    pages: [makePage('Page 1', stepsPerPage)],
    currentPageIndex: 0,
    stepsPerPage,
    bpm: 120,
    noteValue: '1/4',
    beatsPerBar: 4,
    stepValue: '1/16',
    swing: 0,
    swingTarget: '8th',
    humanize: 0,
    chainMode: false,
    activeCell: null,
    pendingSplit: null,
  };
}

/* ── Reducer ──────────────────────────────────────────────── */

export function sequencerReducer(state: SequencerState, action: SequencerAction): SequencerState {
  switch (action.type) {
    case 'TOGGLE_CELL': {
      const { trackIndex, stepIndex } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      const max = maxLevel(track.velMode || 3);
      const cur = track.steps[stepIndex];
      if (cur === undefined) return state;

      if (isMulti(cur)) {
        const newV = ((cur.v ?? 0) + 1) % (max + 1);
        cur.v = newV;
        if (cur.active && cur.s) {
          const existing = cur.s[cur.active];
          const bank = existing ? [...existing] : new Array<number>(cur.active).fill(0);
          bank[0] = newV;
          cur.s[cur.active] = bank;
        }
      } else if (isSplit(cur)) {
        cur[0] = ((cur[0] ?? 0) + 1) % (max + 1);
      } else {
        track.steps[stepIndex] = ((cur as number) + 1) % (max + 1);
      }
      return { ...state, pages };
    }

    case 'SET_CELL': {
      const { trackIndex, stepIndex, velocity } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      track.steps[stepIndex] = velocity;
      return { ...state, pages };
    }

    case 'SET_TRACK_PROP': {
      const { trackIndex, prop, value } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      // Caller is responsible for matching prop ↔ value types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (track as any)[prop] = value;
      return { ...state, pages };
    }

    case 'SET_TRACK_SOURCE': {
      const { trackIndex, sourceType, instrument, group, soundfontName, customSampleName, kitId, kitSample, name } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      track.sourceType = sourceType;
      track.instrument = instrument ?? null;
      track.group = group ?? null;
      track.soundfontName = soundfontName ?? null;
      track.customSampleName = customSampleName ?? null;
      track.kitId = kitId ?? null;
      track.kitSample = kitSample ?? null;
      if (name) track.name = name;
      return { ...state, pages };
    }

    case 'ADD_TRACK': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page) return state;
      const idx = page.tracks.length;
      page.tracks.push(makeTrack(idx, state.stepsPerPage));
      return { ...state, pages };
    }

    case 'REMOVE_TRACK': {
      const { trackIndex } = action;
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page) return state;
      page.tracks.splice(trackIndex, 1);
      return { ...state, pages };
    }

    case 'REORDER_TRACK': {
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex) return state;
      const pages = structuredClone(state.pages);
      const tracks = pages[state.currentPageIndex]?.tracks;
      if (!tracks) return state;
      if (fromIndex < 0 || fromIndex >= tracks.length) return state;
      if (toIndex < 0 || toIndex >= tracks.length) return state;
      const [moved] = tracks.splice(fromIndex, 1);
      if (moved) tracks.splice(toIndex, 0, moved);
      return { ...state, pages };
    }

    case 'ADD_PAGE': {
      const pages = structuredClone(state.pages);
      const currentTracks = pages[state.currentPageIndex]?.tracks ?? [];
      const newTracks: Track[] = currentTracks.map((t) => ({
        ...t,
        id: uuid(),
        steps: new Array<Step>(state.stepsPerPage).fill(0),
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
      const ts = TIME_SIGNATURES.find((t) => t.num === action.beatsPerBar && t.noteValue === action.noteValue);
      const label = ts?.label ?? '4/4';
      const cfg = getDefaultStepConfig(label);
      const newSteps = cfg.steps;
      const defaultStepDiv: NoteValueKey = (ts?.denom ?? 4) >= 8 ? '1/8' : '1/16';
      const pages = structuredClone(state.pages);
      for (const page of pages) {
        for (const track of page.tracks) {
          if (track.steps.length < newSteps) {
            track.steps = [...track.steps, ...new Array<Step>(newSteps - track.steps.length).fill(0)];
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
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      const oldMode = track.velMode || 3;
      if (mode === oldMode) return state;

      const stashed: Partial<Record<VelMode, Step[]>> = { ...(track._stashedSteps || {}) };
      stashed[oldMode] = structuredClone(track.steps);

      const convertStepValue = (v: Step): Step => {
        if (isMulti(v)) {
          const nextV = convertStep(v.v ?? 0, oldMode, mode);
          const nextS: Partial<Record<SplitCount, number[]>> = {};
          for (const [k, bank] of Object.entries(v.s ?? {})) {
            const key = Number(k) as SplitCount;
            if (bank) nextS[key] = bank.map((sv) => convertStep(sv, oldMode, mode));
          }
          return { v: nextV, active: v.active, s: nextS };
        }
        if (isSplit(v)) return v.map((sv) => convertStep(sv, oldMode, mode));
        return convertStep(v as number, oldMode, mode);
      };

      const stashedForNew = stashed[mode];
      if (stashedForNew) {
        track.steps = stashedForNew;
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
          if (track.steps.length < newSteps) {
            track.steps = [...track.steps, ...new Array<Step>(newSteps - track.steps.length).fill(0)];
          }
        }
      }
      const ts = TIME_SIGNATURES.find((t) => t.num === state.beatsPerBar && t.noteValue === state.noteValue);
      const stepValue = getStepValueForCount(ts?.label ?? '4/4', newSteps);
      return { ...state, pages, stepsPerPage: newSteps, stepValue };
    }

    case 'TOGGLE_CHAIN_MODE':
      return { ...state, chainMode: !state.chainMode };

    case 'CLEAR_PAGE': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page) return state;
      for (const track of page.tracks) {
        track.steps.fill(0);
      }
      return { ...state, pages };
    }

    case 'ADD_SECTION_HEADING': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page) return state;
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
      if (!page) return state;
      if (!page.sectionHeadings) page.sectionHeadings = [];
      const heading = page.sectionHeadings.find((h) => h.id === action.id);
      if (heading) heading.label = action.label;
      return { ...state, pages };
    }

    case 'MOVE_SECTION_HEADING': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page) return state;
      if (!page.sectionHeadings) page.sectionHeadings = [];
      const heading = page.sectionHeadings.find((h) => h.id === action.id);
      if (heading) heading.step = action.step;
      return { ...state, pages };
    }

    case 'REMOVE_SECTION_HEADING': {
      const pages = structuredClone(state.pages);
      const page = pages[state.currentPageIndex];
      if (!page) return state;
      if (!page.sectionHeadings) page.sectionHeadings = [];
      page.sectionHeadings = page.sectionHeadings.filter((h) => h.id !== action.id);
      return { ...state, pages };
    }

    case 'SET_ACTIVE_CELL': {
      return { ...state, activeCell: action.cell || null };
    }

    case 'SET_PENDING_SPLIT': {
      const count = action.count;
      if (count !== null && count !== 2 && count !== 3 && count !== 4) return state;
      return { ...state, pendingSplit: count };
    }

    case 'APPLY_SPLIT': {
      const count = action.count;
      if (count !== 2 && count !== 3 && count !== 4) return state;
      const target = action.cell ?? state.activeCell;
      if (!target) return { ...state, pendingSplit: count };

      const { trackIndex, stepIndex } = target;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      const cur = track.steps[stepIndex];
      if (cur === undefined) return state;

      let multi: MultiStep;
      if (isMulti(cur)) {
        multi = cur;
      } else {
        const baseVel = isSplit(cur) ? Math.max(...cur, 0) : (cur as number);
        multi = { v: baseVel, active: count, s: {} };
        if (isSplit(cur) && (cur.length === 2 || cur.length === 3 || cur.length === 4)) {
          multi.s[cur.length as SplitCount] = [...cur];
        }
        track.steps[stepIndex] = multi;
      }
      if (!multi.s) multi.s = {};
      if (!multi.s[count]) {
        const bank = new Array<number>(count).fill(0);
        bank[0] = multi.v ?? 0;
        multi.s[count] = bank;
      }
      multi.active = count;

      return {
        ...state,
        pages,
        activeCell: target,
        pendingSplit: null,
      };
    }

    case 'UNSPLIT_CELL': {
      const target = action.cell ?? state.activeCell;
      if (!target) return state;
      const { trackIndex, stepIndex } = target;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      const cur = track.steps[stepIndex];
      if (cur === undefined) return state;
      track.steps[stepIndex] = masterVelocity(cur);
      return { ...state, pages, pendingSplit: null };
    }

    case 'TOGGLE_SUBSTEP': {
      const { trackIndex, stepIndex, subIndex } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      const cur = track.steps[stepIndex];
      const max = maxLevel(track.velMode || 3);

      if (cur !== undefined && isMulti(cur)) {
        if (!cur.s) cur.s = {};
        const active = cur.active;
        if (!active) return state;
        const existing = cur.s[active];
        const bank = existing ? [...existing] : (() => {
          const a = new Array<number>(active).fill(0);
          a[0] = cur.v ?? 0;
          return a;
        })();
        bank[subIndex] = ((bank[subIndex] ?? 0) + 1) % (max + 1);
        cur.s[active] = bank;
      } else if (cur !== undefined && isSplit(cur)) {
        cur[subIndex] = ((cur[subIndex] ?? 0) + 1) % (max + 1);
      }
      return { ...state, pages };
    }

    case 'SET_SUBSTEP': {
      const { trackIndex, stepIndex, subIndex, velocity } = action;
      const pages = structuredClone(state.pages);
      const track = pages[state.currentPageIndex]?.tracks[trackIndex];
      if (!track) return state;
      const cur = track.steps[stepIndex];

      if (cur !== undefined && isMulti(cur)) {
        if (!cur.s) cur.s = {};
        const active = cur.active;
        if (!active) return state;
        const existing = cur.s[active];
        const bank = existing ? [...existing] : (() => {
          const a = new Array<number>(active).fill(0);
          a[0] = cur.v ?? 0;
          return a;
        })();
        bank[subIndex] = velocity;
        cur.s[active] = bank;
      } else if (cur !== undefined && isSplit(cur)) {
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
