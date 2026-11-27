import { expect, it } from 'vitest';
import { beatCountLabels } from './notationCounts.js';

function twoBars(subdivision: string, beatsPerBar: number): string[] {
  return Array.from({ length: beatsPerBar * 2 }, (_, beat) => beatCountLabels(subdivision, beat, beatsPerBar)).flat();
}

it('restarts 4/4 sixteenth-note counts at the next bar', () => {
  const bar = '1 e & a 2 e & a 3 e & a 4 e & a';
  expect(twoBars('1/16', 4).join(' ')).toBe(`${bar} ${bar}`);
});

it.each([
  ['3/4', 3, '1 2 3 1 2 3'],
  ['6/8', 6, '1 2 3 4 5 6 1 2 3 4 5 6'],
])('restarts %s counts at the next bar', (_, beatsPerBar, expected) => {
  expect(twoBars('1/4', beatsPerBar).join(' ')).toBe(expected);
});
