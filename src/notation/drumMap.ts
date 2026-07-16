/**
 * Maps drum sound names to percussion staff positions.
 */

import type { Track } from '../state/sequencerReducer.js';

type HeadType = 'filled' | 'x' | 'xo' | 'diamond' | 'triangle';

type Pos = '-0.5' | '0' | '1' | '1.5' | '2' | '2.5' | '3' | '3.5' | '4' | '4.5' | '5' | '5.5';

const POS_TO_MEI_PITCH: Record<Pos, [string, number]> = {
  '-0.5': ['f', 3],
  '0':    ['g', 3],
  '1':    ['a', 3],
  '1.5':  ['b', 3],
  '2':    ['c', 4],
  '2.5':  ['d', 4],
  '3':    ['e', 4],
  '3.5':  ['f', 4],
  '4':    ['f', 4],
  '4.5':  ['g', 4],
  '5':    ['f', 4],
  '5.5':  ['g', 4],
};

export interface NotationInfo {
  pos: number;
  head: HeadType;
}

export interface MeiPitch {
  pname: string;
  oct: number;
}

const NOTATION_MAP: Record<string, NotationInfo> = {
  'kick':       { pos: 0,   head: 'filled' },
  'kick-alt':   { pos: 0,   head: 'filled' },
  'snare':      { pos: 2.5, head: 'filled' },
  'snare-h':    { pos: 2.5, head: 'filled' },
  'snare-m':    { pos: 2.5, head: 'filled' },
  'snare-l':    { pos: 2.5, head: 'filled' },
  'snare-on1':  { pos: 2.5, head: 'filled' },
  'snare-on2':  { pos: 2.5, head: 'filled' },
  'snare-off':  { pos: 2.5, head: 'filled' },
  'crossstick': { pos: 2.5, head: 'x' },
  'rimshot':    { pos: 2.5, head: 'x' },
  'hihat-close':  { pos: 5, head: 'x' },
  'hihat-closed': { pos: 5, head: 'x' },
  'hihat-open':   { pos: 5, head: 'xo' },
  'hhclosed':     { pos: 5, head: 'x' },
  'hhopen':       { pos: 5, head: 'xo' },
  'hh-closed1':   { pos: 5, head: 'x' },
  'hh-closed2':   { pos: 5, head: 'x' },
  'hh-open':      { pos: 5, head: 'xo' },
  'hh-foot':      { pos: -0.5, head: 'x' },
  'tom-hi':     { pos: 3.5, head: 'filled' },
  'tom-high':   { pos: 3.5, head: 'filled' },
  'tom-hh':     { pos: 3.5, head: 'filled' },
  'tom-1':      { pos: 3.5, head: 'filled' },
  'hi-tom':     { pos: 3.5, head: 'filled' },
  'mid-tom':    { pos: 2.5, head: 'filled' },
  'tom-mid':    { pos: 2.5, head: 'filled' },
  'tom-m':      { pos: 2.5, head: 'filled' },
  'tom-2':      { pos: 2.5, head: 'filled' },
  'tom-low':    { pos: 1.5, head: 'filled' },
  'tom-l':      { pos: 1.5, head: 'filled' },
  'tom-ll':     { pos: 1,   head: 'filled' },
  'tom-3':      { pos: 1.5, head: 'filled' },
  'floor-tom':  { pos: 1.5, head: 'filled' },
  'crash':      { pos: 5.5, head: 'x' },
  'cymbal':     { pos: 5.5, head: 'x' },
  'cymball':    { pos: 5.5, head: 'x' },
  'ride':       { pos: 4.5, head: 'x' },
  'ride-bell':  { pos: 4,   head: 'diamond' },
  'cowbell':    { pos: 5.5, head: 'triangle' },
  'clave':      { pos: 5.5, head: 'x' },
  'conga-hi':   { pos: 3.5, head: 'filled' },
  'conga-high': { pos: 3.5, head: 'filled' },
  'conga-mid':  { pos: 2.5, head: 'filled' },
  'conga-low':  { pos: 1.5, head: 'filled' },
  'tambourine': { pos: 5.5, head: 'triangle' },
  'maraca':     { pos: 5.5, head: 'triangle' },
  'cabasa':     { pos: 5.5, head: 'triangle' },
  'agogo':      { pos: 5.5, head: 'triangle' },
};

export function getNotation(track: Pick<Track, 'kitSample' | 'group'>): NotationInfo {
  const key = track.kitSample || track.group || '';
  return NOTATION_MAP[key] ?? NOTATION_MAP[key.toLowerCase()] ?? { pos: 2.5, head: 'filled' };
}

export function toMeiPitch(notation: NotationInfo): MeiPitch {
  const posStr = String(notation.pos) as Pos;
  const mapping = POS_TO_MEI_PITCH[posStr];
  if (!mapping) return { pname: 'd', oct: 4 };
  const [pname, oct] = mapping;
  return { pname, oct };
}
