// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useCallback, useLayoutEffect, useMemo, type MutableRefObject } from 'react';
import { DrumMachine, Soundfont, Sampler, Reverb } from 'smplr';
import { resolveGroup } from './drumGroups.js';
import { getMidiVelocity } from './velocityConfig.js';
import { loadKitManifest, loadKitSample, resolveKitSampleKey } from './customKits.js';
import { acquireAudioContext, releaseAudioContext, setAudioActive, waitForAudioContext } from './sharedAudioContext.js';
import type { Track, VelMode } from '../state/sequencerReducer.js';

// Audio internals stay loosely typed — smplr has no bundled types and the
// audio loop is timing-critical (per migration brief: boundary types only).
type AudioInstrument = any;

interface InstrumentEntry {
  instrument: AudioInstrument;
  type: string;
  key: string;
}

// Track may be decorated with a runtime _audioBuffer for custom samples.
interface AudioTrack extends Track {
  _audioBuffer?: AudioBuffer;
}

export interface AudioEngineApi {
  getContext: () => AudioContext;
  ensureRunning: () => Promise<AudioContext>;
  stopAudio?: () => void;
  loadTrackInstrument: (track: AudioTrack, opts?: { force?: boolean }) => Promise<AudioInstrument | null>;
  triggerNote: (track: AudioTrack, velocityLevel: number, time: number, velMode?: VelMode) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  updateTrackReverb: (trackId: string, reverb: number) => void;
  previewSound: (track: AudioTrack) => Promise<void>;
  loadCustomSample: (file: File) => Promise<AudioBuffer>;
  testAudio: () => Promise<void>;
  instrumentsRef: MutableRefObject<Map<string, InstrumentEntry>>;
}

type StoppableAudioEngine = AudioEngineApi & Required<Pick<AudioEngineApi, 'stopAudio'>>;

interface EngineGraph {
  id: string;
  ctx: AudioContext;
  master: GainNode;
  reverb?: { input: AudioNode; connect(output: AudioNode): void; ready(): Promise<unknown> };
  loading: Set<string>;
}

let nextEngineId = 0;

