import { act, fireEvent, render, screen } from '@testing-library/react';
import { memo } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SequencerProvider, useSequencer } from '../state/SequencerContext.js';
import { loadNotation } from './notationPrefetch.js';

vi.mock('./notationPrefetch.js', () => ({ loadNotation: vi.fn() }));

const load = vi.mocked(loadNotation);
const notationModule = {
  default: memo(({ pages, currentPageIndex }) => (
    <output>Page {currentPageIndex + 1}, first step {String(pages[currentPageIndex]?.tracks[0]?.steps[0])}</output>
  )),
} satisfies Awaited<ReturnType<typeof loadNotation>>;

let NotationBoundary: typeof import('./NotationBoundary.js').default;

beforeEach(async () => {
  vi.resetModules();
  NotationBoundary = (await import('./NotationBoundary.js')).default;
  localStorage.clear();
  load.mockReset();
});

function SequencerNotation() {
  const { state, dispatch, canUndo, undo } = useSequencer();
  return (
    <>
      <button onClick={() => {
        dispatch({ type: 'ADD_PAGE' });
        dispatch({ type: 'SET_CURRENT_PAGE', pageIndex: 1 });
        dispatch({ type: 'SET_CELL', trackIndex: 0, stepIndex: 0, velocity: 1 });
      }}>Edit page 2</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <NotationBoundary {...state} currentStep={-1} />
    </>
  );
}

it('skips the engine fallback when reopening after a successful load', async () => {
  load.mockResolvedValue(notationModule);
  const notation = <SequencerProvider><SequencerNotation /></SequencerProvider>;
  const { unmount } = render(notation);
  expect(screen.getByText('Loading notation engine…')).toBeTruthy();
  await screen.findByText('Page 1, first step 0');
  unmount();

  render(notation);
  expect(screen.queryByText('Loading notation engine…')).toBeNull();
  expect(screen.getByText('Page 1, first step 0')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('loads notation after an import failure without losing edits, the selected page or undo', async () => {
  load
    .mockRejectedValueOnce(new Error('Chunk unavailable'))
    .mockResolvedValueOnce(notationModule);
  const notation = <SequencerProvider><SequencerNotation /></SequencerProvider>;
  const { unmount } = render(notation, { onCaughtError: () => {} });

  expect((await screen.findByRole('alert')).textContent).toBe('Could not load the notation engine.');
  fireEvent.click(screen.getByRole('button', { name: 'Edit page 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Page 2, first step 1')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('Page 2, first step 0')).toBeTruthy();

  unmount();
  // Reopening tests the cached notation view, independent of sequencer autosave.
  localStorage.clear();
  render(notation);
  expect(screen.queryByText('Loading notation engine…')).toBeNull();
  expect(screen.getByText('Page 1, first step 0')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(2);
});

it('restarts the engine deadline when Retry is clicked after 15 seconds', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  try {
    let resolve!: (module: typeof notationModule) => void;
    const promise = new Promise<typeof notationModule>((done) => { resolve = done; });
    load.mockReturnValue(promise);
    render(<SequencerProvider><SequencerNotation /></SequencerProvider>);
    expect(screen.getByText('Loading notation engine…')).toBeTruthy();
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.getByText('Still loading — slow connection?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(load).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(14999));
    expect(screen.getByText('Loading notation engine…')).toBeTruthy();
    // React can commit Suspense retries after act returns. Wait on the DOM with real timers.
    vi.useRealTimers();
    await act(async () => resolve(notationModule));
    expect(await screen.findByText('Page 1, first step 0')).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});
