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
