import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createNewPatternState } from '../state/sequencerReducer.js';
import { findStockRhythm, stockRhythmToState } from '../state/stockRhythms.js';
import Grid from './Grid.js';

vi.hoisted(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
});

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

const gridProps = {
  currentStep: -1, selectedStep: null, activeCell: null,
  onAddSectionHeading: vi.fn(), onUpdateSectionHeading: vi.fn(),
  onMoveSectionHeading: vi.fn(), onRemoveSectionHeading: vi.fn(),
  onToggleCell: vi.fn(), onToggleSubStep: vi.fn(), onClearSubStep: vi.fn(),
  onChangeProp: vi.fn(), onChangeVelMode: vi.fn(), onOpenSoundPicker: vi.fn(), onDrop: vi.fn(),
};

it('names paged pads by musical beat and exposes expanded sub-step states', () => {
  const tracks = createNewPatternState().pages[0]!.tracks.slice(0, 3);
  const track = tracks[0]!;
  const single = tracks[1]!;
  const dynamics = tracks[2]!;
  track.name = 'Kick';
  track.velMode = 3;
  track.steps.splice(8, 7, 0, 1, 2, 0, 3, [1, 0, 3], [0, 0]);
  single.name = 'Snare';
  single.velMode = 1;
  single.steps[0] = 1;
  dynamics.name = 'Ride';
  dynamics.velMode = 7;
  dynamics.steps[0] = 6;

  const { container } = render(<Grid
    {...gridProps} tracks={tracks} pageIndex={0} stepsPerPage={16} beatsPerBar={2}
    noteValue="1/4" stepValue="1/16"
  />);

  const stateOf = (pad: Element) => [pad.getAttribute('aria-label'), pad.getAttribute('aria-pressed')];
  const rows = container.querySelectorAll('.track-steps');
  expect(stateOf(rows[1]!.querySelector('button.step-cell')!)).toEqual(['Snare, bar 1 beat 1, step 1, on', 'true']);
  expect(stateOf(rows[2]!.querySelector('button.step-cell')!)).toEqual(['Ride, bar 1 beat 1, step 1, very loud', 'true']);

  const position = 'Kick, bar 2 beat 2, step 14';
  const splitName = `${position}, split into 3, 2 active`;
  const split = screen.getByRole('button', { name: splitName, expanded: false });
  const trackPads = Array.from(split.closest('.track-steps')!.querySelectorAll('button.step-cell'), stateOf);
  expect(trackPads).toEqual(expect.arrayContaining([
    ['Kick, bar 2 beat 1, step 9, empty', 'false'],
    ['Kick, bar 2 beat 1, step 10, soft', 'true'],
    ['Kick, bar 2 beat 1, step 11, medium', 'true'],
    ['Kick, bar 2 beat 2, step 13, hard', 'true'],
    [splitName, null],
    ['Kick, bar 2 beat 2, step 15, split into 2, empty', null],
  ]));

  fireEvent.click(split);
  const master = screen.getByRole('button', { name: splitName, expanded: true });
  expect(Array.from(container.querySelectorAll('.step-cell-expanded-wrap button'), stateOf)).toEqual([
    [splitName, null],
    [`${position}, sub-step 1 of 3, soft`, 'true'],
    [`${position}, sub-step 2 of 3, empty`, 'false'],
    [`${position}, sub-step 3 of 3, hard`, 'true'],
  ]);
  fireEvent.click(master);
  expect(screen.getByRole('button', { name: splitName, expanded: false })).toBeDefined();
});

it('announces bar 3 on page 3 of a four-bar stock groove', () => {
  const groove = { ...createNewPatternState(), ...stockRhythmToState(findStockRhythm('rock-basic-8ths')!) };
  expect(groove.pages).toHaveLength(4);
  expect(groove.stepsPerPage).toBe(16);
  render(<Grid
    {...gridProps} pageIndex={2} tracks={groove.pages[2]!.tracks} stepsPerPage={groove.stepsPerPage}
    beatsPerBar={groove.beatsPerBar} noteValue={groove.noteValue} stepValue={groove.stepValue}
  />);
  expect(screen.getByRole('button', { name: 'Crash, bar 3 beat 1, step 1, empty', pressed: false })).toBeDefined();
});
