// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { getKitBaseUrl, setKitBaseUrl } from '../audio/customKits.js';
import { useAudioEngine, type AudioEngineApi } from '../audio/useAudioEngine.js';
import { useTransport } from '../audio/useTransport.js';
import type { SequencerState, Track } from '../state/sequencerReducer.js';
import { claimPlayback } from './claimPlayback.js';
import type { DrumletPlayerProps } from './DrumletPlayer.js';

type PlaybackOptions = Pick<DrumletPlayerProps, 'assetBaseUrl' | 'onPlay' | 'onStop' | 'onError' | 'onStep'>;

let kitQueue = Promise.resolve();

async function settled(jobs: Promise<unknown>[]): Promise<void> {
  for (const result of await Promise.allSettled(jobs)) {
    if (result.status === 'rejected') throw result.reason;
  }
}

function prepareInstruments(audio: AudioEngineApi, state: SequencerState, assetBaseUrl?: string) {
  const tracks = new Map<string, Track>();
  for (const page of state.pages) {
    for (const track of page.tracks) {
      if (!tracks.has(track.id)) tracks.set(track.id, track);
    }
  }

  const kitTracks: Track[] = [];
  const jobs: Promise<unknown>[] = [];
  const load = (track: Track) => audio.loadTrackInstrument(track);
  for (const track of tracks.values()) {
    if (track.sourceType === 'kit') kitTracks.push(track);
    else jobs.push(load(track));
  }
  if (kitTracks.length > 0) {
    // The shared loader reads its module-wide base in both the manifest and sample calls.
    const kits = kitQueue.then(async () => {
      const previousBase = getKitBaseUrl();
      if (assetBaseUrl !== undefined) setKitBaseUrl(`${assetBaseUrl.replace(/\/+$/, '')}/kits/`);
      try {
        await settled(kitTracks.map(load));
      } finally {
        if (assetBaseUrl !== undefined) setKitBaseUrl(previousBase);
      }
    });
    kitQueue = kits.catch(() => {});
    jobs.push(kits);
  }

  return settled(jobs);
}

export function usePlayerPlayback(state: SequencerState, options: PlaybackOptions) {
  const id = useId();
  const audio = useAudioEngine();
  const stateRef = useRef(state);
  const optionsRef = useRef(options);
  const request = useRef<symbol | null>(null);
  const release = useRef<(() => void) | undefined>(undefined);
  const prepared = useRef<Promise<void> | null>(null);
  const context = useRef<AudioContext | null>(null);
  const started = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const instruments = audio.instrumentsRef;

  useLayoutEffect(() => {
    stateRef.current = state;
    optionsRef.current = options;
  });

  const finish = useCallback(() => {
    // Smplr's default stop can ramp a kit voice with no release time to NaN.
    for (const { instrument } of instruments.current.values()) instrument.stop({ time: 0 });
    void context.current?.suspend().catch(() => {});
    request.current = null;
    release.current?.();
    release.current = undefined;
    setIsStarting(false);
    if (started.current) {
      started.current = false;
      optionsRef.current.onStop?.();
    }
  }, [instruments]);

  const transport = useTransport(stateRef, audio, { onEnded: finish });
  const { stop: stopTransport, play: startTransport, seek, isPlaying, currentGlobalStep, currentPlayPage } = transport;
  const stop = useCallback(() => {
    stopTransport();
    finish();
  }, [finish, stopTransport]);

  const play = useCallback(async () => {
    if (request.current !== null) return;
    const token = Symbol();
    request.current = token;
    try {
      const releaseClaim = claimPlayback(id, stop);
      if (request.current !== token) {
        releaseClaim();
        return;
      }
      release.current = releaseClaim;
      setIsStarting(true);

      // Queue resume in the user gesture even if a preceding suspend hasn't settled.
      context.current = audio.getContext();
      await context.current.resume();
      if (request.current !== token) return;
      prepared.current ??= prepareInstruments(audio, stateRef.current, optionsRef.current.assetBaseUrl).catch(error => {
        prepared.current = null;
        throw error;
      });
      await prepared.current;
      if (request.current !== token) return;
      await startTransport();
    } catch (cause) {
      if (request.current !== token) return;
      stop();
      const error = cause instanceof Error ? cause : new Error(String(cause));
      optionsRef.current.onError?.(error);
      throw error;
    }

    if (request.current !== token) return;
    started.current = true;
    setIsStarting(false);
    optionsRef.current.onPlay?.();
  }, [audio, id, startTransport, stop]);

  useLayoutEffect(() => () => {
    request.current = null;
    release.current?.();
    release.current = undefined;
    const ctx = context.current;
    context.current = null;
    const disconnect = () => {
      for (const { instrument } of instruments.current.values()) {
        instrument.stop({ time: 0 });
        instrument.disconnect();
      }
      instruments.current.clear();
    };
    disconnect();
    const close = () => {
      disconnect();
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    };
    if (prepared.current) void prepared.current.then(close, close);
    else close();
    prepared.current = null;
  }, [instruments]);

  const step = isPlaying ? currentGlobalStep : -1;
  useEffect(() => {
    if (step >= 0) optionsRef.current.onStep?.(step);
  }, [step]);

  return { play, stop, seek, isPlaying, isStarting, step, page: isPlaying ? currentPlayPage : -1 };
}
