import { describe, expect, it } from 'vitest';
import { advancePosition, fromGlobalStep, toGlobalStep } from './playPosition.js';

describe('advancePosition', () => {
  const groove = { pages: 3, stepsPerPage: 16, mode: 'groove', chain: false, loop: true } as const;

  it('advances to the next page in groove mode with chain off', () => {
    expect(advancePosition({ page: 0, step: 15 }, groove)).toEqual({ page: 1, step: 0 });
  });

  it('wraps from the last groove step to the first when looping', () => {
    expect(advancePosition({ page: 2, step: 15 }, groove)).toEqual({ page: 0, step: 0 });
  });

  it('ends after the last groove step without looping, even with chain on', () => {
    expect(advancePosition({ page: 2, step: 15 }, { ...groove, chain: true, loop: false })).toBeNull();
  });

  it('wraps on the same page in page mode with chain off', () => {
    expect(advancePosition({ page: 1, step: 15 }, { ...groove, mode: 'page', loop: false }))
      .toEqual({ page: 1, step: 0 });
  });

  it('advances or wraps to the next page in page mode with chain on', () => {
    const paged = { ...groove, mode: 'page', chain: true, loop: false } as const;
    expect(advancePosition({ page: 1, step: 15 }, paged)).toEqual({ page: 2, step: 0 });
    expect(advancePosition({ page: 2, step: 15 }, paged)).toEqual({ page: 0, step: 0 });
  });
});

it('converts between a page position and a global step', () => {
  expect(toGlobalStep(2, 3, 16)).toBe(35);
  expect(fromGlobalStep(35, 16)).toEqual({ page: 2, step: 3 });
});
