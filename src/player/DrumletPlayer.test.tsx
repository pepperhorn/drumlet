// SPDX-License-Identifier: MIT
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createRef } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getKitBaseUrl } from '../audio/customKits.js';
import { serializeProject } from '../state/projectSerializer.js';
import { createInitialState } from '../state/sequencerReducer.js';
import { DrumletPlayer, GrooveError, type DrumletPlayerHandle, type GrooveInput } from './index.js';
import { loadStockRhythms } from './resolveGroove.js';

const audio = vi.hoisted(() => {
  const context = { get currentTime() { return Date.now() / 1000; }, close: vi.fn(async () => {}) };
  return {
    getContext: () => context,
    ensureRunning: vi.fn(async () => context),
    loadTrackInstrument: vi.fn(async () => ({})),
    triggerNote: vi.fn(),
    instrumentsRef: { current: new Map() },
  };
});
const useAudioEngine = vi.hoisted(() => vi.fn(() => audio));
vi.mock('../audio/useAudioEngine.js', () => ({ useAudioEngine }));

const loadNotation = vi.hoisted(() => vi.fn(async () => ({
  default: ({ currentGlobalStep, layout }: { currentGlobalStep: number; layout: string }) => (
    <div className="test-notation">{layout} score, step {currentGlobalStep}</div>
  ),
})));
vi.mock('../components/notationPrefetch.js', () => ({ loadNotation }));

const groove = 'country-shuffle';
const playKey = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('.drumlet-player-play-btn');
async function readyKey(container: HTMLElement) {
  return waitFor(() => {
    const button = playKey(container);
    expect(button).not.toBeNull();
    return button!;
  }, { timeout: 5000 });
}

