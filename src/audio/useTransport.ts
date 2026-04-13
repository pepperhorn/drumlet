import { useRef, useState, useCallback, useEffect, type MutableRefObject } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import type { SequencerState } from '../state/sequencerReducer.js';
import { effectiveStep } from '../util/stepHelpers.js';
import type { AudioEngineApi } from './useAudioEngine.js';

const LOOKAHEAD = 0.1; // seconds
const SCHEDULE_INTERVAL = 25; // ms

export interface TransportApi {
  isPlaying: boolean;
  currentStep: number;
  play: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
}

export function useTransport(stateRef: MutableRefObject<SequencerState>, audioEngine: AudioEngineApi): TransportApi {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const isPlayingRef = useRef(false);
  const currentStepRef = useRef(0);
  const nextStepTimeRef = useRef(0);
  const schedulerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafIdRef = useRef<number | null>(null);

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

      const beatNv = NOTE_VALUES.find((n) => n.key === state.noteValue) ?? NOTE_VALUES[3];
      const stepNv = NOTE_VALUES.find((n) => n.key === state.stepValue) ?? beatNv;
      const stepsPerBeat = beatNv.beatsPerStep / stepNv.beatsPerStep;
      const stepDuration = 60 / (bpm * stepsPerBeat);

      let swingOffset = 0;
      if ((state.swing || 0) > 0) {
        const swingTarget = state.swingTarget || '8th';
        let applySwing = false;
        if (swingTarget === '8th') {
          applySwing = step % 2 === 1;
        } else if (stepsPerBeat >= 4) {
          const posInBeat = step % stepsPerBeat;
          applySwing = posInBeat % 2 === 1;
        }
        if (applySwing) {
          const swingRatio = (state.swing / 100) * 0.5;
          swingOffset = stepDuration * swingRatio;
        }
      }

      const maxHumanizeMs = ((state.humanize || 0) / 100) * 30;

      const hasSolo = page.tracks.some((t) => t.solo);

      for (const track of page.tracks) {
        if (track.mute) continue;
        if (hasSolo && !track.solo) continue;

        const rawStep = track.steps[step];
        if (rawStep === undefined) continue;
        const stepData = effectiveStep(rawStep);

        if (Array.isArray(stepData)) {
          const subCount = stepData.length;
          const subDuration = stepDuration / subCount;
          for (let s = 0; s < subCount; s++) {
            const subVel = stepData[s] ?? 0;
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

      nextStepTimeRef.current += stepDuration;
      currentStepRef.current++;

      if (currentStepRef.current >= state.stepsPerPage) {
        currentStepRef.current = 0;

        if (state.chainMode && state.pages.length > 1) {
          const nextPage = (state.currentPageIndex + 1) % state.pages.length;
          if (state._onPageAdvance) {
            state._onPageAdvance(nextPage);
          }
        }
      }
    }
  }, [getContext, stateRef, triggerNote]);

  const updateVisual = useCallback(function tick(): void {
    if (!isPlayingRef.current) return;
    setCurrentStep(currentStepRef.current > 0 ? currentStepRef.current - 1 : (stateRef.current?.stepsPerPage || 16) - 1);
    rafIdRef.current = requestAnimationFrame(tick);
  }, [stateRef]);

  const play = useCallback(async (): Promise<void> => {
    const ctx = await ensureRunning();
    isPlayingRef.current = true;
    setIsPlaying(true);
    currentStepRef.current = 0;
    nextStepTimeRef.current = ctx.currentTime + 0.1;

    schedulerIdRef.current = setInterval(scheduleNotes, SCHEDULE_INTERVAL);
    rafIdRef.current = requestAnimationFrame(updateVisual);
  }, [ensureRunning, scheduleNotes, updateVisual]);

  const stop = useCallback((): void => {
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

  const toggle = useCallback((): void => {
    if (isPlayingRef.current) {
      stop();
    } else {
      play();
    }
  }, [play, stop]);

  useEffect(() => {
    return () => {
      if (schedulerIdRef.current) clearInterval(schedulerIdRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return { isPlaying, currentStep, play, stop, toggle };
}
