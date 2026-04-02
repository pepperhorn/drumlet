import { useRef, useCallback, useMemo } from 'react';
import { DrumMachine, Soundfont, Sampler, Reverb } from 'smplr';
import { resolveGroup } from './drumGroups.js';
import { getMidiVelocity } from './velocityConfig.js';
import { loadKitManifest, loadKitSample } from './customKits.js';

export function useAudioEngine() {
  const ctxRef = useRef(null);
  const reverbRef = useRef(null);
  const instrumentsRef = useRef(new Map()); // trackId → { instrument, type, key }
  const loadingRef = useRef(new Set());

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const getReverb = useCallback(async () => {
    if (reverbRef.current) return reverbRef.current;
    const ctx = getContext();
    const reverb = new Reverb(ctx);
    reverbRef.current = reverb;
    await reverb.ready();
    return reverb;
  }, [getContext]);

  // Build a key that uniquely identifies a track's sound config
  const trackSoundKey = useCallback((track) => {
    if (track.sourceType === 'drumMachine') {
      return `dm:${track.instrument}:${track.group}`;
    }
    if (track.sourceType === 'soundfont') {
      return `sf:${track.soundfontName}`;
    }
    if (track.sourceType === 'kit') {
      return `kit:${track.kitId}:${track.kitSample}`;
    }
    if (track.sourceType === 'custom') {
      return `custom:${track.id}`;
    }
    return `unknown:${track.id}`;
  }, []);

  const loadTrackInstrument = useCallback(async (track) => {
    const ctx = getContext();
    const key = trackSoundKey(track);

    // Already loaded with same config?
    const existing = instrumentsRef.current.get(track.id);
    if (existing && existing.key === key) {
      return existing.instrument;
    }

    // Already loading?
    if (loadingRef.current.has(track.id)) return null;
    loadingRef.current.add(track.id);

    try {
      // Dispose old instrument
      if (existing?.instrument) {
        try { existing.instrument.disconnect(); } catch { /* ok */ }
      }

      let instrument;

      if (track.sourceType === 'drumMachine') {
        instrument = new DrumMachine(ctx, { instrument: track.instrument });
        await instrument.load;
      } else if (track.sourceType === 'soundfont') {
        instrument = new Soundfont(ctx, { instrument: track.soundfontName });
        await instrument.load;
      } else if (track.sourceType === 'kit' && track.kitId && track.kitSample) {
        await loadKitManifest(track.kitId);
        const buffer = await loadKitSample(ctx, track.kitId, track.kitSample);
        instrument = new Sampler(ctx, {
          buffers: { hit: buffer },
        });
        await instrument.load;
      } else if (track.sourceType === 'custom' && track._audioBuffer) {
        instrument = new Sampler(ctx, {
          buffers: { hit: track._audioBuffer },
        });
        await instrument.load;
      } else {
        loadingRef.current.delete(track.id);
        return null;
      }

      // Set volume (guard against NaN from missing/undefined values)
      const vol = Math.round((track.volume ?? 80) * 1.27);
      instrument.output.setVolume(isFinite(vol) ? vol : 100);

      // Attach reverb
      const reverbSend = (track.reverb ?? 20) / 100;
      const reverb = await getReverb();
      instrument.output.addEffect('reverb', reverb, isFinite(reverbSend) ? reverbSend : 0.2);

      instrumentsRef.current.set(track.id, { instrument, type: track.sourceType, key });
      return instrument;
    } finally {
      loadingRef.current.delete(track.id);
    }
  }, [getContext, getReverb, trackSoundKey]);

  const triggerNote = useCallback((track, velocityLevel, time, velMode = 3) => {
    const entry = instrumentsRef.current.get(track.id);
    if (!entry) return;

    const velocity = getMidiVelocity(velocityLevel, velMode) || 80;
    if (!isFinite(velocity) || !isFinite(time)) return;
    const { instrument, type } = entry;

    if (type === 'drumMachine') {
      const resolvedGroup = resolveGroup(track.instrument, track.group);
      instrument.start({ note: resolvedGroup, velocity, time });
    } else if (type === 'soundfont') {
      instrument.start({ note: 60, velocity, time, duration: 0.3 });
    } else if (type === 'kit' || type === 'custom') {
      instrument.start({ note: 'hit', velocity, time });
    }
  }, []);

  const updateTrackVolume = useCallback((trackId, volume) => {
    const entry = instrumentsRef.current.get(trackId);
    if (entry) {
      entry.instrument.output.setVolume(Math.round(volume * 1.27));
    }
  }, []);

  const updateTrackReverb = useCallback((trackId, reverb) => {
    const entry = instrumentsRef.current.get(trackId);
    if (entry) {
      entry.instrument.output.sendEffect('reverb', reverb / 100);
    }
  }, []);

  const previewSound = useCallback((track) => {
    const entry = instrumentsRef.current.get(track.id);
    if (!entry) return;
    const ctx = getContext();
    const { instrument, type } = entry;
    if (type === 'drumMachine') {
      const resolvedGroup = resolveGroup(track.instrument, track.group);
      instrument.start({ note: resolvedGroup, velocity: 100, time: ctx.currentTime });
    } else if (type === 'soundfont') {
      instrument.start({ note: 60, velocity: 100, time: ctx.currentTime, duration: 0.3 });
    } else if (type === 'kit' || type === 'custom') {
      instrument.start({ note: 'hit', velocity: 100, time: ctx.currentTime });
    }
  }, [getContext]);

  // Load a dropped audio file into a Sampler
  const loadCustomSample = useCallback(async (file) => {
    const ctx = getContext();
    const arrayBuf = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuf);
    return audioBuffer;
  }, [getContext]);

  return useMemo(() => ({
    getContext,
    loadTrackInstrument,
    triggerNote,
    updateTrackVolume,
    updateTrackReverb,
    previewSound,
    loadCustomSample,
    instrumentsRef,
  }), [getContext, loadTrackInstrument, triggerNote, updateTrackVolume, updateTrackReverb, previewSound, loadCustomSample]);
}
