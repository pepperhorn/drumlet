/**
 * Step data shapes:
 *
 *   Primitive:  0, 1, 2, ... (single velocity, no split)
 *   Multi:      { v: number, active: 2|3|4, s: { 2?: number[], 3?: number[], 4?: number[] } }
 *               - v is the master velocity
 *               - active is which split bank is currently shown (per-cell)
 *               - s holds all split banks ever used on this cell
 *   Legacy array: [v1, v2, ...] — still accepted for backwards compat.
 */

import type { Step, MultiStep, SplitCount } from '../state/sequencerReducer.js';

export function isMulti(step: unknown): step is MultiStep {
  return step !== null && typeof step === 'object' && !Array.isArray(step);
}

export function isSplit(step: unknown): step is number[] {
  return Array.isArray(step);
}

export function splitCount(step: Step): number {
  if (Array.isArray(step)) return step.length;
  if (isMulti(step)) return step.active;
  return 0;
}

/** Master velocity: v for multi, the number for primitive, max for legacy arrays. */
export function masterVelocity(step: Step): number {
  if (Array.isArray(step)) return Math.max(...step, 0);
  if (isMulti(step)) return step.v ?? 0;
  return step;
}

/** Always returns an array — wraps plain steps in a single-element array. */
export function subSteps(step: Step): number[] {
  if (Array.isArray(step)) return step;
  if (isMulti(step)) {
    const bank = step.s?.[step.active];
    return bank ?? [step.v ?? 0];
  }
  return [step];
}

/**
 * Convert a stored step into its effective display/playback form.
 * No global splitMode — each multi cell carries its own `active` count.
 *
 *   primitive → number
 *   multi     → array (bank[active], or [v,0,...] preview if missing)
 *   legacy    → array (pass-through)
 */
export function effectiveStep(step: Step): number | number[] {
  if (isMulti(step)) {
    const bank = step.s?.[step.active];
    if (bank) return bank;
    const arr = new Array<number>((step.active as SplitCount | undefined) ?? 2).fill(0);
    arr[0] = step.v ?? 0;
    return arr;
  }
  if (Array.isArray(step)) return step;
  return step;
}
