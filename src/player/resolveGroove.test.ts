import { describe, expect, it, vi } from 'vitest';
import { loadPresetByName, presetToState } from '../state/presets.js';
import { serializeProject } from '../state/projectSerializer.js';
import { createInitialState, createNewPatternState } from '../state/sequencerReducer.js';
import { encodeState } from '../state/shareCodec.js';
import { GrooveError, loadStockRhythms, resolveGroove, resolveGrooveAsync } from './resolveGroove.js';

function dottlFixture() {
  const preset = loadPresetByName('Funky Drummer')!;
  const { pages, ...state } = presetToState(preset);
  return serializeProject({
    ...createInitialState(),
    ...state,
    pages: pages.map((page) => ({ ...page, sectionHeadings: [] })),
  }, preset);
}

function shareFixture() {
  const state = createNewPatternState();
  const first = state.pages[0]!;
  first.tracks[0]!.steps[0] = 3;
  const second = structuredClone(first);
  second.id = 'verse';
  second.name = 'Verse';
  second.tracks[0]!.steps[0] = 1;
  state.pages.push(second);
  return encodeState(state)!;
}

describe('resolveGroove', () => {
  it('loads every bar of a known stock ID and supports sync lookup after preload', async () => {
    const id = 'cuban-cha-cha';
    const first = await resolveGrooveAsync(id);
    const catalog = await loadStockRhythms();
    const rhythm = catalog.findStockRhythm(id)!;

    expect(first.pages).toHaveLength(rhythm.barCount);
    expect(first).toMatchObject({ bpm: rhythm.bpm, activeCell: null, playMode: 'page', loopGroove: true });
    expect(first.pages[0]!.tracks.map((t) => t.id)).toEqual(first.pages[1]!.tracks.map((t) => t.id));
    expect(resolveGroove({ stock: id }).pages).toHaveLength(rhythm.barCount);
    expect(resolveGroove(id).pages).toHaveLength(rhythm.barCount);
  });

  it('accepts a wrapped v4 code, a raw code and a full embed URL', async () => {
    const code = shareFixture();
    const url = `https://drumlet.app/?embed=1#s=${code}`;
    for (const state of [
      resolveGroove({ share: code }),
      resolveGroove(url),
      await resolveGrooveAsync(code),
      await resolveGrooveAsync({ share: url }),
    ]) {
      expect(state.pages.map((page) => page.name)).toEqual(['Page 1', 'Verse']);
      expect(state.pages.map((page) => page.tracks[0]!.steps[0])).toEqual([3, 1]);
      expect(state).toMatchObject({ chainMode: true, loopGroove: true, pendingSplit: null });
    }
  });

  it('resolves a Dottl export of the bundled Funky Drummer preset', () => {
    const state = resolveGroove(dottlFixture());
    expect(state).toMatchObject({
      bpm: 101,
      activeCell: null,
      pendingSplit: null,
      playMode: 'page',
      loopGroove: true,
      pages: [{
        name: 'Page 1',
        sectionHeadings: [],
        tracks: expect.arrayContaining([expect.objectContaining({
          name: 'Hi-hat',
          steps: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          velMode: 3,
          _stashedSteps: {},
        })]),
      }],
    });
  });

  it('throws a typed invalid error for empty and garbage strings', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => resolveGroove('')).toThrow(GrooveError);
    expect(() => resolveGroove('')).toThrow(expect.objectContaining({ code: 'invalid' }));
    await expect(resolveGrooveAsync('garbage-share-code')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('distinguishes an unknown explicit stock ID from an invalid untagged string', async () => {
    await expect(resolveGrooveAsync({ stock: 'missing-groove' }))
      .rejects.toMatchObject({ name: 'GrooveError', code: 'not-found' });
  });

  it('wraps a deserializer failure as an invalid groove', () => {
    const project = dottlFixture();
    Object.assign(project.extensions.drumlet, { pages: null });
    expect(() => resolveGroove(project)).toThrow(expect.objectContaining({
      name: 'GrooveError',
      code: 'invalid',
    }));
  });

  it('rejects a Dottl project without tracks', () => {
    const project = dottlFixture();
    project.layers = [];
    project.extensions.drumlet.trackSources = [];
    expect(() => resolveGroove(project)).toThrow(expect.objectContaining({
      name: 'GrooveError',
      code: 'empty',
    }));
  });

  it('rejects a Dottl project without pages', () => {
    const project = dottlFixture();
    project.extensions.drumlet.pages = [];
    expect(() => resolveGroove(project)).toThrow(expect.objectContaining({ code: 'empty' }));
  });

  it.each([
    { v: 4, t: [{ n: 'Kick' }], pg: [] },
    { v: 4, t: [], pg: [{ s: [] }] },
  ])('rejects a valid but empty v4 payload', (payload) => {
    const share = btoa(JSON.stringify(payload));
    expect(() => resolveGroove({ share })).toThrow(expect.objectContaining({
      name: 'GrooveError',
      code: 'empty',
    }));
  });
});
