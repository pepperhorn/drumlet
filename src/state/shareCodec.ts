// SPDX-License-Identifier: MIT
/**
 * Share codec — encodes/decodes sequencer state to/from a compact URL-safe string.
 *
 * Format: base64url-encoded JSON stored in the URL hash.
 *
 * Share URL:  https://drumlet.app/#s={encoded}
 * Embed URL:  https://drumlet.app/embed#s={encoded}
 *             or https://drumlet.app/?embed=1#s={encoded}
 *
 * The encoded payload is a minimal representation — only what's needed to
 * reconstruct the pattern. No UUIDs, no stashed steps, no mute/solo state.
 */

import type { SequencerState, Step, NoteValueKey, Page, Track } from './sequencerReducer.js';

interface EncodedTrackMeta {
  n: string;
  vm?: number;
  vo?: number;
  rv?: number;
  st?: 'dm' | 'sf' | 'k';
  i?: string | null;
  g?: string | null;
  sf?: string | null;
  ki?: string | null;
  ks?: string | null;
}

type EncodedTrack = EncodedTrackMeta & { s: string };

interface EncodedPage {
  n?: string;
  h?: [step: number, label: string][];
  s: (string | 0)[];
}

interface PayloadFields {
  b: number;
  sw: number;
  st: string;
  hu: number;
  sp: number;
  nv: string;
  bb: number;
  sv: string;
  pm: Record<string, unknown> | null;
}

type EncodedPayload = PayloadFields & (
  | { v: 1 | 2 | 3; t: EncodedTrack[] }
  | { v: 4; t: EncodedTrackMeta[]; pg: EncodedPage[] }
);

export interface DecodedPayload {
  state: SequencerState;
  pluginMeta: Record<string, unknown> | null;
}

function encodeSteps(steps: Step[], count: number): string {
  return steps.slice(0, count).map((s) => {
    if (Array.isArray(s)) return `(${s.join(',')})`;
    if (typeof s === 'object' && s !== null) {
      // multi-step — flatten to its currently active bank for sharing
      const m = s;
      const bank = m.s?.[m.active] ?? [m.v ?? 0];
      return `(${bank.join(',')})`;
    }
    return String(s);
  }).join('');
}

export function encodeState(state: SequencerState, pluginMeta: Record<string, unknown> | null = null): string | null {
  if (!state.pages.length) return null;

  const tracks: EncodedTrackMeta[] = [];
  const trackIndices = new Map<string, number>();
  const pages = state.pages.map((page, pageIndex): EncodedPage => {
    const claimed = new Set<number>();
    const knownIndices = page.tracks.map((track) => {
      const index = trackIndices.get(track.id);
      if (index === undefined || claimed.has(index)) return undefined;
      claimed.add(index);
      return index;
    });
    const steps = new Array<string | 0>(tracks.length).fill(0);

    page.tracks.forEach((track, position) => {
      let index = knownIndices[position];
      if (index === undefined) {
        const meta = encodeTrackMeta(track);
        // ADD_PAGE mints new ids for copies of the same track.
        if (!claimed.has(position) && JSON.stringify(tracks[position]) === JSON.stringify(meta)) {
          index = position;
        } else {
          index = tracks.length;
          tracks.push(meta);
        }
        claimed.add(index);
        trackIndices.set(track.id, index);
      }
      const pattern = encodeSteps(track.steps, state.stepsPerPage);
      steps[index] = /^0*$/.test(pattern) ? 0 : pattern;
    });

    return {
      n: page.name === defaultPageName(pageIndex) ? undefined : page.name,
      h: page.sectionHeadings?.length
        ? page.sectionHeadings.map(({ step, label }) => [step, label])
        : undefined,
      s: steps,
    };
  });

  for (const page of pages) {
    while (page.s.length < tracks.length) page.s.push(0);
  }

  const payload: EncodedPayload = {
    v: 4,
    b: state.bpm,
    sw: state.swing || 0,
    st: state.swingTarget || '8th',
    hu: state.humanize || 0,
    sp: state.stepsPerPage,
    nv: state.noteValue || '1/4',
    bb: state.beatsPerBar || 4,
    sv: state.stepValue || '1/16',
    pm: pluginMeta,
    t: tracks,
    pg: pages,
  };

  // Escape Unicode in the JSON so btoa can encode it without changing legacy decoding.
  const json = JSON.stringify(payload).replace(/[\u0080-\uffff]/g, (char) =>
    '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'),
  );
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function defaultPageName(index: number): string {
  return `Page ${index + 1}`;
}

