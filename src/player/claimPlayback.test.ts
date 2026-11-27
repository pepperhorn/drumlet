// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from 'vitest';
import { claimPlayback } from './claimPlayback.js';
import { resolveChrome } from './chrome.js';

describe('resolveChrome', () => {
  it.each([
    ['full', true, true, true, true, true, true],
    ['minimal', false, false, false, false, true, true],
    ['none', false, false, false, false, false, false],
  ] as const)('resolves %s', (chrome, transport, bpm, displayToggle, viewToggle, playButton, audio) => {
    expect(resolveChrome(chrome)).toEqual({ transport, bpm, displayToggle, viewToggle, playButton, audio });
  });

  it('defaults to full', () => {
    expect(resolveChrome()).toEqual(resolveChrome('full'));
  });
});

describe('claimPlayback', () => {
  it('stops the old owner once even when it releases during its stop callback', () => {
    const stopA = vi.fn(() => releaseA());
    const releaseA = claimPlayback('a', stopA);
    const stopB = vi.fn();
    const releaseB = claimPlayback('b', stopB);
    releaseA();
    expect(stopA).toHaveBeenCalledTimes(1);
    const releaseC = claimPlayback('c', vi.fn());
    expect(stopB).toHaveBeenCalledTimes(1);
    releaseB();
    releaseC();
  });

  it('does not stop a returning owner or let its stale release clear the new claim', () => {
    const stop = vi.fn();
    const releaseOld = claimPlayback('same', stop);
    const releaseNew = claimPlayback('same', stop);
    releaseOld();
    expect(stop).not.toHaveBeenCalled();
    const releaseNext = claimPlayback('next', vi.fn());
    expect(stop).toHaveBeenCalledTimes(1);
    releaseNew();
    releaseNext();
  });
});
