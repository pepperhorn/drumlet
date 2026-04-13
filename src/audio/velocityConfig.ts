/**
 * Velocity level definitions for 3 modes:
 *
 *   Mode 1: single velocity (on/off)
 *   Mode 3: S / M / H
 *   Mode 7: pp / p / mp / mf / f / ff
 *
 * Display steps are the mode-local values shown in cells.
 */

import type { Page, VelMode } from '../state/sequencerReducer.js';

const LABELS: Record<VelMode, string[]> = {
  1: ['', '●'],
  3: ['', 'S', 'M', 'H'],
  7: ['', 'pp', 'p', 'mp', 'mf', 'f', 'ff'],
};

const MIDI: Record<VelMode, number[]> = {
  1: [0, 100],
  3: [0, 40, 80, 120],
  7: [0, 20, 40, 60, 85, 105, 127],
};

export function maxLevel(mode: VelMode | number): number {
  return mode === 1 ? 1 : mode === 3 ? 3 : 6;
}

export function getMidiVelocity(level: number, mode: VelMode | number): number {
  if (level <= 0) return 0;
  const table = MIDI[(mode as VelMode)] ?? MIDI[3];
  return table[Math.min(level, table.length - 1)] ?? 0;
}

export function getVelocityLabel(level: number, mode: VelMode | number): string {
  if (level <= 0) return '';
  const table = LABELS[(mode as VelMode)] ?? LABELS[3];
  return table[Math.min(level, table.length - 1)] ?? '';
}

export function getVelocityOpacity(level: number, mode: VelMode | number): number {
  if (level <= 0) return 0;
  const max = maxLevel(mode);
  return 0.25 + (level / max) * 0.75;
}

/**
 * Convert a display-level step value from one mode to another.
 */
export function convertStep(value: number, fromMode: VelMode | number, toMode: VelMode | number): number {
  if (value === 0) return 0;
  if (fromMode === toMode) return value;

  if (fromMode === 7 && toMode === 3) {
    if (value <= 3) return 1;
    if (value <= 5) return 2;
    return 3;
  }

  if (fromMode === 3 && toMode === 7) {
    if (value === 1) return 3;
    if (value === 2) return 5;
    return 6;
  }

  if (toMode === 1) return 1;
  if (fromMode === 1 && toMode === 3) return 2;
  if (fromMode === 1 && toMode === 7) return 4;

  return value;
}

export function convertAllSteps(pages: Page[], fromMode: VelMode | number, toMode: VelMode | number): Page[] {
  return pages.map((page) => ({
    ...page,
    tracks: page.tracks.map((track) => ({
      ...track,
      steps: track.steps.map((v) => {
        if (typeof v === 'number') return convertStep(v, fromMode, toMode);
        return v;
      }),
    })),
  }));
}