function encodeTrackMeta(t: Track): EncodedTrackMeta {
  const tr: EncodedTrackMeta = {
    n: t.name,
    vm: t.velMode === 3 ? undefined : t.velMode,
    vo: t.volume === 80 ? undefined : t.volume,
    rv: t.reverb === 20 ? undefined : t.reverb,
  };
  if (t.sourceType === 'drumMachine') {
    tr.st = 'dm';
    tr.i = t.instrument;
    tr.g = t.group;
  } else if (t.sourceType === 'soundfont') {
    tr.st = 'sf';
    tr.sf = t.soundfontName;
  } else if (t.sourceType === 'kit') {
    tr.st = 'k';
    tr.ki = t.kitId ?? null;
    tr.ks = t.kitSample ?? null;
  }
  return tr;
}

export function decodeState(encoded: string): SequencerState | null {
  const payload = decodePayload(encoded);
  return payload?.state ?? null;
}

function decodeStepsString(str: string): Step[] {
  const matches = [...str.matchAll(/\([\d,]+\)|\d/g)];
  return matches.map((m): Step => {
    const text = m[0];
    if (text.startsWith('(')) {
      return text.slice(1, -1).split(',').map(Number);
    }
    return Number(text);
  });
}

const COLORS = ['#FF6B6B', '#FFB347', '#A8E06C', '#5BC0EB', '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1'];
const MAX_V4_GRID_CELLS = 1_000_000;

export function decodePayload(encoded: string): DecodedPayload | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = atob(b64);
    const p = JSON.parse(json) as EncodedPayload;

    if (p.v !== 1 && p.v !== 2 && p.v !== 3 && p.v !== 4) return null;
    const stepsPerPage = p.sp || 16;
    let pages: Page[];
    if (p.v === 4) {
      if (!Array.isArray(p.t) || !Array.isArray(p.pg)) return null;
      if (p.t.some((track) => typeof track?.n !== 'string')) return null;
      if (p.pg.some((page) => !hasValidPageFields(page, p.t.length))) return null;
      // Compact rest entries must not expand into an unbounded grid.
      const gridCells = stepsPerPage * Math.max(1, p.t.length) * Math.max(1, p.pg.length);
      if (!Number.isSafeInteger(stepsPerPage) || stepsPerPage < 1 ||
        gridCells > MAX_V4_GRID_CELLS) return null;
      const ids = p.t.map(() => crypto.randomUUID());
      pages = p.pg.map((page, i) => ({
        id: crypto.randomUUID(),
        name: page.n ?? defaultPageName(i),
        tracks: p.t.map((track, index) => {
          const pattern = page.s[index]!;
          const steps = pattern === 0 ? new Array<Step>(stepsPerPage).fill(0) : decodeStepsString(pattern);
          return decodeTrack(track, index, ids[index]!, steps);
        }),
        sectionHeadings: page.h?.map(([step, label]) => ({ id: crypto.randomUUID(), step, label })) ?? [],
      }));
    } else {
      pages = [{
        id: crypto.randomUUID(),
        name: defaultPageName(0),
        tracks: p.t.map((track, index) => decodeTrack(
          track,
          index,
          crypto.randomUUID(),
          p.v === 3 ? decodeStepsString(track.s) : track.s.split('').map(Number),
        )),
        sectionHeadings: [],
      }];
    }

    const state: SequencerState = {
      pages,
      currentPageIndex: 0,
      stepsPerPage,
      bpm: p.b || 120,
      noteValue: (p.nv || '1/4') as NoteValueKey,
      beatsPerBar: p.bb || 4,
      stepValue: (p.sv || '1/16') as NoteValueKey,
      swing: p.sw || 0,
      swingTarget: (p.st === '16th' ? '16th' : '8th'),
      humanize: p.hu || 0,
      chainMode: pages.length > 1,
      activeCell: null,
      pendingSplit: null,
    };

    return { state, pluginMeta: p.pm ?? null };
  } catch (e) {
    console.error('Failed to decode share URL:', e);
    return null;
  }
}

