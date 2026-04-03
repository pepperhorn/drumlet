/**
 * Helpers for working with step data that may be plain numbers or split arrays.
 *
 *   Plain step:  0, 1, 2, ... (single velocity)
 *   Split step:  [2, 0, 1]   (array of sub-step velocities)
 */

export function isSplit(step) {
  return Array.isArray(step);
}

export function splitCount(step) {
  return Array.isArray(step) ? step.length : 0;
}

/** Max velocity across sub-steps (or the value itself for plain steps). */
export function masterVelocity(step) {
  if (Array.isArray(step)) return Math.max(...step);
  return step;
}

/** Always returns an array — wraps plain steps in a single-element array. */
export function subSteps(step) {
  if (Array.isArray(step)) return step;
  return [step];
}