describe('DrumletPlayer', () => {
  beforeAll(async () => { await loadStockRhythms(); });

  beforeEach(() => {
    vi.clearAllMocks();
    audio.loadTrackInstrument.mockReset();
  });

  it('has one keycap and no transport bar in minimal chrome', async () => {
    const { container } = render(<DrumletPlayer groove={groove} chrome="minimal" />);
    await readyKey(container);
    expect(container.querySelectorAll('.drumlet-player-play-btn')).toHaveLength(1);
    expect(container.querySelector('.transport-bar')).toBeNull();
    expect(loadNotation).not.toHaveBeenCalled();
    expect(audio.ensureRunning).not.toHaveBeenCalled();
  });

  it('never mounts the audio engine or loads notation in none chrome', async () => {
    const ref = createRef<DrumletPlayerHandle>();
    const onReady = vi.fn();
    const { container } = render(<DrumletPlayer groove={groove} chrome="none" display="notation" onReady={onReady} ref={ref} />);
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(container.querySelector('.endless-grid')).not.toBeNull();
    expect(container.querySelector('.drumlet-player-play-btn')).toBeNull();
    await ref.current?.play();
    ref.current?.stop();
    ref.current?.seek(5);
    expect(useAudioEngine).not.toHaveBeenCalled();
    expect(loadNotation).not.toHaveBeenCalled();
  });

  it.each<[string, GrooveInput, GrooveError['code']]>([
    ['garbage share', { share: 'bad-code' }, 'invalid'],
    ['empty project', serializeProject({ ...createInitialState(), pages: [] }), 'empty'],
  ])('renders an error for %s without mounting audio', async (_, input, code) => {
    const onError = vi.fn();
    const { container } = render(<DrumletPlayer groove={input} onError={onError} />);
    await screen.findByRole('alert');
    expect(container.querySelector('.drumlet-player-empty')).not.toBeNull();
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(GrooveError));
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code });
    expect(useAudioEngine).not.toHaveBeenCalled();
  });

  it('sets the theme and host class on the player root', async () => {
    const { container } = render(<DrumletPlayer groove={groove} theme="dark" className="host-class" />);
    await readyKey(container);
    expect(container.firstElementChild?.matches('.drumlet-player.host-class[data-theme="dark"]')).toBe(true);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('stops the first player when the second takes playback', async () => {
    const onStop = vi.fn();
    const onPlay = vi.fn();
    const onPlayA = vi.fn();
    const a = render(<DrumletPlayer groove={groove} chrome="minimal" onPlay={onPlayA} onStop={onStop} />);
    const b = render(<DrumletPlayer groove={groove} chrome="minimal" onPlay={onPlay} />);
    const keyA = await readyKey(a.container);
    const keyB = await readyKey(b.container);
    fireEvent.click(keyA);
    await waitFor(() => expect(onPlayA).toHaveBeenCalledTimes(1));
    fireEvent.click(keyB);
    await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
    expect(keyB.getAttribute('aria-label')).toBe('Stop');
    expect(keyA.getAttribute('aria-label')).toBe('Play');
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('does not start an older request after another player claims during sample loading', async () => {
    let finishLoad!: () => void;
    const pending = new Promise<void>(resolve => { finishLoad = resolve; });
    audio.loadTrackInstrument.mockImplementationOnce(async () => { await pending; return {}; });
    const onPlayA = vi.fn();
    const onPlayB = vi.fn();
    const a = render(<DrumletPlayer groove={groove} onPlay={onPlayA} />);
    const b = render(<DrumletPlayer groove={groove} onPlay={onPlayB} />);
    const keyA = await readyKey(a.container);
    const keyB = await readyKey(b.container);
    fireEvent.click(keyA);
    await waitFor(() => expect(audio.loadTrackInstrument).toHaveBeenCalled());
    fireEvent.click(keyB);
    expect(keyA.getAttribute('aria-label')).toBe('Play');
    await act(async () => finishLoad());
    await waitFor(() => expect(onPlayB).toHaveBeenCalledTimes(1));
    expect(onPlayA).not.toHaveBeenCalled();
  });

  it('releases playback on a load error and allows retry', async () => {
    const error = new Error('Missing sample');
    audio.loadTrackInstrument.mockRejectedValueOnce(error);
    const onError = vi.fn();
    const onPlay = vi.fn();
    const ref = createRef<DrumletPlayerHandle>();
    const { container } = render(<DrumletPlayer groove={groove} ref={ref} onPlay={onPlay} onError={onError} />);
    const key = await readyKey(container);
    await act(async () => { await expect(ref.current!.play()).rejects.toBe(error); });
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(key.getAttribute('aria-label')).toBe('Play');
    await act(async () => ref.current!.play());
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('seeks to a global step, reports it and stops scheduling on unmount', async () => {
    const ref = createRef<DrumletPlayerHandle>();
    const onStep = vi.fn();
    const onReady = vi.fn();
    const { unmount } = render(<DrumletPlayer groove={groove} onStep={onStep} onReady={onReady} ref={ref} />);
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    const instrument = { stop: vi.fn<(options: { time: number }) => void>(), disconnect: vi.fn() };
    audio.instrumentsRef.current.set('loaded-track', { instrument });
    vi.useFakeTimers();
    try {
      await act(async () => {
        ref.current?.seek(8);
        await ref.current?.play();
      });
      act(() => vi.advanceTimersByTime(140));
      expect(onStep.mock.calls[0]).toEqual([8]);
      expect(audio.triggerNote).toHaveBeenCalled();
      const scheduled = audio.triggerNote.mock.calls.length;
      await act(async () => unmount());
      expect(instrument.stop).toHaveBeenCalledExactlyOnceWith({ time: 0 });
      expect(instrument.disconnect).toHaveBeenCalledTimes(1);
      expect(audio.getContext().close).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(1000));
      expect(audio.triggerNote).toHaveBeenCalledTimes(scheduled);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops at the end of the whole groove when Loop is off', async () => {
    const ref = createRef<DrumletPlayerHandle>();
    const onStop = vi.fn();
    const { container } = render(<DrumletPlayer groove={groove} bpm={300} onStop={onStop} ref={ref} />);
    const key = await readyKey(container);
    const toolbar = within(container.querySelector<HTMLElement>('.transport-bar')!);
    fireEvent.click(toolbar.getByRole('button', { name: 'Loop' }));
    vi.useFakeTimers();
    try {
      await act(async () => ref.current!.play());
      act(() => vi.advanceTimersByTime(5000));
      expect(onStop).toHaveBeenCalledTimes(1);
      expect(key.getAttribute('aria-label')).toBe('Play');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads a custom kit base only when starting audio and restores the default', async () => {
    const defaultBase = getKitBaseUrl();
    const observed = new Set<string>();
    audio.loadTrackInstrument.mockImplementation(async () => {
      observed.add(getKitBaseUrl());
      return {};
    });
    const ref = createRef<DrumletPlayerHandle>();
    const { container } = render(<DrumletPlayer groove={groove} assetBaseUrl="/embed-assets/" ref={ref} />);
    await readyKey(container);
    expect(getKitBaseUrl()).toBe(defaultBase);
    await act(async () => ref.current?.play());
    expect(observed).toEqual(new Set(['/embed-assets/kits/']));
    expect(getKitBaseUrl()).toBe(defaultBase);
  });

  it('has full chrome by default and switches grid, notation and pages', async () => {
    const { container } = render(<DrumletPlayer groove={groove} bpm={94} />);
    await readyKey(container);
    const toolbar = within(container.querySelector<HTMLElement>('.transport-bar')!);
    const loop = toolbar.getByRole('button', { name: 'Loop' });
    expect(container.firstElementChild?.getAttribute('data-theme')).toBe('light');
    expect(container.querySelectorAll('.endless-page-heading').length).toBeGreaterThan(1);
    expect(toolbar.getByRole('slider', { name: 'Tempo (BPM)' }).getAttribute('aria-valuenow')).toBe('94');
    expect(loop.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(loop);
    expect(loop.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toolbar.getByRole('button', { name: 'Paged' }));
    expect(container.querySelectorAll('.endless-page-heading')).toHaveLength(1);
    fireEvent.click(within(container.querySelector<HTMLElement>('.drumlet-player-pages')!).getByRole('button', { name: 'Bar 2' }));
    expect(container.querySelector('.endless-page-heading')?.textContent).toBe('Bar 2');
    fireEvent.click(toolbar.getByRole('button', { name: 'Notation' }));
    expect(await screen.findByText('wrapped score, step -1')).toBeTruthy();
    fireEvent.click(toolbar.getByRole('button', { name: 'Endless' }));
    expect(await screen.findByText('endless score, step -1')).toBeTruthy();
    fireEvent.click(toolbar.getByRole('button', { name: 'Grid' }));
    expect(container.querySelectorAll('.endless-page-heading').length).toBeGreaterThan(1);
  });
});
