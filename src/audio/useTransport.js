import { useRef, useState, useCallback, useEffect } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import { effectiveStep } from '../util/stepHelpers.js';

const LOOKAHEAD = 0.1; // seconds
const SCHEDULE_INTERVAL = 25; // ms

export function useTransport(stateRef, audioEngine) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const isPlayingRef = useRef(false);
  const currentStepRef = useRef(0);
  const nextStepTimeRef = useRef(0);
  const schedulerIdRef = useRef(null);
  const rafIdRef = useRef(null);

  const { getContext, ensureRunning, triggerNote } = audioEngine;

  const scheduleNotes = useCallback(() => {
    const ctx = getContext();
    const state = stateRef.current;
    if (!state) return;

    while (nextStepTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      const page = state.pages[state.currentPageIndex];
      if (!page) break;

      const step = currentStepRef.current;
      const bpm = state.bpm || 120;

      // BPM counts the beat unit from the time signature denominator.
      // 4/4 → BPM counts quarter notes. 6/8 → BPM counts eighth notes.
      // Step div tells us what each grid step represents relative to that beat.
      //
      // stepsPerBeat = how many grid steps fit in one BPM beat
      //   e.g. 4/4 + 16th step div → 4 steps per quarter beat
      //   e.g. 4/4 + quarter step div → 1 step per quarter beat
      //   e.g. 4/4 + half step div → 0.5 steps per quarter beat (step is 2 beats)
      const beatNv = NOTE_VALUES.find(n => n.key === state.noteValue) || NOTE_VALUES[3];
      const stepNv = NOTE_VALUES.find(n => n.key === state.stepValue) || beatNv;
      const stepsPerBeat = beatNv.beatsPerStep / stepNv.beatsPerStep;
      const stepDuration = 60 / (bpm * stepsPerBeat);


      // Swing: delay offbeat notes to create shuffle/groove feel.
      // swingTarget controls which subdivisions are affected:
      //   '8th'  → swing every odd step (8th-note offbeats at finest grid level)
      //   '16th' → only swing 16th-note offbeats (needs ≥4 steps per beat)
      let swingOffset = 0;
      if ((state.swing || 0) > 0) {
        const swingTarget = state.swingTarget || '8th';
        let applySwing = false;
        if (swingTarget === '8th') {
          applySwing = step % 2 === 1;
        } else {
          // '16th' — only swing when grid has 16th resolution or finer
          if (stepsPerBeat >= 4) {
            const posInBeat = step % stepsPerBeat;
            applySwing = posInBeat % 2 === 1;
          }
        }
        if (applySwing) {
          const swingRatio = (state.swing / 100) * 0.5; // 0 to 0.5
          swingOffset = stepDuration * swingRatio;
        }
      }

      // Humanize: random timing offset per note
      const maxHumanizeMs = ((state.humanize || 0) / 100) * 30; // up to 30ms at max

      const hasSolo = page.tracks.some((t) => t.solo);

      for (const track of page.tracks) {
        if (track.mute) continue;
        if (hasSolo && !track.solo) continue;

        const stepData = effectiveStep(track.steps[step]);

        if (Array.isArray(stepData)) {
          // Split step: schedule sub-steps at evenly-spaced intervals
          const subCount = stepData.length;
          const subDuration = stepDuration / subCount;
          for (let s = 0; s < subCount; s++) {
            const subVel = stepData[s];
            if (subVel > 0) {
              let noteTime = nextStepTimeRef.current + swingOffset + (s * subDuration);
              if (maxHumanizeMs > 0) {
                const jitter = (Math.random() * 2 - 1) * maxHumanizeMs / 1000;
                noteTime = Math.max(ctx.currentTime, noteTime + jitter);
              }
              triggerNote(track, subVel, noteTime, track.velMode || 3);
            }
          }
        } else if (stepData > 0) {
          let noteTime = nextStepTimeRef.current + swingOffset;

          if (maxHumanizeMs > 0) {
            const jitter = (Math.random() * 2 - 1) * maxHumanizeMs / 1000;
            noteTime = Math.max(ctx.currentTime, noteTime + jitter);
          }

          triggerNote(track, stepData, noteTime, track.velMode || 3);
        }
      }

      // Advance step (use base timing without swing for consistent grid)
      nextStepTimeRef.current += stepDuration;
      currentStepRef.current++;

      if (currentStepRef.current >= state.stepsPerPage) {
        currentStepRef.current = 0;

        // Chain mode: advance to next page
        if (state.chainMode && state.pages.length > 1) {
          const nextPage = (state.currentPageIndex + 1) % state.pages.length;
          if (state._onPageAdvance) {
            state._onPageAdvance(nextPage);
          }
        }
      }
    }
  }, [getContext, stateRef, triggerNote]);

  const updateVisual = useCallback(function tick() {
    if (!isPlayingRef.current) return;
    setCurrentStep(currentStepRef.current > 0 ? currentStepRef.current - 1 : (stateRef.current?.stepsPerPage || 16) - 1);
    rafIdRef.current = requestAnimationFrame(tick);
  }, [stateRef]);

  const play = useCallback(async () => {
    // Resume AudioContext from user gesture — must complete before scheduling
    const ctx = await ensureRunning();
    isPlayingRef.current = true;
    setIsPlaying(true);
    currentStepRef.current = 0;
    nextStepTimeRef.current = ctx.currentTime + 0.1; // slightly longer delay for safety

    schedulerIdRef.current = setInterval(scheduleNotes, SCHEDULE_INTERVAL);
    rafIdRef.current = requestAnimationFrame(updateVisual);
  }, [ensureRunning, scheduleNotes, updateVisual]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(-1);
    currentStepRef.current = 0;

    if (schedulerIdRef.current) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) {
      stop();
    } else {
      play();
    }
  }, [play, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (schedulerIdRef.current) clearInterval(schedulerIdRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return { isPlaying, currentStep, play, stop, toggle };
}
