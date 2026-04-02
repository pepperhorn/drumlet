/**
 * Maps drum sound names to VexFlow percussion key notation.
 *
 * VexFlow key format: "pitch/octave" or "pitch/octave/glyphCode"
 *   - glyphCode "x2" → X notehead (hi-hat, cymbals, crossstick)
 *   - glyphCode "d2" → diamond notehead (ride bell)
 *   - glyphCode "t2" → triangle notehead (cowbell, tambourine)
 *   - glyphCode "cx" → circle-X notehead (open hi-hat)
 *   - no glyphCode   → filled oval (default)
 *
 * Staff positions map from the original NOTATION_MAP pos values to
 * standard percussion staff lines:
 *   pos 0   → E/4 (bottom line — kick)
 *   pos 1   → G/4 (second line)
 *   pos 1.5 → A/4 (first space from bottom — floor tom)
 *   pos 2.5 → C/5 (middle space — snare)
 *   pos 3.5 → E/5 (second space from top — hi tom)
 *   pos 4   → F/5 (top line — ride bell)
 *   pos 4.5 → G/5 (above top line — ride)
 *   pos 5   → A/5 (above staff — hi-hat)
 *   pos 5.5 → B/5 (above staff — crash, cowbell)
 *   pos -0.5 → D/4 (below staff — hi-hat foot)
 */

// Notehead type suffixes for VexFlow keys
const HEAD_SUFFIX = {
  filled:  '',       // default filled oval
  x:       '/x2',    // X notehead
  xo:      '/cx',    // circle-X (open hi-hat) — standard notation: "o" above X
  diamond: '/d2',    // diamond
  triangle: '/t2',   // triangle
};

// Position-to-VexFlow-pitch mapping
// Each entry is [pitch, octave] — these place notes on the correct
// staff line/space when using the percussion clef.
const POS_TO_KEY = {
  '-0.5': ['d', 4],
  '0':    ['e', 4],
  '1':    ['g', 4],
  '1.5':  ['a', 4],
  '2':    ['b', 4],   // second line
  '2.5':  ['c', 5],
  '3':    ['d', 5],
  '3.5':  ['e', 5],
  '4':    ['f', 5],
  '4.5':  ['g', 5],
  '5':    ['a', 5],
  '5.5':  ['b', 5],
};

// Full drum notation map — same keys as original NOTATION_MAP
const NOTATION_MAP = {
  // Kicks
  'kick':       { pos: 0,   head: 'filled' },
  'kick-alt':   { pos: 0,   head: 'filled' },

  // Snare
  'snare':      { pos: 2.5, head: 'filled' },
  'snare-h':    { pos: 2.5, head: 'filled' },
  'snare-m':    { pos: 2.5, head: 'filled' },
  'snare-l':    { pos: 2.5, head: 'filled' },
  'snare-on1':  { pos: 2.5, head: 'filled' },
  'snare-on2':  { pos: 2.5, head: 'filled' },
  'snare-off':  { pos: 2.5, head: 'filled' },
  'crossstick': { pos: 2.5, head: 'x' },
  'rimshot':    { pos: 2.5, head: 'x' },

  // Hi-hats
  'hihat-close':  { pos: 5, head: 'x' },
  'hihat-closed': { pos: 5, head: 'x' },
  'hihat-open':   { pos: 5, head: 'xo' },
  'hhclosed':     { pos: 5, head: 'x' },
  'hhopen':       { pos: 5, head: 'xo' },
  'hh-closed1':   { pos: 5, head: 'x' },
  'hh-closed2':   { pos: 5, head: 'x' },
  'hh-open':      { pos: 5, head: 'xo' },
  'hh-foot':      { pos: -0.5, head: 'x' },

  // Toms
  'tom-hi':     { pos: 3.5, head: 'filled' },
  'tom-high':   { pos: 3.5, head: 'filled' },
  'tom-hh':     { pos: 3.5, head: 'filled' },
  'tom-1':      { pos: 3.5, head: 'filled' },
  'hi-tom':     { pos: 3.5, head: 'filled' },
  'mid-tom':    { pos: 2.5, head: 'filled' },
  'tom-mid':    { pos: 2.5, head: 'filled' },
  'tom-m':      { pos: 2.5, head: 'filled' },
  'tom-2':      { pos: 2.5, head: 'filled' },
  'tom-low':    { pos: 1.5, head: 'filled' },
  'tom-l':      { pos: 1.5, head: 'filled' },
  'tom-ll':     { pos: 1,   head: 'filled' },
  'tom-3':      { pos: 1.5, head: 'filled' },
  'floor-tom':  { pos: 1.5, head: 'filled' },

  // Cymbals
  'crash':      { pos: 5.5, head: 'x' },
  'cymbal':     { pos: 5.5, head: 'x' },
  'cymball':    { pos: 5.5, head: 'x' },
  'ride':       { pos: 4.5, head: 'x' },
  'ride-bell':  { pos: 4,   head: 'diamond' },

  // Latin percussion
  'cowbell':    { pos: 5.5, head: 'triangle' },
  'clave':      { pos: 5.5, head: 'x' },
  'conga-hi':   { pos: 3.5, head: 'filled' },
  'conga-high': { pos: 3.5, head: 'filled' },
  'conga-mid':  { pos: 2.5, head: 'filled' },
  'conga-low':  { pos: 1.5, head: 'filled' },
  'tambourine': { pos: 5.5, head: 'triangle' },
  'maraca':     { pos: 5.5, head: 'triangle' },
  'cabasa':     { pos: 5.5, head: 'triangle' },
  'agogo':      { pos: 5.5, head: 'triangle' },
};

/**
 * Look up notation info for a track.
 * @param {Object} track — { kitSample, group, ... }
 * @returns {{ pos: number, head: string }}
 */
export function getNotation(track) {
  const key = track.kitSample || track.group || '';
  return NOTATION_MAP[key] || NOTATION_MAP[key.toLowerCase()] || { pos: 2.5, head: 'filled' };
}

/**
 * Convert a notation entry to a VexFlow key string.
 * @param {{ pos: number, head: string }} notation
 * @returns {string} e.g. "a/5/x2", "e/4", "f/5/d2"
 */
export function toVexKey(notation) {
  const posStr = String(notation.pos);
  const mapping = POS_TO_KEY[posStr];
  if (!mapping) {
    // Fallback: use C/5 (middle of staff)
    return 'c/5' + (HEAD_SUFFIX[notation.head] || '');
  }
  const [pitch, octave] = mapping;
  const suffix = HEAD_SUFFIX[notation.head] || '';
  return `${pitch}/${octave}${suffix}`;
}

