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

import type { SequencerState, Step, NoteValueKey } from './sequencerReducer.js';

interface EncodedTrack {
  n: string;
  s: string;
  vm: number;
  vo: number;
  rv: number;
  st?: 'dm' | 'sf' | 'k';
  i?: string | null;
  g?: string | null;
  sf?: string | null;
  ki?: string | null;
  ks?: string | null;
}

interface EncodedPayload {
  v: number;
  b: number;
  sw: number;
  st: string;
  hu: number;
  sp: number;
  nv: string;
  bb: number;
  sv: string;
  pm: Record<string, unknown> | null;
  t: EncodedTrack[];
}

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
  const page = state.pages[state.currentPageIndex];
  if (!page) return null;

  const payload: EncodedPayload = {
    v: 3,
    b: state.bpm,
    sw: state.swing || 0,
    st: state.swingTarget || '8th',
    hu: state.humanize || 0,
    sp: state.stepsPerPage,
    nv: state.noteValue || '1/4',
    bb: state.beatsPerBar || 4,
    sv: state.stepValue || '1/16',
    pm: pluginMeta,
    t: page.tracks.map((t): EncodedTrack => {
      const tr: EncodedTrack = {
        n: t.name,
        s: encodeSteps(t.steps, state.stepsPerPage),
        vm: t.velMode || 3,
        vo: t.volume,
        rv: t.reverb,
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
    }),
  };

  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

export function decodePayload(encoded: string): DecodedPayload | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = atob(b64);
    const p = JSON.parse(json) as EncodedPayload;

    if (p.v !== 1 && p.v !== 2 && p.v !== 3) return null;

    const tracks = p.t.map((tr, i) => {
      const baseSteps: Step[] = p.v >= 3
        ? decodeStepsString(tr.s)
        : tr.s.split('').map(Number);

      const base = {
        id: crypto.randomUUID(),
        name: tr.n,
        color: COLORS[i % COLORS.length]!,
        volume: tr.vo ?? 80,
        reverb: tr.rv ?? 20,
        velMode: (tr.vm || 3) as 1 | 3 | 7,
        _stashedSteps: {},
        mute: false,
        solo: false,
        steps: baseSteps,
        soundfontName: null as string | null,
        customSampleName: null as string | null,
        kitId: null as string | null,
        kitSample: null as string | null,
        instrument: null as string | null,
        group: null as string | null,
        sourceType: 'drumMachine' as string,
      };

      if (tr.st === 'dm') {
        base.sourceType = 'drumMachine';
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
        base.sourceType = 'drumMachine';
        base.instrument = 'TR-808';
        base.group = 'kick';
      }

      return base;
    });

    const state: SequencerState = {
      pages: [{
        id: crypto.randomUUID(),
        name: 'Page 1',
        tracks,
        sectionHeadings: [],
      }],
      currentPageIndex: 0,
      stepsPerPage: p.sp || 16,
      bpm: p.b || 120,
      noteValue: (p.nv || '1/4') as NoteValueKey,
      beatsPerBar: p.bb || 4,
      stepValue: (p.sv || '1/16') as NoteValueKey,
      swing: p.sw || 0,
      swingTarget: (p.st === '16th' ? '16th' : '8th'),
      humanize: p.hu || 0,
      chainMode: false,
      activeCell: null,
      pendingSplit: null,
    };

    return { state, pluginMeta: p.pm ?? null };
  } catch (e) {
    console.error('Failed to decode share URL:', e);
    return null;
  }
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
  return `<iframe src="${url}" width="100%" height="400" frameborder="0" style="border-radius:16px;border:1px solid #E2E8F0;" allow="autoplay"></iframe>`;
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
