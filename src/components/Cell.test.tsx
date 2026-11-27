import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { VelMode } from '../state/sequencerReducer.js';
import Cell from './Cell.js';

const cases: [VelMode, number, string][] = [
  [1, 0, 'empty'], [1, 1, 'on'],
  [3, 0, 'empty'], [3, 1, 'soft'], [3, 2, 'medium'], [3, 3, 'hard'],
  [7, 0, 'empty'], [7, 1, 'very soft'], [7, 2, 'soft'], [7, 3, 'moderately soft'],
  [7, 4, 'moderately loud'], [7, 5, 'loud'], [7, 6, 'very loud'],
];

it.each(cases)('names mode %i velocity %i as %s', (velMode, velocity, state) => {
  render(<Cell
    trackName="Kick" bar={2} beat={3} stepNumber={11}
    velocity={velocity} velMode={velMode} color="red"
    isPlayhead={false} isBeatStart={false} isBarStart={false} splitData={null}
  />);

  expect(screen.getByRole('button', {
    name: `Kick, bar 2 beat 3, step 11, ${state}`, pressed: velocity > 0,
  })).toBeDefined();
});
