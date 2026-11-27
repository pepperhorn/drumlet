import { describe, expect, it } from 'vitest';
import type { NoteValueKey } from '../state/sequencerReducer.js';
import { beatToEvents } from './beatToEvents.js';

type Event = ReturnType<typeof beatToEvents>[number];

const note = (dur: string, startStep = 0, dots: 0 | 1 = 0): Event => ({ kind: 'note', dur, dots, startStep });
const rest = (dur: string, startStep = 0, dots: 0 | 1 = 0): Event => ({ kind: 'rest', dur, dots, startStep });

describe('beatToEvents', () => {
  it.each<{ grid: string; step: NoteValueKey; events: Event[] }>([
    { grid: 'x...', step: '1/16', events: [note('4')] },
    { grid: 'x.x.', step: '1/16', events: [note('8'), note('8', 2)] },
    { grid: 'x..x', step: '1/16', events: [note('8', 0, 1), note('16', 3)] },
    { grid: 'xx..', step: '1/16', events: [note('16'), note('8', 1, 1)] },
    { grid: '.x..', step: '1/16', events: [rest('16'), note('8', 1, 1)] },
    { grid: '....', step: '1/16', events: [rest('4')] },
    { grid: 'x.', step: '1/8', events: [note('4')] },
    { grid: 'xx', step: '1/8', events: [note('8'), note('8', 1)] },
    { grid: 'x..', step: '1/8', events: [note('4', 0, 1)] },
    { grid: '...', step: '1/8', events: [rest('4', 0, 1)] },
    { grid: 'x.....', step: '1/16', events: [note('4', 0, 1)] },
    { grid: 'x....x', step: '1/16', events: [note('4'), rest('16', 4), note('16', 5)] },
    { grid: 'x....x..', step: '1/32', events: [note('8'), rest('32', 4), note('16', 5, 1)] },
    { grid: '....x...', step: '1/32', events: [rest('8'), note('8', 4)] },
  ])('writes $grid at $step', ({ grid, step, events }) => {
    expect(beatToEvents([...grid].map((cell) => cell === 'x'), grid.length, step)).toEqual(events);
  });

  it('stops at the beat boundary', () => {
    expect(beatToEvents([true, false, false, false, true], 4, '1/16')).toEqual([note('4')]);
  });
});
