import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, createNewPatternState, sequencerReducer, type SequencerState } from '../state/sequencerReducer.js';
import type { AudioEngineApi } from './useAudioEngine.js';
import { useTransport } from './useTransport.js';

function setupTransport({ onEnded, playMode, loopGroove, chainMode = false }: {
  onEnded?: () => void;
  playMode?: 'page' | 'groove';
  chainMode?: boolean;
  loopGroove?: boolean;
} = {}) {
  const startedAt = Date.now();
  const ctx = {
    get currentTime() { return (Date.now() - startedAt) / 1000; },
  } as AudioContext;
  const triggerNote = vi.fn<AudioEngineApi['triggerNote']>();
  const ensureRunning = vi.fn(async () => ctx);
  const engine: AudioEngineApi = {
    getContext: () => ctx,
    ensureRunning,
    triggerNote,
    loadTrackInstrument: vi.fn(),
    updateTrackVolume: vi.fn(),
    updateTrackReverb: vi.fn(),
    previewSound: vi.fn(),
    loadCustomSample: vi.fn(),
    testAudio: vi.fn(),
    instrumentsRef: { current: new Map() },
  };
  const state = createInitialState();
  const track = state.pages[0]!.tracks[0]!;
  const stateRef: { current: SequencerState } = {
    current: {
      ...state,
      playMode,
      loopGroove,
      chainMode,
      stepsPerPage: 2,
      currentPageIndex: 1,
      pages: Array.from({ length: 3 }, (_, page) => ({
        id: `page-${page}`,
        name: `Page ${page + 1}`,
        tracks: [{ ...track, id: `track-${page}`, steps: [1, 2] }],
        sectionHeadings: [],
      })),
    },
  };
  const onPageAdvance = vi.fn((page: number) => { stateRef.current.currentPageIndex = page; });
  stateRef.current._onPageAdvance = onPageAdvance;
  const hook = renderHook(() => useTransport(stateRef, engine, { onEnded }));
  const noteIds = () => triggerNote.mock.calls.map(([track]) => track.id);
  return { ...hook, ctx, ensureRunning, triggerNote, onPageAdvance, noteIds };
}

function tick(ms: number) {
  act(() => { vi.advanceTimersByTime(ms); });
}

describe('useTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the scheduler and animation frame on unmount and submits no further notes', async () => {
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const { result, unmount, triggerNote } = setupTransport();
    await act(() => result.current.play());
    tick(150);
    expect(triggerNote).toHaveBeenCalled();
    const count = triggerNote.mock.calls.length;
    unmount();
    tick(1_000);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(triggerNote).toHaveBeenCalledTimes(count);
  });

  it('does not start after unmount if audio was still resuming', async () => {
    const { result, unmount, ctx, ensureRunning, triggerNote } = setupTransport();
    let resume!: (ctx: AudioContext) => void;
    ensureRunning.mockReturnValueOnce(new Promise((resolve) => { resume = resolve; }));
    const play = result.current.play();
    unmount();
    resume(ctx);
    await play;
    tick(1_000);
    expect(triggerNote).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('plays all groove pages, shows the final step until it finishes, and ends once', async () => {
    const onEnded = vi.fn();
    const { result, noteIds, onPageAdvance } = setupTransport({ playMode: 'groove', loopGroove: false, onEnded });
    await act(() => result.current.play());
    tick(800);
    expect(noteIds()).toEqual(['track-0', 'track-0', 'track-1', 'track-1', 'track-2', 'track-2']);
    expect(result.current).toMatchObject({ isPlaying: true, currentPlayPage: 2, currentStep: 1, currentGlobalStep: 5 });
    expect(onEnded).not.toHaveBeenCalled();
    tick(1_000);
    expect(noteIds()).toHaveLength(6);
    expect(result.current).toMatchObject({ isPlaying: false, currentStep: -1, currentGlobalStep: -1 });
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onPageAdvance).not.toHaveBeenCalled();
  });

  it('loops the whole groove with chain off and the default loop setting', async () => {
    const onEnded = vi.fn();
    const { result, noteIds } = setupTransport({ playMode: 'groove', onEnded });
    await act(() => result.current.play());
    tick(900);
    expect(noteIds().slice(0, 7)).toEqual(['track-0', 'track-0', 'track-1', 'track-1', 'track-2', 'track-2', 'track-0']);
    expect(result.current).toMatchObject({ isPlaying: true, currentPlayPage: 0, currentGlobalStep: 0 });
    expect(onEnded).not.toHaveBeenCalled();
    act(() => result.current.stop());
  });

  it('seeks while stopped and while playing', async () => {
    const { result, triggerNote } = setupTransport({ playMode: 'groove' });
    act(() => result.current.seek(3));
    expect(result.current).toMatchObject({ currentPlayPage: 1, currentStep: 1, currentGlobalStep: 3 });
    expect(triggerNote).not.toHaveBeenCalled();

    await act(() => result.current.play());
    tick(105);
    expect(triggerNote.mock.calls[0]?.slice(0, 2)).toEqual([expect.objectContaining({ id: 'track-1' }), 2]);
    act(() => result.current.seek(0));
    tick(150);
    expect(triggerNote.mock.calls[1]?.slice(0, 2)).toEqual([expect.objectContaining({ id: 'track-0' }), 1]);
    act(() => result.current.stop());
  });

  it.each([
    { chainMode: false, pages: ['track-1', 'track-1', 'track-1', 'track-1'], advances: [] },
    { chainMode: true, pages: ['track-1', 'track-1', 'track-2', 'track-2'], advances: [[2], [0]] },
  ])('preserves paged playback with chain=$chainMode', async ({ chainMode, pages, advances }) => {
    const { result, noteIds, onPageAdvance } = setupTransport({ chainMode, loopGroove: false });
    await act(() => result.current.play());
    tick(425);
    expect(noteIds()).toEqual(pages);
    expect(onPageAdvance.mock.calls).toEqual(advances);
    expect(result.current.isPlaying).toBe(true);
    act(() => result.current.stop());
  });
});

it('initializes the playback options and applies both reducer actions', () => {
  expect(createInitialState()).toMatchObject({ playMode: 'page', loopGroove: true });
  const state = createNewPatternState();
  expect(state).toMatchObject({ playMode: 'page', loopGroove: true });
  const groove = sequencerReducer(state, { type: 'SET_PLAY_MODE', playMode: 'groove' });
  expect(sequencerReducer(groove, { type: 'SET_LOOP_GROOVE', loopGroove: false }))
    .toMatchObject({ playMode: 'groove', loopGroove: false });
});
