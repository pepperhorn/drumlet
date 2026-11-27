import { describe, expect, it, vi } from 'vitest';
import { createNewPatternState } from './sequencerReducer.js';
import type { Step } from './sequencerReducer.js';
import { decodePayload, encodeState } from './shareCodec.js';

// Produced by encodeState at f8c05d6, including a split step and a Latin-1 name.
const V3_CODE = 'eyJ2IjozLCJiIjo5OCwic3ciOjAsInN0IjoiOHRoIiwiaHUiOjAsInNwIjo0LCJudiI6IjEvNCIsImJiIjo0LCJzdiI6IjEvMTYiLCJwbSI6eyJpZCI6ImNoYWxsZW5nZS1maXh0dXJlIn0sInQiOlt7Im4iOiJDYWbpIEtpY2siLCJzIjoiNzAoMSwzKTAiLCJ2bSI6Nywidm8iOjgwLCJydiI6MjAsInN0IjoiayIsImtpIjoiYWNvdXN0aWMxIiwia3MiOiJraWNrIn1dfQ';

describe('share codec', () => {
  it('round-trips three named pages and their headings when sharing from page 2', () => {
    const state = createNewPatternState();
    const track = state.pages[0]!.tracks[0]!;
    const steps: Step[][] = [[3, 0, 0, 0], [0, 1, [1, 3], 0], [0, 0, 0, 3]];
    state.stepsPerPage = 4;
    state.currentPageIndex = 1;
    state.pages = ['Intro', 'Verse', 'Finale'].map((name, index) => ({
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
      pg: [
        { n: 'Intro', t: [{ n: track.name, s: '3000' }] },
        { n: 'Verse', t: [{ n: track.name, s: '01(1,3)0' }] },
        { n: 'Finale', h: [[4, 'Chorus']], t: [{ n: track.name, s: '0003' }] },
      ],
    });
    expect(wire).not.toHaveProperty('t');
    expect(wire).not.toHaveProperty('pg.0.h');

    const decoded = decodePayload(code!);
    expect(decoded?.state.pages).toHaveLength(3);
    expect(decoded?.state.pages.map((page) => page.name)).toEqual(['Intro', 'Verse', 'Finale']);
    expect(decoded?.state.pages[1]?.tracks[0]?.steps).toEqual([0, 1, [1, 3], 0]);
    expect(decoded?.state.pages[0]?.sectionHeadings).toEqual([]);
    expect(decoded?.state.pages[2]?.sectionHeadings).toMatchObject([{ step: 4, label: 'Chorus' }]);
    expect(decoded?.state.currentPageIndex).toBe(0);
    expect(decoded?.pluginMeta).toEqual({ id: 'challenge' });
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
    const code = btoa(JSON.stringify({ v: 4, pg: [{ n: 'Intro', t: [], h: [[0, {}]] }] }));
    expect(decodePayload(code)).toBeNull();
  });

  it('returns null for a garbage string', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(decodePayload('not a share code!')).toBeNull();
  });
});
