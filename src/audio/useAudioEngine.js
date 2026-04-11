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

  // Only create AudioContext when explicitly requested — never on import/mount
  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      console.log('[audio] Created AudioContext, state:', ctxRef.current.state);
    }
    return ctxRef.current;
  }, []);

  // Resume context — must be called from a user gesture handler
  const ensureRunning = useCallback(async () => {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      console.log('[audio] Resuming suspended AudioContext...');
      await ctx.resume();
      console.log('[audio] AudioContext resumed, state:', ctx.state, 'currentTime:', ctx.currentTime);
    }
    return ctx;
  }, [getContext]);

  const getReverb = useCallback(async () => {
    if (reverbRef.current) return reverbRef.current;
    const ctx = getContext();
    const reverb = new Reverb(ctx);
    reverbRef.current = reverb;
    await reverb.ready();
    return reverb;
  }, [getContext]);

  const trackSoundKey = useCallback((track) => {
    if (track.sourceType === 'drumMachine') return `dm:${track.instrument}:${track.group}`;
    if (track.sourceType === 'soundfont') return `sf:${track.soundfontName}`;
    if (track.sourceType === 'kit') return `kit:${track.kitId}:${track.kitSample}`;
    if (track.sourceType === 'custom') return `custom:${track.id}`;
    return `unknown:${track.id}`;
  }, []);

  const loadTrackInstrument = useCallback(async (track, { force = false } = {}) => {
    const ctx = getContext();
    const key = trackSoundKey(track);

    const existing = instrumentsRef.current.get(track.id);
    if (!force && existing && existing.key === key) return existing.instrument;

    if (loadingRef.current.has(track.id)) return null;
    loadingRef.current.add(track.id);

    console.log('[audio] Loading instrument:', track.sourceType, track.instrument || track.soundfontName || track.kitSample || 'custom', 'for track:', track.name);

    try {
      if (existing?.instrument) {
        try { existing.instrument.disconnect(); } catch { /* ok */ }
      }

      let instrument;

      if (track.sourceType === 'drumMachine') {
        instrument = new DrumMachine(ctx, { instrument: track.instrument });
        await instrument.load;
        console.log('[audio] DrumMachine loaded:', track.instrument, 'groups:', instrument.getGroupNames());
      } else if (track.sourceType === 'soundfont') {
        instrument = new Soundfont(ctx, { instrument: track.soundfontName });
        await instrument.load;
        console.log('[audio] Soundfont loaded:', track.soundfontName);
      } else if (track.sourceType === 'kit' && track.kitId && track.kitSample) {
        await loadKitManifest(track.kitId);
        const buffer = await loadKitSample(ctx, track.kitId, track.kitSample);
        instrument = new Sampler(ctx, { buffers: { hit: buffer }, detune: 0 });
        await instrument.load;
        console.log('[audio] Kit sample loaded:', track.kitId, track.kitSample);
      } else if (track.sourceType === 'custom' && track._audioBuffer) {
        instrument = new Sampler(ctx, { buffers: { hit: track._audioBuffer }, detune: 0 });
        await instrument.load;
        console.log('[audio] Custom sample loaded');
      } else {
        console.warn('[audio] Unknown source type or missing data:', track.sourceType, { kitId: track.kitId, kitSample: track.kitSample, hasBuffer: !!track._audioBuffer });
        loadingRef.current.delete(track.id);
        return null;
      }

      const vol = Math.round((track.volume ?? 80) * 1.27);
      instrument.output.setVolume(isFinite(vol) ? vol : 100);

      const reverbSend = (track.reverb ?? 20) / 100;
      const reverb = await getReverb();
      instrument.output.addEffect('reverb', reverb, isFinite(reverbSend) ? reverbSend : 0.2);

      instrumentsRef.current.set(track.id, { instrument, type: track.sourceType, key });
      console.log('[audio] Instrument ready for track:', track.name, '(id:', track.id, ')');
      return instrument;
    } catch (err) {
      console.error('[audio] Failed to load instrument for track:', track.name, err);
      throw err;
    } finally {
      loadingRef.current.delete(track.id);
    }
  }, [getContext, getReverb, trackSoundKey]);

  const triggerNote = useCallback((track, velocityLevel, time, velMode = 3) => {
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
        const note = resolveGroup(track.instrument, track.group);
        instrument.start({ note, velocity, time });
      } else if (type === 'soundfont') {
        instrument.start({ note: 60, velocity, time, duration: 0.3 });
      } else if (type === 'kit' || type === 'custom') {
        instrument.start({ note: 'hit', velocity, time });
      }
    } catch (e) {
      console.warn('[audio] triggerNote error:', e.message);
    }
  }, []);

  const updateTrackVolume = useCallback((trackId, volume) => {
    const entry = instrumentsRef.current.get(trackId);
    if (entry) {
      const vol = Math.round((volume ?? 80) * 1.27);
      entry.instrument.output.setVolume(isFinite(vol) ? vol : 100);
    }
  }, []);

  const updateTrackReverb = useCallback((trackId, reverb) => {
    const entry = instrumentsRef.current.get(trackId);
    if (entry) {
      const send = (reverb ?? 20) / 100;
      entry.instrument.output.sendEffect('reverb', isFinite(send) ? send : 0.2);
    }
  }, []);

  const previewSound = useCallback(async (track) => {
    // Ensure context is running first
    const ctx = await ensureRunning();
    // Wait a tick for currentTime to advance past 0
    if (ctx.currentTime === 0) {
      await new Promise((r) => setTimeout(r, 50));
    }

    let entry = instrumentsRef.current.get(track.id);
    // If no instrument loaded yet, try loading now
    if (!entry) {
      await loadTrackInstrument(track);
      entry = instrumentsRef.current.get(track.id);
      if (!entry) return;
    }

    const time = ctx.currentTime + 0.05;
    const { instrument, type } = entry;
    try {
      if (type === 'drumMachine') {
        instrument.start({ note: resolveGroup(track.instrument, track.group), velocity: 100, time });
      } else if (type === 'soundfont') {
        instrument.start({ note: 60, velocity: 100, time, duration: 0.3 });
      } else if (type === 'kit' || type === 'custom') {
        instrument.start({ note: 'hit', velocity: 100, time });
      }
    } catch {
      // Instrument may have stale internal state from suspended context — force reload and retry
      await loadTrackInstrument(track, { force: true });
      entry = instrumentsRef.current.get(track.id);
      if (!entry) return;
      try {
        const retryTime = ctx.currentTime + 0.05;
        if (entry.type === 'drumMachine') {
          entry.instrument.start({ note: resolveGroup(track.instrument, track.group), velocity: 100, time: retryTime });
        } else if (entry.type === 'soundfont') {
          entry.instrument.start({ note: 60, velocity: 100, time: retryTime, duration: 0.3 });
        } else {
          entry.instrument.start({ note: 'hit', velocity: 100, time: retryTime });
        }
      } catch { /* give up silently */ }
    }
  }, [ensureRunning, loadTrackInstrument]);

  const loadCustomSample = useCallback(async (file) => {
    const ctx = getContext();
    const arrayBuf = await file.arrayBuffer();
    return ctx.decodeAudioData(arrayBuf);
  }, [getContext]);

  // Standalone audio test — bypasses all hooks/caching, raw smplr
  const testAudio = useCallback(async () => {
    console.log('[audio-test] Starting standalone audio test...');
    try {
      const ctx = getContext();
      console.log('[audio-test] AudioContext state:', ctx.state, 'currentTime:', ctx.currentTime);

      if (ctx.state === 'suspended') {
        await ctx.resume();
        console.log('[audio-test] Resumed. state:', ctx.state, 'currentTime:', ctx.currentTime);
      }

      // Wait for currentTime to advance
      if (ctx.currentTime === 0) {
        await new Promise(r => setTimeout(r, 100));
        console.log('[audio-test] After 100ms wait, currentTime:', ctx.currentTime);
      }

      console.log('[audio-test] Creating DrumMachine TR-808...');
      const dm = new DrumMachine(ctx, { instrument: 'TR-808' });
      await dm.load;
      console.log('[audio-test] DrumMachine loaded! Groups:', dm.getGroupNames());

      const time = ctx.currentTime + 0.05;
      console.log('[audio-test] Playing kick at time:', time);
      dm.start({ note: 'kick', velocity: 100, time });
      console.log('[audio-test] kick triggered');

      // Play more notes after short delays
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
  }, [getContext]);

  return useMemo(() => ({
    getContext,
    ensureRunning,
    loadTrackInstrument,
    triggerNote,
    updateTrackVolume,
    updateTrackReverb,
    previewSound,
    loadCustomSample,
    testAudio,
    instrumentsRef,
  }), [getContext, ensureRunning, loadTrackInstrument, triggerNote, updateTrackVolume, updateTrackReverb, previewSound, loadCustomSample, testAudio]);
}
