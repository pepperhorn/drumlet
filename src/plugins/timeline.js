import { NOTE_VALUES } from '../state/sequencerReducer.js';

export const DEFAULT_SCORE_POLICY = {
  perfectMs: 25,
  greatMs: 50,
  okMs: 100,
  missMs: 150,
  extraPenalty: 10,
};

function getTimingValues(state) {
  const beatNv = NOTE_VALUES.find((n) => n.key === state.noteValue) || NOTE_VALUES[3];
  const stepNv = NOTE_VALUES.find((n) => n.key === state.stepValue) || beatNv;
  const stepsPerBeat = beatNv.beatsPerStep / stepNv.beatsPerStep;
  const stepDuration = 60 / ((state.bpm || 120) * stepsPerBeat);
  return { beatNv, stepNv, stepsPerBeat, stepDuration };
}

function getSwingOffsetMs(state, stepIndex, stepsPerBeat, stepDuration) {
  if ((state.swing || 0) <= 0) return 0;

  const swingTarget = state.swingTarget || '8th';
  let applySwing = false;
  if (swingTarget === '8th') {
    applySwing = stepIndex % 2 === 1;
  } else if (stepsPerBeat >= 4) {
    const posInBeat = stepIndex % stepsPerBeat;
    applySwing = posInBeat % 2 === 1;
  }

  if (!applySwing) return 0;
  return stepDuration * ((state.swing / 100) * 0.5);
}

export function getSequenceDurationSeconds(state, loops = 1) {
  const { stepDuration } = getTimingValues(state);
  return state.pages.length * state.stepsPerPage * stepDuration * loops;
}

export function buildExpectedHits(state, { trackIds = null, loops = 1 } = {}) {
  if (!state?.pages?.length) return [];

  const { stepsPerBeat, stepDuration } = getTimingValues(state);
  const expectedHits = [];
  const activeTrackIds = trackIds ? new Set(trackIds) : null;
  const pageStepCount = state.stepsPerPage;
  const baseSequenceDuration = getSequenceDurationSeconds(state, 1);

  for (let loopIndex = 0; loopIndex < loops; loopIndex += 1) {
    const loopOffset = baseSequenceDuration * loopIndex;

    state.pages.forEach((page, pageIndex) => {
      const pageOffset = loopOffset + (pageIndex * pageStepCount * stepDuration);
      page.tracks.forEach((track) => {
        if (activeTrackIds && !activeTrackIds.has(track.id)) return;
        if (track.mute) return;

        track.steps.slice(0, pageStepCount).forEach((stepData, stepIndex) => {
          const stepOffset = pageOffset + (stepIndex * stepDuration);
          const swingOffset = getSwingOffsetMs(state, stepIndex, stepsPerBeat, stepDuration);

          if (Array.isArray(stepData)) {
            const subDuration = stepDuration / stepData.length;
            stepData.forEach((subVelocity, subStepIndex) => {
              if (subVelocity <= 0) return;
              expectedHits.push({
                id: `${loopIndex}-${pageIndex}-${track.id}-${stepIndex}-${subStepIndex}`,
                trackId: track.id,
                pageIndex,
                stepIndex,
                subStepIndex,
                velocity: subVelocity,
                timeSec: stepOffset + swingOffset + (subStepIndex * subDuration),
              });
            });
            return;
          }

          if (stepData > 0) {
            expectedHits.push({
              id: `${loopIndex}-${pageIndex}-${track.id}-${stepIndex}`,
              trackId: track.id,
              pageIndex,
              stepIndex,
              subStepIndex: null,
              velocity: stepData,
              timeSec: stepOffset + swingOffset,
            });
          }
        });
      });
    });
  }

  return expectedHits;
}

export function scorePerformance({
  expectedHits,
  performanceEvents,
  scorePolicy = DEFAULT_SCORE_POLICY,
  allowAnyTrack = false,
}) {
  const unmatchedEvents = performanceEvents.map((event) => ({ ...event }));
  const matches = [];
  const misses = [];
  const perTrack = new Map();
  let totalScore = 0;

  function addTrackMetric(trackId, key) {
    const bucket = perTrack.get(trackId) || {
      matched: 0,
      misses: 0,
      extras: 0,
      perfect: 0,
      great: 0,
      ok: 0,
    };
    bucket[key] += 1;
    perTrack.set(trackId, bucket);
  }

  expectedHits.forEach((expectedHit) => {
    let bestIndex = -1;
    let bestOffsetMs = Number.POSITIVE_INFINITY;

    unmatchedEvents.forEach((event, index) => {
      if (!allowAnyTrack && event.trackId !== expectedHit.trackId) return;
      const offsetMs = Math.abs((event.timeSec - expectedHit.timeSec) * 1000);
      if (offsetMs < bestOffsetMs) {
        bestOffsetMs = offsetMs;
        bestIndex = index;
      }
    });

    if (bestIndex === -1 || bestOffsetMs > scorePolicy.missMs) {
      misses.push(expectedHit);
      addTrackMetric(expectedHit.trackId, 'misses');
      return;
    }

    const event = unmatchedEvents.splice(bestIndex, 1)[0];
    const signedOffsetMs = (event.timeSec - expectedHit.timeSec) * 1000;
    let rating = 'ok';
    let score = 50;

    if (bestOffsetMs <= scorePolicy.perfectMs) {
      rating = 'perfect';
      score = 100;
    } else if (bestOffsetMs <= scorePolicy.greatMs) {
      rating = 'great';
      score = 75;
    } else if (bestOffsetMs <= scorePolicy.okMs) {
      rating = 'ok';
      score = 50;
    } else {
      rating = 'late';
      score = 25;
    }

    matches.push({ expectedHit, event, rating, offsetMs: signedOffsetMs });
    totalScore += score;
    addTrackMetric(expectedHit.trackId, 'matched');
    addTrackMetric(expectedHit.trackId, rating === 'late' ? 'ok' : rating);
  });

  const extras = unmatchedEvents;
  extras.forEach((event) => {
    totalScore -= scorePolicy.extraPenalty;
    addTrackMetric(event.trackId || 'any', 'extras');
  });

  const maxScore = expectedHits.length * 100;
  const accuracy = maxScore > 0 ? Math.max(0, Math.round((totalScore / maxScore) * 100)) : 0;

  return {
    totalScore,
    maxScore,
    accuracy,
    matches,
    misses,
    extras,
    perTrack: Object.fromEntries(perTrack.entries()),
  };
}
