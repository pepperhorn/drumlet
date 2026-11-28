import { describe, expect, it, vi } from 'vitest';
import { createNewPatternState } from './sequencerReducer.js';
import type { Step, Track } from './sequencerReducer.js';
import { findStockRhythm, stockRhythmToState } from './stockRhythms.js';
import { buildEmbedSnippet, buildNpmEmbedSnippet, buildShareUrl, decodePayload, encodeState } from './shareCodec.js';

// Produced by encodeState at f8c05d6, including a split step and a Latin-1 name.
const V3_CODE = 'eyJ2IjozLCJiIjo5OCwic3ciOjAsInN0IjoiOHRoIiwiaHUiOjAsInNwIjo0LCJudiI6IjEvNCIsImJiIjo0LCJzdiI6IjEvMTYiLCJwbSI6eyJpZCI6ImNoYWxsZW5nZS1maXh0dXJlIn0sInQiOlt7Im4iOiJDYWbpIEtpY2siLCJzIjoiNzAoMSwzKTAiLCJ2bSI6Nywidm8iOjgwLCJydiI6MjAsInN0IjoiayIsImtpIjoiYWNvdXN0aWMxIiwia3MiOiJraWNrIn1dfQ';

describe('share codec', () => {
  it('round-trips three named pages and their headings when sharing from page 2', () => {
    const state = createNewPatternState();
    const track = state.pages[0]!.tracks[0]!;
    const steps: Step[][] = [[3, 0, 0, 0], [0, 1, [1, 3], 0], [0, 0, 0, 3]];
    state.stepsPerPage = 4;
    state.currentPageIndex = 1;
    state.pages = ['Page 1', 'Verse', 'Finale'].map((name, index) => ({
      id: `page-${index}`,
      name,
      tracks: [{ ...track, id: `track-${index}`, steps: steps[index]! }],
      sectionHeadings: index === 2 ? [{ id: 'chorus', step: 4, label: 'Chorus' }] : [],
    }));

    const code = encodeState(state, { id: 'challenge' });
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const wire: unknown = JSON.parse(atob(code!.replace(/-/g, '+').replace(/_/g, '/')));
    expect(wire).toMatchObject({
      v: 4,
      t: [{ n: track.name }],
      pg: [
        { s: ['3000'] },
        { n: 'Verse', s: ['01(1,3)0'] },
        { n: 'Finale', h: [[4, 'Chorus']], s: ['0003'] },
      ],
    });
    expect(wire).not.toHaveProperty('t.0.s');
    expect(wire).not.toHaveProperty('pg.0.t');
    expect(wire).not.toHaveProperty('pg.0.n');
    expect(wire).not.toHaveProperty('pg.0.h');

    const decoded = decodePayload(code!);
    expect(decoded?.state.pages).toHaveLength(3);
    expect(decoded?.state.pages.map((page) => page.name)).toEqual(['Page 1', 'Verse', 'Finale']);
    expect(decoded?.state.pages[1]?.tracks[0]?.steps).toEqual([0, 1, [1, 3], 0]);
    expect(decoded?.state.pages[0]?.sectionHeadings).toEqual([]);
    expect(decoded?.state.pages[2]?.sectionHeadings).toMatchObject([{ step: 4, label: 'Chorus' }]);
    expect(decoded?.state.pages[0]?.tracks.map(({ id }) => id))
      .toEqual(decoded?.state.pages[2]?.tracks.map(({ id }) => id));
    expect(decoded?.state.chainMode).toBe(true);
    expect(decoded?.state.currentPageIndex).toBe(0);
    expect(decoded?.pluginMeta).toEqual({ id: 'challenge' });
  });

  it('round-trips drum machine, soundfont and kit tracks with their velocity modes', () => {
    const state = createNewPatternState();
    const page = state.pages[0]!;
    const [dm, sf, kit] = page.tracks;
    const sources: Partial<Track>[] = [
      { sourceType: 'drumMachine', instrument: 'LM-2', group: 'snare', velMode: 1, volume: 0, reverb: 36, steps: [1, 0, 0, 0] },
      { sourceType: 'soundfont', soundfontName: 'taiko', velMode: 3, volume: 80, reverb: 20, steps: [0, [1, 3], 0, 0] },
      { sourceType: 'kit', kitId: 'acoustic1', kitSample: 'ride', velMode: 7, steps: [0, 0, [4, 7, 0], 0] },
    ];
    state.stepsPerPage = 4;
    page.tracks = [dm!, sf!, kit!].map((track, index) => ({
      ...track,
      ...sources[index],
    }));
    state.pages.push({ ...page, name: 'Page 2', tracks: page.tracks.map((track) => ({
      ...track,
      steps: [0, 0, 0, 0],
    })) });

    const decoded = decodePayload(encodeState(state)!);
    expect(decoded?.state.pages[0]?.tracks).toMatchObject(sources);
    expect(decoded?.state.pages[1]?.tracks.map(({ steps }) => steps)).toEqual([
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
    ]);
    const first = decoded?.state.pages[0]?.tracks.map(({ id }) => id);
    expect(new Set(first).size).toBe(3);
    expect(decoded?.state.pages[1]?.tracks.map(({ id }) => id)).toEqual(first);
  });

  it('appends a later-only track and aligns reordered tracks by id', () => {
    const state = createNewPatternState();
    const page = state.pages[0]!;
    const [first, second, later] = page.tracks;
    state.stepsPerPage = 4;
    state.pages = [
      { ...page, tracks: [{ ...first!, steps: [1, 0, 0, 0] }, { ...second!, steps: [0, 0, 0, 0] }] },
      { ...page, name: 'Page 2', tracks: [{ ...later!, steps: [0, 3, 0, 0] }, { ...first!, steps: [0, 0, 0, 1] }] },
    ];

    const code = encodeState(state)!;
    const wire: unknown = JSON.parse(atob(code.replace(/-/g, '+').replace(/_/g, '/')));
    expect(wire).toMatchObject({
      t: [{ n: first!.name }, { n: second!.name }, { n: later!.name }],
      pg: [{ s: ['1000', 0, 0] }, { s: ['0001', 0, '0300'] }],
    });
    const decoded = decodePayload(code);
    expect(decoded?.state.pages.map((p) => p.tracks.map(({ steps }) => steps))).toEqual([
      [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 1], [0, 0, 0, 0], [0, 3, 0, 0]],
    ]);
  });

  it('fits the Cuban Cha-Cha stock groove in a 1,600-character share URL', () => {
    const state = { ...createNewPatternState(), ...stockRhythmToState(findStockRhythm('cuban-cha-cha')!) };
    expect(buildShareUrl(state)!.length).toBeLessThanOrEqual(1600);
  });

  it('preserves Unicode in page names, track names and headings', () => {
    const state = createNewPatternState();
    const page = state.pages[0]!;
    page.name = '第1節';
    page.tracks[0]!.name = '🥁';
    page.sectionHeadings = [{ id: 'heading', step: 0, label: 'リズム – entrée' }];

    expect(decodePayload(encodeState(state)!)?.state.pages[0]).toMatchObject({
      name: '第1節',
      tracks: page.tracks.map(({ name }) => ({ name })),
      sectionHeadings: [{ step: 0, label: 'リズム – entrée' }],
    });
  });

  it('decodes the v3 fixture as one page with identical steps and plugin metadata', () => {
    const decoded = decodePayload(V3_CODE);
    expect(decoded?.state.pages).toHaveLength(1);
    expect(decoded?.state.pages[0]).toMatchObject({
      name: 'Page 1',
      sectionHeadings: [],
      tracks: [{
        name: 'Café Kick',
        steps: [7, 0, [1, 3], 0],
        sourceType: 'kit',
        kitId: 'acoustic1',
        kitSample: 'kick',
      }],
    });
    expect(decoded?.pluginMeta).toEqual({ id: 'challenge-fixture' });
  });

  it.each([1, 2])('decodes v%i digit steps as one page', (version) => {
    const code = btoa(JSON.stringify({ v: version, sp: 4, t: [{ n: 'Kick', s: '1030' }] }))
      .replace(/=+$/, '');
    expect(decodePayload(code)?.state.pages).toMatchObject([
      { name: 'Page 1', sectionHeadings: [], tracks: [{ name: 'Kick', steps: [1, 0, 3, 0] }] },
    ]);
  });

  it('rejects a v4 section heading with a non-string label', () => {
    const code = btoa(JSON.stringify({ v: 4, t: [], pg: [{ n: 'Intro', s: [], h: [[0, {}]] }] }));
    expect(decodePayload(code)).toBeNull();
  });

  it('rejects a v4 step row that does not match the track table', () => {
    const code = btoa(JSON.stringify({ v: 4, t: [{ n: 'Kick' }], pg: [{ s: [] }] }));
    expect(decodePayload(code)).toBeNull();
  });

  it('rejects a compact rest row that would expand into an oversized grid', () => {
    const code = btoa(JSON.stringify({ v: 4, sp: 1_000_001, t: [{ n: 'Kick' }], pg: [{ s: [0] }] }));
    expect(decodePayload(code)).toBeNull();
  });

  it('returns null for a garbage string', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(decodePayload('not a share code!')).toBeNull();
  });
});

