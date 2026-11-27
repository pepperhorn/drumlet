// SPDX-License-Identifier: MIT
import { useRef, useState, useCallback, useEffect, type MutableRefObject } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import type { SequencerState } from '../state/sequencerReducer.js';
import { effectiveStep } from '../util/stepHelpers.js';
import type { AudioEngineApi } from './useAudioEngine.js';
import { advancePosition, fromGlobalStep, toGlobalStep, type PlayMode } from './playPosition.js';

const LOOKAHEAD = 0.1; // seconds
const SCHEDULE_INTERVAL = 25; // ms

export interface TransportApi {
  isPlaying: boolean;
  currentStep: number;
  currentGlobalStep: number;
  currentPlayPage: number;
  seek: (globalStep: number) => void;
  play: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
}

type Position = ReturnType<typeof fromGlobalStep>;
type VisualPosition = Position & { globalStep: number };

function toVisualPosition(pos: Position, stepsPerPage: number): VisualPosition {
  return { ...pos, globalStep: toGlobalStep(pos.page, pos.step, stepsPerPage) };
}

export function useTransport(
  stateRef: MutableRefObject<SequencerState>,
  audioEngine: AudioEngineApi,
  { onEnded }: { onEnded?: () => void } = {},
): TransportApi {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState<VisualPosition | null>(null);

  const playRequestRef = useRef<symbol | null>(null);
  const nextPositionRef = useRef<Position | null>(null);
  const activeModeRef = useRef<PlayMode>('page');
  const selectedPageRef = useRef(0);
  const nextStepTimeRef = useRef(0);
  const endTimeRef = useRef<number | null>(null);
  const visualQueueRef = useRef<{ position: VisualPosition; time: number }[]>([]);
  const visualPositionRef = useRef<VisualPosition | null>(null);
  const schedulerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const onEndedRef = useRef(onEnded);

  const { getContext, ensureRunning, triggerNote } = audioEngine;

  const clearPlayback = useCallback(() => {
    playRequestRef.current = null;
    nextPositionRef.current = null;
    endTimeRef.current = null;
    visualQueueRef.current = [];
    visualPositionRef.current = null;

    if (schedulerIdRef.current !== null) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const stop = useCallback((): void => {
    clearPlayback();
    setIsPlaying(false);
    setPosition(null);
  }, [clearPlayback]);

  const endPlayback = useCallback(() => {
    stop();
    onEndedRef.current?.();
  }, [stop]);

  const scheduleNotes = useCallback(() => {
    const state = stateRef.current;
    const lastPage = state.pages.length - 1;
    if (lastPage < 0) {
      endPlayback();
      return;
    }

    const cursor = nextPositionRef.current;
    if (!cursor) return;
    const mode = state.playMode ?? 'page';
    const modeChanged = activeModeRef.current !== mode;
    const cursorPageRemoved = cursor.page > lastPage;
    const ctx = getContext();
    const endTime = endTimeRef.current;
    if (endTime !== null && !modeChanged && !cursorPageRemoved) {
      if (ctx.currentTime >= endTime) endPlayback();
      return;
    }

    const selected = state.currentPageIndex;
    const followSelection = modeChanged
      ? mode === 'groove'
      : mode === 'page' && selectedPageRef.current !== selected;
    const pageIndex = Math.min(followSelection ? selected : cursor.page, lastPage);
    activeModeRef.current = mode;
    selectedPageRef.current = selected;
    if (endTime !== null || pageIndex !== cursor.page) {
      // If the final step was already submitted, continue at the next page boundary.
      nextPositionRef.current = { page: pageIndex, step: endTime === null ? cursor.step : 0 };
      endTimeRef.current = null;
    }
    if (mode === 'page' && (modeChanged || (cursorPageRemoved && pageIndex !== selected))) {
      state._onPageAdvance?.(pageIndex);
    }

    const settings = {
      mode,
      pages: state.pages.length,
      stepsPerPage: state.stepsPerPage,
      chain: state.chainMode,
      loop: state.loopGroove ?? true,
    };

    const bpm = state.bpm || 120;
    const beatNv = NOTE_VALUES.find((n) => n.key === state.noteValue) ?? NOTE_VALUES[3];
    const stepNv = NOTE_VALUES.find((n) => n.key === state.stepValue) ?? beatNv;
    const stepsPerBeat = beatNv.beatsPerStep / stepNv.beatsPerStep;
    const stepDuration = 60 / (bpm * stepsPerBeat);

    // Keep only the latest elapsed step if animation frames are paused in a background tab.
    const queue = visualQueueRef.current;
    while (queue[1] && queue[1].time <= ctx.currentTime) queue.shift();

    while (nextPositionRef.current && nextStepTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      const pos = nextPositionRef.current;
      const page = state.pages[pos.page];
      if (!page) break;
      const { step } = pos;

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

      queue.push({ position: toVisualPosition(pos, state.stepsPerPage), time: nextStepTimeRef.current });

      nextStepTimeRef.current += stepDuration;
      const next = advancePosition(pos, settings);
      if (!next) {
        // The scheduler submits notes ahead of time. Let the final step play out.
        endTimeRef.current = nextStepTimeRef.current;
        break;
      }
      nextPositionRef.current = next;
      if (mode === 'page' && next.page !== pos.page) {
        state._onPageAdvance?.(next.page);
      }
    }
  }, [endPlayback, getContext, stateRef, triggerNote]);

  const updateVisual = useCallback(function tick(): void {
    const now = getContext().currentTime;
    const queue = visualQueueRef.current;
    while (queue[0] && queue[0].time <= now) {
      visualPositionRef.current = queue.shift()!.position;
    }
    setPosition(visualPositionRef.current);
    rafIdRef.current = requestAnimationFrame(tick);
  }, [getContext]);

  const play = useCallback(async (): Promise<void> => {
    if (playRequestRef.current !== null) return;
    const request = Symbol();
    playRequestRef.current = request;

    let ctx: AudioContext;
    try {
      ctx = await ensureRunning();
    } catch (error) {
      if (playRequestRef.current === request) playRequestRef.current = null;
      throw error;
    }
    if (playRequestRef.current !== request) return;

    const state = stateRef.current;
    const mode = state.playMode ?? 'page';
    activeModeRef.current = mode;
    selectedPageRef.current = state.currentPageIndex;
    if (nextPositionRef.current === null) {
      nextPositionRef.current = { page: mode === 'groove' ? 0 : state.currentPageIndex, step: 0 };
    }
    nextStepTimeRef.current = ctx.currentTime + LOOKAHEAD;

    setIsPlaying(true);
    schedulerIdRef.current = setInterval(scheduleNotes, SCHEDULE_INTERVAL);
    rafIdRef.current = requestAnimationFrame(updateVisual);
  }, [ensureRunning, scheduleNotes, stateRef, updateVisual]);

  const seek = useCallback((globalStep: number): void => {
    const state = stateRef.current;
    const totalSteps = state.pages.length * state.stepsPerPage;
    if (!Number.isFinite(globalStep) || totalSteps <= 0) return;
    const boundedStep = Math.max(0, Math.min(Math.trunc(globalStep), totalSteps - 1));
    const target = fromGlobalStep(boundedStep, state.stepsPerPage);

    nextPositionRef.current = target;
    selectedPageRef.current = state.currentPageIndex;
    endTimeRef.current = null;
    visualQueueRef.current.length = 0;
    const visual = toVisualPosition(target, state.stepsPerPage);
    visualPositionRef.current = visual;
    setPosition(visual);
    if (schedulerIdRef.current !== null) {
      nextStepTimeRef.current = Math.max(nextStepTimeRef.current, getContext().currentTime);
    }
    if ((state.playMode ?? 'page') === 'page' && target.page !== state.currentPageIndex) {
      state._onPageAdvance?.(target.page);
    }
  }, [getContext, stateRef]);

  const toggle = useCallback((): void => {
    if (playRequestRef.current !== null) stop();
    else void play();
  }, [play, stop]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => clearPlayback, [clearPlayback]);

  return {
    isPlaying,
    currentStep: position?.step ?? -1,
    currentPlayPage: position?.page ?? -1,
    currentGlobalStep: position?.globalStep ?? -1,
    play,
    stop,
    toggle,
    seek,
  };
}
