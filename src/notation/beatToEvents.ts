import type { NoteValueKey } from '../state/sequencerReducer.js';

interface BeatEvent {
  kind: 'note' | 'rest';
  dur: string;
  dots: 0 | 1;
  startStep: number;
}

// Use sixty-fourths so a dotted thirty-second has an integer length.
const STEP_UNITS: Record<NoteValueKey, number> = {
  '1/32': 2,
  '1/16': 4,
  '1/8': 8,
  '1/4': 16,
  'd1/4': 24,
  '1/2': 32,
};

const VALUES = [1, 2, 4, 8, 16, 32].flatMap((denominator) => [
  { dur: String(denominator), dots: 1 as const, units: 96 / denominator },
  { dur: String(denominator), dots: 0 as const, units: 64 / denominator },
]);

export function beatToEvents(onsets: boolean[], stepsPerBeat: number, stepValue: NoteValueKey): BeatEvent[] {
  const events: BeatEvent[] = [];
  const unitsPerStep = STEP_UNITS[stepValue];
  let start = 0;

  for (let end = 1; end <= stepsPerBeat; end++) {
    if (end !== stepsPerBeat && !onsets[end]) continue;
    let units = (end - start) * unitsPerStep;
    let kind: BeatEvent['kind'] = onsets[start] ? 'note' : 'rest';
    let step = start;
    while (units > 0) {
      // Don't strand a single sixty-fourth, which is below the supported range.
      const { dur, dots, units: length } = VALUES.find((value) => value.units <= units && units - value.units !== 1)!;
      events.push({ kind, dur, dots, startStep: step });
      step += length / unitsPerStep;
      units -= length;
      kind = 'rest';
    }
    start = end;
  }

  return events;
}