describe('embed snippets', () => {
  it('keeps the legacy iframe route, challenge metadata and autoplay permission', () => {
    const state = createNewPatternState();
    const pluginMeta = { modeId: 'rhythm-challenge' };
    const snippet = buildEmbedSnippet(state, 'https://example.com', pluginMeta);
    const template = document.createElement('template');
    template.innerHTML = snippet!;
    const iframe = template.content.querySelector('iframe');
    const url = new URL(iframe!.src);
    expect(`${url.origin}${url.pathname}${url.search}`).toBe('https://example.com/?embed=1');
    expect(decodePayload(url.hash.slice(3))?.pluginMeta).toEqual(pluginMeta);
    expect(iframe?.getAttribute('title')).toBe('Drumlet groove');
    expect(iframe?.getAttribute('width')).toBe('100%');
    expect(iframe?.getAttribute('height')).toBe('400');
    expect(iframe?.getAttribute('allow')).toBe('autoplay');
  });

  it('includes install, imports and a React component with the full share code', () => {
    const state = createNewPatternState();
    state.pages.push({ ...state.pages[0]!, name: 'Finale' });
    const snippet = buildNpmEmbedSnippet(state);
    expect(snippet).toContain('npm i @pepperhorn/drumlet-player');
    expect(snippet).toContain("import { DrumletPlayer } from '@pepperhorn/drumlet-player'");
    expect(snippet).toContain("import '@pepperhorn/drumlet-player/style.css'");
    const code = snippet?.match(/<DrumletPlayer groove=\{\{ share: '([A-Za-z0-9_-]+)' \}\} \/>/)?.[1];
    expect(decodePayload(code!)?.state.pages.map(({ name }) => name)).toEqual(['Page 1', 'Finale']);
  });

  it('does not generate snippets without pages', () => {
    const state = { ...createNewPatternState(), pages: [] };
    expect(buildEmbedSnippet(state)).toBeNull();
    expect(buildNpmEmbedSnippet(state)).toBeNull();
  });
});