export function useAudioEngine(): StoppableAudioEngine {
  const graphRef = useRef<EngineGraph | null>(null);
  const instrumentsRef = useRef<Map<string, InstrumentEntry>>(new Map());

  const getGraph = useCallback((): EngineGraph => {
    if (!graphRef.current) {
      const ctx = acquireAudioContext();
      const master = ctx.createGain();
      master.connect(ctx.destination);
      graphRef.current = { id: `drumlet-engine-${++nextEngineId}`, ctx, master, loading: new Set() };
    }
    return graphRef.current;
  }, []);

  const getContext = useCallback(() => getGraph().ctx, [getGraph]);

  const ensureRunning = useCallback(async (): Promise<AudioContext> => {
    const { ctx, master, id } = getGraph();
    master.gain.value = 1;
    setAudioActive(id, true);
    await waitForAudioContext();
    return ctx;
  }, [getGraph]);

  const stopAudio = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.master.gain.value = 0;
    // Explicit time also handles kit voices without a release envelope.
    for (const { instrument } of instrumentsRef.current.values()) instrument.stop({ time: 0 });
    setAudioActive(graph.id, false);
  }, []);

  useLayoutEffect(() => {
    const instruments = instrumentsRef.current;
    return () => {
      const graph = graphRef.current;
      if (!graph) return;
      graphRef.current = null;
      graph.master.disconnect();
      for (const { instrument } of instruments.values()) {
        instrument.stop({ time: 0 });
        instrument.disconnect();
      }
      instruments.clear();
      graph.reverb?.input.disconnect();
      setAudioActive(graph.id, false);
      releaseAudioContext();
    };
  }, []);

  const trackSoundKey = useCallback((track: AudioTrack): string => {
    if (track.sourceType === 'drumMachine') return `dm:${track.instrument}:${track.group}`;
    if (track.sourceType === 'soundfont') return `sf:${track.soundfontName}`;
    if (track.sourceType === 'kit') return `kit:${track.kitId}:${track.kitSample}`;
    if (track.sourceType === 'custom') return `custom:${track.id}`;
    return `unknown:${track.id}`;
  }, []);

  const loadTrackInstrument = useCallback(async (track: AudioTrack, { force = false }: { force?: boolean } = {}): Promise<AudioInstrument | null> => {
    const graph = getGraph();
    const { ctx, master, loading } = graph;
    const key = trackSoundKey(track);

    const existing = instrumentsRef.current.get(track.id);
    if (!force && existing && existing.key === key) return existing.instrument;

    if (loading.has(track.id)) return null;
    loading.add(track.id);

    console.log('[audio] Loading instrument:', track.sourceType, track.instrument || track.soundfontName || track.kitSample || 'custom', 'for track:', track.name);

    let instrument: AudioInstrument;
    try {
      if (existing?.instrument) {
        try { existing.instrument.disconnect(); } catch { /* ok */ }
        instrumentsRef.current.delete(track.id);
      }

      if (track.sourceType === 'drumMachine') {
        instrument = new DrumMachine(ctx, { instrument: track.instrument, destination: master });
        await instrument.load;
        console.log('[audio] DrumMachine loaded:', track.instrument, 'groups:', instrument.getGroupNames());
      } else if (track.sourceType === 'soundfont') {
        instrument = new Soundfont(ctx, { instrument: track.soundfontName, destination: master });
        await instrument.load;
        console.log('[audio] Soundfont loaded:', track.soundfontName);
      } else if (track.sourceType === 'kit' && track.kitId && track.kitSample) {
        const manifest = await loadKitManifest(track.kitId);
        const sampleKey = resolveKitSampleKey(manifest, track.kitSample);
        const buffer = await loadKitSample(ctx, track.kitId, sampleKey);
        if (graphRef.current !== graph) return null;
        instrument = new Sampler(ctx, { buffers: { hit: buffer }, detune: 0, destination: master });
        await instrument.load;
        console.log('[audio] Kit sample loaded:', track.kitId, sampleKey);
      } else if (track.sourceType === 'custom' && track._audioBuffer) {
        instrument = new Sampler(ctx, { buffers: { hit: track._audioBuffer }, detune: 0, destination: master });
        await instrument.load;
        console.log('[audio] Custom sample loaded');
      } else {
        console.warn('[audio] Unknown source type or missing data:', track.sourceType, { kitId: track.kitId, kitSample: track.kitSample, hasBuffer: !!track._audioBuffer });
        return null;
      }

      if (graphRef.current !== graph) return null;
      const vol = Math.round((track.volume ?? 80) * 1.27);
      instrument.output.setVolume(isFinite(vol) ? vol : 100);

      const reverbSend = (track.reverb ?? 20) / 100;
      if (!graph.reverb) {
        const effect: NonNullable<EngineGraph['reverb']> = new Reverb(ctx);
        effect.connect(master);
        graph.reverb = effect;
      }
      const reverb = graph.reverb;
      await reverb.ready();
      if (graphRef.current !== graph) return null;
      instrument.output.addEffect('reverb', reverb, isFinite(reverbSend) ? reverbSend : 0.2);

      instrumentsRef.current.set(track.id, { instrument, type: track.sourceType, key });
      console.log('[audio] Instrument ready for track:', track.name, '(id:', track.id, ')');
      return instrument;
    } catch (err) {
      console.error('[audio] Failed to load instrument for track:', track.name, err);
      throw err;
    } finally {
      if (instrument && instrumentsRef.current.get(track.id)?.instrument !== instrument) instrument.disconnect();
      loading.delete(track.id);
    }
  }, [getGraph, trackSoundKey]);

  const triggerNote = useCallback((track: AudioTrack, velocityLevel: number, time: number, velMode: VelMode = 3): void => {
    const entry = instrumentsRef.current.get(track.id);
    if (!entry) {
      console.warn('[audio] triggerNote: no instrument for track', track.name, track.id);
      return;
    }

    const velocity = getMidiVelocity(velocityLevel, velMode) || 80;
    if (!isFinite(velocity) || !isFinite(time) || time < 0) {
      console.warn('[audio] triggerNote: invalid params', { velocity, time, velocityLevel, velMode });
      return;
    }
    const { instrument, type } = entry;

    try {
      if (type === 'drumMachine') {
        const note = resolveGroup(track.instrument ?? '', track.group ?? '');
        instrument.start({ note, velocity, time });
      } else if (type === 'soundfont') {
        instrument.start({ note: 60, velocity, time, duration: 0.3 });
      } else if (type === 'kit' || type === 'custom') {
        instrument.start({ note: 'hit', velocity, time });
      }
    } catch (e: unknown) {
      console.warn('[audio] triggerNote error:', (e as Error)?.message);
    }
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number): void => {
    const entry = instrumentsRef.current.get(trackId);
    if (entry) {
      const vol = Math.round((volume ?? 80) * 1.27);
      entry.instrument.output.setVolume(isFinite(vol) ? vol : 100);
    }
  }, []);

  const updateTrackReverb = useCallback((trackId: string, reverb: number): void => {
    const entry = instrumentsRef.current.get(trackId);
    if (entry) {
      const send = (reverb ?? 20) / 100;
      entry.instrument.output.sendEffect('reverb', isFinite(send) ? send : 0.2);
    }
  }, []);

  const previewSound = useCallback(async (track: AudioTrack): Promise<void> => {
    const graph = getGraph();
    const ctx = await ensureRunning();
    if (ctx.currentTime === 0) {
      await new Promise((r) => setTimeout(r, 50));
    }

    if (graphRef.current !== graph) return;
    let entry = instrumentsRef.current.get(track.id);
    if (!entry) {
      await loadTrackInstrument(track);
      if (graphRef.current !== graph) return;
      entry = instrumentsRef.current.get(track.id);
      if (!entry) return;
    }

    const time = ctx.currentTime + 0.05;
    const { instrument, type } = entry;
    try {
      if (type === 'drumMachine') {
        instrument.start({ note: resolveGroup(track.instrument ?? '', track.group ?? ''), velocity: 100, time });
      } else if (type === 'soundfont') {
        instrument.start({ note: 60, velocity: 100, time, duration: 0.3 });
      } else if (type === 'kit' || type === 'custom') {
        instrument.start({ note: 'hit', velocity: 100, time });
      }
    } catch {
      await loadTrackInstrument(track, { force: true });
      if (graphRef.current !== graph) return;
      entry = instrumentsRef.current.get(track.id);
      if (!entry) return;
      try {
        const retryTime = ctx.currentTime + 0.05;
        if (entry.type === 'drumMachine') {
          entry.instrument.start({ note: resolveGroup(track.instrument ?? '', track.group ?? ''), velocity: 100, time: retryTime });
        } else if (entry.type === 'soundfont') {
          entry.instrument.start({ note: 60, velocity: 100, time: retryTime, duration: 0.3 });
        } else {
          entry.instrument.start({ note: 'hit', velocity: 100, time: retryTime });
        }
      } catch { /* give up silently */ }
    }
  }, [ensureRunning, getGraph, loadTrackInstrument]);

  const loadCustomSample = useCallback(async (file: File): Promise<AudioBuffer> => {
    const ctx = getContext();
    const arrayBuf = await file.arrayBuffer();
    return ctx.decodeAudioData(arrayBuf);
  }, [getContext]);

  const testAudio = useCallback(async (): Promise<void> => {
    console.log('[audio-test] Starting standalone audio test...');
    try {
      const graph = getGraph();
      const ctx = await ensureRunning();
      const { master } = graph;

      if (ctx.currentTime === 0) {
        await new Promise((r) => setTimeout(r, 100));
        console.log('[audio-test] After 100ms wait, currentTime:', ctx.currentTime);
      }

      if (graphRef.current !== graph) return;
      console.log('[audio-test] Creating DrumMachine TR-808...');
      const dm = new DrumMachine(ctx, { instrument: 'TR-808', destination: master });
      await dm.load;
      console.log('[audio-test] DrumMachine loaded! Groups:', dm.getGroupNames());

      const time = ctx.currentTime + 0.05;
      console.log('[audio-test] Playing kick at time:', time);
      dm.start({ note: 'kick', velocity: 100, time });
      console.log('[audio-test] kick triggered');

      setTimeout(() => {
        const t = ctx.currentTime + 0.05;
        console.log('[audio-test] Playing snare at time:', t);
        dm.start({ note: 'snare', velocity: 100, time: t });
      }, 500);

      setTimeout(() => {
        const t = ctx.currentTime + 0.05;
        console.log('[audio-test] Playing hihat-close at time:', t);
        dm.start({ note: 'hihat-close', velocity: 100, time: t });
      }, 1000);

      console.log('[audio-test] Test complete — you should hear kick, then snare (0.5s), then hihat (1s)');
    } catch (err) {
      console.error('[audio-test] FAILED:', err);
    }
  }, [ensureRunning, getGraph]);

  return useMemo<StoppableAudioEngine>(() => ({
    getContext,
    ensureRunning,
    stopAudio,
    loadTrackInstrument,
    triggerNote,
    updateTrackVolume,
    updateTrackReverb,
    previewSound,
    loadCustomSample,
    testAudio,
    instrumentsRef,
  }), [getContext, ensureRunning, stopAudio, loadTrackInstrument, triggerNote, updateTrackVolume, updateTrackReverb, previewSound, loadCustomSample, testAudio]);
}
