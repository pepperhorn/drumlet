import { expect, it, vi } from 'vitest';
import { prefetchNotation, shouldPrefetchOnIdle } from './notationPrefetch.js';

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

it('starts the chunk and font once across concurrent and repeated prefetch calls', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('font'));
  vi.stubGlobal('fetch', fetch);
  await Promise.all([prefetchNotation(), prefetchNotation()]);
  await prefetchNotation();
  expect(importChunk).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/fonts/Petaluma.zip', { signal: expect.any(AbortSignal) });
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
