import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prefetchNotation, scheduleNotationPrefetch, shouldPrefetchOnIdle } from './notationPrefetch.js';

const { importChunk } = vi.hoisted(() => ({ importChunk: vi.fn() }));

vi.mock('./NotationView.js', () => {
  importChunk();
  return { default: () => null };
});

it.each(['slow-2g', '2g', '3g'])('skips idle prefetch on %s', (effectiveType) => {
  expect(shouldPrefetchOnIdle({ effectiveType })).toBe(false);
});

it('skips idle prefetch with Save Data even on 4G', () => {
  expect(shouldPrefetchOnIdle({ effectiveType: '4g', saveData: true })).toBe(false);
});

it('prefetches on 4G and when the connection API is unavailable', () => {
  expect(shouldPrefetchOnIdle({ effectiveType: '4g' })).toBe(true);
  expect(shouldPrefetchOnIdle()).toBe(true);
});

describe('background prefetch', () => {
  let cancel: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive');
  });

  afterEach(() => {
    cancel?.();
    cancel = undefined;
    vi.useRealTimers();
  });

  it('waits until five seconds after load without interaction', () => {
    const warm = vi.fn();
    cancel = scheduleNotationPrefetch(warm);
    vi.advanceTimersByTime(10_000);
    expect(warm).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(4_999);
    expect(warm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it.each(['pointerdown', 'keydown'])('queues idle work on the first %s after load', (event) => {
    const warm = vi.fn();
    const requestIdle = vi.fn<(callback: () => void) => number>().mockReturnValue(1);
    vi.stubGlobal('requestIdleCallback', requestIdle);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    cancel = scheduleNotationPrefetch(warm);
    window.dispatchEvent(new Event('load'));
    document.body.dispatchEvent(new Event(event));
    expect(requestIdle).toHaveBeenCalledExactlyOnceWith(warm);
    expect(warm).not.toHaveBeenCalled();
    requestIdle.mock.calls[0]![0]();
    document.body.dispatchEvent(new Event(event));
    vi.advanceTimersByTime(5_000);
    expect(requestIdle).toHaveBeenCalledTimes(1);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('can use a gesture before load once the app has mounted', () => {
    const warm = vi.fn();
    cancel = scheduleNotationPrefetch(warm);
    document.body.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(1);
    expect(warm).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(5_001);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('counts only the remaining delay when the app mounts after load', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    vi.stubGlobal('performance', {
      now: () => 4_000,
      getEntriesByType: () => [{ loadEventStart: 1_000 }],
    });
    const warm = vi.fn();
    cancel = scheduleNotationPrefetch(warm);
    vi.advanceTimersByTime(1_999);
    expect(warm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('cancels queued idle work on unmount', () => {
    const requestIdle = vi.fn().mockReturnValue(7);
    const cancelIdle = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdle);
    vi.stubGlobal('cancelIdleCallback', cancelIdle);
    const cancel = scheduleNotationPrefetch(vi.fn());
    document.body.dispatchEvent(new Event('pointerdown'));
    cancel();
    expect(cancelIdle).toHaveBeenCalledExactlyOnceWith(7);
  });
});

it('starts the chunk and font once across concurrent and repeated prefetch calls', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('font'));
  vi.stubGlobal('fetch', fetch);
  await Promise.all([prefetchNotation(), prefetchNotation()]);
  await prefetchNotation();
  expect(importChunk).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/fonts/Petaluma.zip', { signal: expect.any(AbortSignal) });
});

it.each(['pointerDown', 'focus'] as const)('warms notation immediately on toggle %s', async (event) => {
  vi.resetModules();
  const { default: PageTabs } = await import('./PageTabs.js');
  const { prefetchNotation } = await import('./notationPrefetch.js');
  const fetch = vi.fn().mockResolvedValue(new Response('font'));
  vi.stubGlobal('fetch', fetch);
  const noop = vi.fn();
  render(createElement(PageTabs, {
    pages: [], currentPageIndex: 0, stepsPerPage: 16, splitMode: null, selectedStep: null,
    onSetPage: noop, onAddPage: noop, onRemovePage: noop, onSetStepsPerPage: noop,
    onSetSplitMode: noop, onClearPage: noop, onToggleNotation: noop,
    viewMode: 'paged', onSetViewMode: noop,
  }));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent[event](screen.getByRole('button', { name: 'Notation' }));
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/fonts/Petaluma.zip', { signal: expect.any(AbortSignal) });
  expect(noop).not.toHaveBeenCalled();
  await prefetchNotation();
});

it('evicts a rejected import and shares the next attempt', async () => {
  vi.resetModules();
  const { loadNotation } = await import('./notationPrefetch.js');
  const failure = new Error('Chunk unavailable');
  const failedImport = vi.fn().mockRejectedValue(failure);
  vi.doMock('./NotationView.js', failedImport);
  try {
    const first = loadNotation();
    expect(loadNotation()).toBe(first);
    await expect(first).rejects.toHaveProperty('cause', failure);
    expect(failedImport).toHaveBeenCalledTimes(1);

    // Replace the rejected module in Vitest's own mock registry.
    const NotationView = () => null;
    const nextImport = vi.fn(() => ({ default: NotationView }));
    vi.doMock('./NotationView.js', nextImport);
    const second = loadNotation();
    expect(second).not.toBe(first);
    expect(loadNotation()).toBe(second);
    expect((await second).default).toBe(NotationView);
    expect(nextImport).toHaveBeenCalledTimes(1);
  } finally {
    vi.doUnmock('./NotationView.js');
  }
});

it('restarts a stalled font request and does not evict the replacement', async () => {
  vi.resetModules();
  const { loadPetaluma, restartPendingPetaluma } = await import('./notationPrefetch.js');
  const fetch = vi.fn()
    .mockImplementationOnce((_, { signal }: RequestInit) => new Promise((_, reject) => {
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
    }))
    .mockResolvedValue(new Response('font'));
  vi.stubGlobal('fetch', fetch);
  const original = loadPetaluma();
  const aborted = expect(original).rejects.toHaveProperty('name', 'AbortError');
  restartPendingPetaluma();
  const replacement = loadPetaluma();
  await aborted;
  await replacement;
  expect(loadPetaluma()).toBe(replacement);
  expect(fetch).toHaveBeenCalledTimes(2);
});
