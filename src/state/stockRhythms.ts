/**
 * Stock Rhythms — the generated multi-bar groove manifest (src/data/stockRhythms.json).
 *
 * Framework-free on purpose: embedding hosts (e.g. becreative) can import the
 * manifest + `stockRhythmToState` without pulling in React or the audio engine.
 * Source grooves live in scripts/stock-rhythms/; rebuild with `npm run build:rhythms`.
 */
import { v4 as uuid } from 'uuid';
import stockRhythmsData from '../data/stockRhythms.json';
import type { NoteValueKey, SequencerState, Step, Track, VelMode } from './sequencerReducer.js';

export type StockRhythmLevel = 'beginner' | 'intermediate';

export interface StockRhythmSource {
  sourceType: string;
  kitId: string | null;
  kitSample: string | null;
  instrument: string | null;
  group: string;
}

export interface StockRhythmTrack {
  voice: string;
  name: string;
  source: StockRhythmSource;
  velMode: number;
  /** One velocity string (0-3 per char) per bar. */
  bars: string[];
}

export interface StockRhythm {
  id: string;
  name: string;
  genre: string;
  level: StockRhythmLevel;
  timeSignature: string;
  /** Felt pulse (quarter, or dotted quarter in 6/8 & 12/8). */
  tempo: number;
  /** Engine bpm — what the transport displays. */
  bpm: number;
  beatsPerBar: number;
  noteValue: string;
  stepValue: string;
  stepsPerBar: number;
  /** 'acoustic' | drum machine id (e.g. 'TR-808'). */
  kit: string;
  kitLabel: string;
  swing: number;
  swingTarget: '8th' | '16th';
  barCount: number;
  form: string;
  description: string;
  tip: string;
  tags: string[];
  tracks: StockRhythmTrack[];
}

export interface StockRhythmManifest {
  _format: string;
  genres: string[];
  rhythms: StockRhythm[];
}

export const STOCK_RHYTHMS = stockRhythmsData as StockRhythmManifest;

/** Voice → DESIGN.md track accent, so instrument families read consistently. */
const VOICE_COLORS: Record<string, string> = {
  hh: '#A8E06C', ho: '#A8E06C', hf: '#A8E06C',
  rd: '#5BC0EB', rb: '#5BC0EB', cr: '#5BC0EB',
  sn: '#FFB347', xs: '#FFB347',
  bd: '#FF6B6B',
  t1: '#B39DDB', ft: '#B39DDB',
  cb: '#FFAB91', cl: '#FFAB91', ts: '#FFAB91',
  ch: '#66D9A0', cm: '#66D9A0', cg: '#66D9A0',
  sh: '#F48FB1', cp: '#F48FB1',
};

function barToSteps(bar: string): Step[] {
  return [...bar].map((c) => Number(c) || 0);
}

function hydrateTrack(track: StockRhythmTrack, barIndex: number, id: string): Track {
  return {
    id,
    name: track.name,
    color: VOICE_COLORS[track.voice] ?? '#B39DDB',
    sourceType: track.source.sourceType,
    instrument: track.source.instrument,
    group: track.source.group,
    kitId: track.source.kitId,
    kitSample: track.source.kitSample,
    soundfontName: null,
    customSampleName: null,
    volume: 80,
    reverb: 20,
    velMode: track.velMode as VelMode,
    _stashedSteps: {},
    mute: false,
    solo: false,
    steps: barToSteps(track.bars[barIndex] ?? ''),
  };
}

/**
 * Expand a stock rhythm into sequencer state: one page per bar, chain mode on
 * so the full 4–8 bar phrase plays through before looping.
 */
export function stockRhythmToState(rhythm: StockRhythm): Partial<SequencerState> {
  // One id per voice, shared by every bar: track settings are global across
  // pages and the audio engine caches instruments by track id, so chained bars
  // reuse loaded sounds instead of dropping the first hits of each new bar.
  const trackIds = rhythm.tracks.map(() => uuid());
  return {
    pages: Array.from({ length: rhythm.barCount }, (_, barIndex) => ({
      id: uuid(),
      name: `Bar ${barIndex + 1}`,
      sectionHeadings: [],
      tracks: rhythm.tracks.map((t, i) => hydrateTrack(t, barIndex, trackIds[i]!)),
    })),
    currentPageIndex: 0,
    stepsPerPage: rhythm.stepsPerBar,
    bpm: rhythm.bpm,
    beatsPerBar: rhythm.beatsPerBar,
    noteValue: rhythm.noteValue as NoteValueKey,
    stepValue: rhythm.stepValue as NoteValueKey,
    swing: rhythm.swing,
    swingTarget: rhythm.swingTarget,
    humanize: 0,
    chainMode: true,
  };
}

export function findStockRhythm(id: string): StockRhythm | null {
  return STOCK_RHYTHMS.rhythms.find((r) => r.id === id) ?? null;
}
