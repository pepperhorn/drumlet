/**
 * Velocity level definitions for 3 modes:
 *
 *   Mode 1: single velocity (on/off)
 *     Level 1 = hit
 *
 *   Mode 3: S / M / H
 *     Level 1 = S (soft), 2 = M (medium), 3 = H (hard)
 *
 *   Mode 7: pp / p / mp / mf / f / ff
 *     Level 1 = pp, 2 = p, 3 = mp, 4 = mf, 5 = f, 6 = ff
 *
 * "Raw" steps are always stored in mode-7 scale (0-6) for lossless switching.
 * Display steps are the mode-local values shown in cells.
 */

const LABELS = {
  1: ['', '●'],
  3: ['', 'S', 'M', 'H'],
  7: ['', 'pp', 'p', 'mp', 'mf', 'f', 'ff'],
};

const MIDI = {
  1: [0, 100],
  3: [0, 40, 80, 120],
  7: [0, 20, 40, 60, 85, 105, 127],
};

/**
 * Max display level for a given mode.
 */
export function maxLevel(mode) {
  return mode === 1 ? 1 : mode === 3 ? 3 : 6;
}

/**
 * Get MIDI velocity for a display-level value in a given mode.
 */
export function getMidiVelocity(level, mode) {
  if (level <= 0) return 0;
  const table = MIDI[mode] || MIDI[3];
  return table[Math.min(level, table.length - 1)];
}

/**
 * Get display label for a velocity level in a given mode.
 */
export function getVelocityLabel(level, mode) {
  if (level <= 0) return '';
  const table = LABELS[mode] || LABELS[3];
  return table[Math.min(level, table.length - 1)];
}

/**
 * Get opacity for a velocity level (0.0 to 1.0).
 */
export function getVelocityOpacity(level, mode) {
  if (level <= 0) return 0;
  const max = maxLevel(mode);
  return 0.25 + (level / max) * 0.75;
}

/**
 * Convert a display-level step value from one mode to another.
 *
 * Mode 7→3:  pp,p,mp (1,2,3) → S(1), mf,f (4,5) → M(2), ff (6) → H(3)
 * Mode 3→7:  S(1) → mp(3), M(2) → f(5), H(3) → ff(6)
 * Mode 3→1:  any non-zero → 1
 * Mode 1→3:  1 → M(2) (middle)
 * Mode 7→1:  any non-zero → 1
 * Mode 1→7:  1 → mf(4) (middle)
 */
export function convertStep(value, fromMode, toMode) {
  if (value === 0) return 0;
  if (fromMode === toMode) return value;

  // 7 → 3
  if (fromMode === 7 && toMode === 3) {
    if (value <= 3) return 1; // pp,p,mp → S
    if (value <= 5) return 2; // mf,f → M
    return 3;                 // ff → H
  }

  // 3 → 7
  if (fromMode === 3 && toMode === 7) {
    if (value === 1) return 3; // S → mp
    if (value === 2) return 5; // M → f
    return 6;                  // H → ff
  }

  // any → 1
  if (toMode === 1) return 1;

  // 1 → 3
  if (fromMode === 1 && toMode === 3) return 2; // → M

  // 1 → 7
  if (fromMode === 1 && toMode === 7) return 4; // → mf

  return value;
}

/**
 * Convert all steps in all pages from one mode to another.
 * Returns a new pages array (deep clone).
 */
export function convertAllSteps(pages, fromMode, toMode) {
  return pages.map((page) => ({
    ...page,
    tracks: page.tracks.map((track) => ({
      ...track,
      steps: track.steps.map((v) => convertStep(v, fromMode, toMode)),
    })),
  }));
}
