import {
  buildExpectedHits,
  scorePerformance,
  DEFAULT_SCORE_POLICY,
  getSequenceDurationSeconds,
} from './timeline.js';
import type { ExpectedHit, PerformanceEvent, ScorePolicy, ScoreResult } from './timeline.js';
import type { SequencerState } from '../state/sequencerReducer.js';
import type { CapabilityPlugin } from './runtime.js';

interface AudioEngine {
  ensureRunning: () => Promise<AudioContext>;
  getContext: () => AudioContext;
}

function createMetronomeClick(ctx: AudioContext, when: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.12, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(when + 0.12);
}

interface AudioInputHandle {
  stop: () => void;
}

async function createBasicAudioInput(
  audioEngine: AudioEngine,
  onEvent: (event: PerformanceEvent) => void,
  getReferenceTimeSec: () => number,
): Promise<AudioInputHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = await audioEngine.ensureRunning();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const samples = new Float32Array(analyser.fftSize);
  let rafId: number | null = null;
  let lastOnsetAt = -1;

  const tick = (): void => {
    analyser.getFloatTimeDomainData(samples);
    let energy = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i] ?? 0;
      energy += sample * sample;
    }
    const rms = Math.sqrt(energy / samples.length);
    const now = ctx.currentTime;
    if (rms > 0.12 && (lastOnsetAt < 0 || now - lastOnsetAt > 0.09)) {
      lastOnsetAt = now;
      const referenceTimeSec = getReferenceTimeSec();
      onEvent({
        source: 'audio',
        trackId: null,
        timeSec: Math.max(0, now - referenceTimeSec),
        confidence: Math.min(1, rms * 4),
      });
    }
    rafId = requestAnimationFrame(tick);
  };

  tick();

  return {
    stop(): void {
      if (rafId) cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

export interface CreateSessionOptions {
  state: SequencerState;
  mode: string;
  trackIds?: string[] | null;
  loops?: number;
  scorePolicy?: ScorePolicy;
  audioEngine: AudioEngine;
}

export interface AudioFollowSession {
  expectedHits: ExpectedHit[];
  getDurationSeconds: () => number;
  startCountIn: (countInBars?: number) => Promise<number>;
  recordEvent: (event: PerformanceEvent) => void;
  setReferenceTime: (referenceTime: number) => void;
  startAudioCapture: () => Promise<AudioInputHandle | null>;
  score: () => ScoreResult;
  getPerformanceEvents: () => PerformanceEvent[];
}

export const audioFollowCorePlugin: CapabilityPlugin & {
  createSession: (opts: CreateSessionOptions) => AudioFollowSession;
} = {
  manifest: {
    id: 'audio-follow-core',
    name: 'Audio Follow Core',
    version: '0.1.0',
    kind: 'capability',
    capabilities: ['input.pads', 'input.audio', 'results.scoring'],
    commercial: false,
    licenseTier: 'core',
  },
  createSession({
    state,
    mode,
    trackIds = null,
    loops = 1,
    scorePolicy = DEFAULT_SCORE_POLICY,
    audioEngine,
  }: CreateSessionOptions): AudioFollowSession {
    const expectedHits = buildExpectedHits(state, { trackIds, loops });
    const performanceEvents: PerformanceEvent[] = [];
    let referenceTimeSec = 0;

    return {
      expectedHits,
      getDurationSeconds(): number {
        return getSequenceDurationSeconds(state, loops);
      },
      async startCountIn(countInBars = 1): Promise<number> {
        const ctx = await audioEngine.ensureRunning();
        const beatDuration = 60 / (state.bpm || 120);
        const beatCount = countInBars * (state.beatsPerBar || 4);
        for (let i = 0; i < beatCount; i += 1) {
          createMetronomeClick(ctx, ctx.currentTime + (i * beatDuration));
        }
        return beatCount * beatDuration;
      },
      recordEvent(event: PerformanceEvent): void {
        performanceEvents.push(event);
      },
      setReferenceTime(referenceTime: number): void {
        referenceTimeSec = referenceTime || 0;
      },
      async startAudioCapture(): Promise<AudioInputHandle | null> {
        if (mode !== 'audio') return null;
        return createBasicAudioInput(audioEngine, (event) => {
          performanceEvents.push(event);
        }, () => referenceTimeSec);
      },
      score(): ScoreResult {
        return scorePerformance({
          expectedHits,
          performanceEvents,
          scorePolicy,
          allowAnyTrack: mode === 'audio',
        });
      },
      getPerformanceEvents(): PerformanceEvent[] {
        return performanceEvents.slice();
      },
    };
  },
};
