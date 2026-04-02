import { useRef, useState, useCallback, useEffect } from 'react';

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

  const { getContext, triggerNote } = audioEngine;

  const scheduleNotes = useCallback(() => {
    const ctx = getContext();
    const state = stateRef.current;
    if (!state) return;

    while (nextStepTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      const page = state.pages[state.currentPageIndex];
      if (!page) break;

      const step = currentStepRef.current;
      const stepDuration = 60 / state.bpm / 4; // 16th notes

      // Swing: delay every odd-indexed 16th note (the offbeats).
      // At swing=0: straight 16ths (no delay).
      // At swing=50: triplet feel — offbeat lands 2/3 through the pair instead of 1/2.
      // At swing=100: dotted feel — offbeat is delayed to 3/4 of the pair.
      // The pair duration is 2 * stepDuration. Straight offbeat is at stepDuration (1/2).
      // Swing pushes it toward: stepDuration * (1 + swingRatio), where swingRatio goes 0→0.5.
      let swingOffset = 0;
      if ((state.swing || 0) > 0 && step % 2 === 1) {
        const swingRatio = (state.swing / 100) * 0.5; // 0 to 0.5
        swingOffset = stepDuration * swingRatio;
      }

      // Humanize: random timing offset per note
      const maxHumanizeMs = ((state.humanize || 0) / 100) * 30; // up to 30ms at max

      const hasSolo = page.tracks.some((t) => t.solo);

      for (const track of page.tracks) {
        if (track.mute) continue;
        if (hasSolo && !track.solo) continue;

        const vel = track.steps[step];
        if (vel > 0) {
          let noteTime = nextStepTimeRef.current + swingOffset;

          // Add humanize jitter per note
          if (maxHumanizeMs > 0) {
            const jitter = (Math.random() * 2 - 1) * maxHumanizeMs / 1000;
            noteTime = Math.max(ctx.currentTime, noteTime + jitter);
          }

          triggerNote(track, vel, noteTime, track.velMode || 3);
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

  const updateVisual = useCallback(() => {
    if (!isPlayingRef.current) return;
    setCurrentStep(currentStepRef.current > 0 ? currentStepRef.current - 1 : (stateRef.current?.stepsPerPage || 16) - 1);
    rafIdRef.current = requestAnimationFrame(updateVisual);
  }, [stateRef]);

  const play = useCallback(() => {
    const ctx = getContext();
    isPlayingRef.current = true;
    setIsPlaying(true);
    currentStepRef.current = 0;
    nextStepTimeRef.current = ctx.currentTime + 0.05;

    schedulerIdRef.current = setInterval(scheduleNotes, SCHEDULE_INTERVAL);
    rafIdRef.current = requestAnimationFrame(updateVisual);
  }, [getContext, scheduleNotes, updateVisual]);

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