function hasValidPageFields(page: EncodedPage, trackCount: number): boolean {
  if (!page || (page.n !== undefined && typeof page.n !== 'string') ||
    !Array.isArray(page.s) || page.s.length !== trackCount ||
    page.s.some((pattern) => pattern !== 0 && typeof pattern !== 'string')) return false;
  if (page.h === undefined) return true;
  return Array.isArray(page.h) && page.h.every((heading) =>
    Array.isArray(heading) && heading.length === 2 &&
    Number.isInteger(heading[0]) && heading[0] >= 0 && typeof heading[1] === 'string'
  );
}

function decodeTrack(tr: EncodedTrackMeta, i: number, id: string, steps: Step[]): Track {
  const base: Track = {
    id,
    name: tr.n,
    color: COLORS[i % COLORS.length]!,
    volume: tr.vo ?? 80,
    reverb: tr.rv ?? 20,
    velMode: (tr.vm || 3) as 1 | 3 | 7,
    _stashedSteps: {},
    mute: false,
    solo: false,
    steps,
    soundfontName: null,
    customSampleName: null,
    kitId: null,
    kitSample: null,
    instrument: null,
    group: null,
    sourceType: 'drumMachine',
  };

  if (tr.st === 'dm') {
    base.instrument = tr.i || 'TR-808';
    base.group = tr.g || 'kick';
  } else if (tr.st === 'sf') {
    base.sourceType = 'soundfont';
    base.soundfontName = tr.sf ?? null;
  } else if (tr.st === 'k') {
    base.sourceType = 'kit';
    base.kitId = tr.ki ?? null;
    base.kitSample = tr.ks ?? null;
  } else {
    base.instrument = 'TR-808';
    base.group = 'kick';
  }

  return base;
}

export function buildShareUrl(state: SequencerState, baseUrl = 'https://drumlet.app', pluginMeta: Record<string, unknown> | null = null): string | null {
  const encoded = encodeState(state, pluginMeta);
  if (!encoded) return null;
  return `${baseUrl}/#s=${encoded}`;
}

export function buildEmbedUrl(state: SequencerState, baseUrl = 'https://drumlet.app', pluginMeta: Record<string, unknown> | null = null): string | null {
  const encoded = encodeState(state, pluginMeta);
  if (!encoded) return null;
  return `${baseUrl}/?embed=1#s=${encoded}`;
}

export function buildEmbedSnippet(state: SequencerState, baseUrl = 'https://drumlet.app', pluginMeta: Record<string, unknown> | null = null): string | null {
  const url = buildEmbedUrl(state, baseUrl, pluginMeta);
  if (!url) return null;
  return `<iframe title="Drumlet groove" src="${url}" width="100%" height="400" frameborder="0" style="border-radius:16px;border:1px solid #E2E8F0;" allow="autoplay"></iframe>`;
}

export function buildNpmEmbedSnippet(state: SequencerState): string | null {
  const code = encodeState(state);
  if (!code) return null;
  return `// npm i @pepperhorn/drumlet-player
import { DrumletPlayer } from '@pepperhorn/drumlet-player';
import '@pepperhorn/drumlet-player/style.css';

export function Groove() {
  return <DrumletPlayer groove={{ share: '${code}' }} />;
}`;
}

export function loadFromUrl(): SequencerState | null {
  const payload = loadSharedPayload();
  return payload?.state ?? null;
}

export function loadSharedPayload(): DecodedPayload | null {
  const hash = window.location.hash;
  const match = hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  if (match && match[1]) {
    return decodePayload(match[1]);
  }
  return null;
}

export function isEmbedMode(): boolean {
  return new URLSearchParams(window.location.search).has('embed');
}
