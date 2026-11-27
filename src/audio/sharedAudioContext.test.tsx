// SPDX-License-Identifier: MIT
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { acquireAudioContext, releaseAudioContext, setAudioActive, waitForAudioContext } from './sharedAudioContext.js';
import { useAudioEngine } from './useAudioEngine.js';
import { createNewPatternState } from '../state/sequencerReducer.js';

function gain() {
  return { connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1 } };
}

class Context {
  static instances: Context[] = [];
  state = 'suspended';
  destination = {};
  currentTime = 1;
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain = vi.fn(gain);

  constructor() { Context.instances.push(this); }
}

vi.mock('smplr', () => {
  class Instrument {
    constructor(readonly ctx: Context, readonly options: { destination: ReturnType<typeof gain> }) {}
    load = Promise.resolve();
    disconnect = vi.fn();
    stop = vi.fn();
    start = vi.fn();
    output = { addEffect: vi.fn(), setVolume: vi.fn(), sendEffect: vi.fn() };
  }

  class Reverb {
    input = gain();
    connect = vi.fn();
    ready = async () => this;
  }

  return { Sampler: Instrument, DrumMachine: Instrument, Soundfont: Instrument, Reverb };
});

function mockWebAudio() {
  Context.instances = [];
  vi.stubGlobal('AudioContext', Context);
}

const track = {
  ...createNewPatternState().pages[0]!.tracks[0]!,
  sourceType: 'custom' as const,
  _audioBuffer: {} as AudioBuffer,
};

describe('shared audio context', () => {
  it('submits resume synchronously even when the previous suspend is pending', async () => {
    mockWebAudio();
    acquireAudioContext();
    const ctx = Context.instances[0]!;
    try {
      setAudioActive('a', true);
      await waitForAudioContext();
      let suspended!: () => void;
      const suspendPending = new Promise<void>(resolve => {
        suspended = () => { ctx.state = 'suspended'; resolve(); };
      });
      ctx.suspend.mockReturnValueOnce(suspendPending);
      ctx.resume.mockImplementationOnce(async () => {
        await suspendPending;
        ctx.state = 'running';
      });
      setAudioActive('a', false);
      expect(ctx.state).toBe('running');
      setAudioActive('b', true);
      expect(ctx.resume).toHaveBeenCalledTimes(2);
      suspended();
      await waitForAudioContext();
      expect(ctx.state).toBe('running');
    } finally {
      releaseAudioContext();
    }
  });

  it('lazily shares one context across eight engines and closes on the final release', async () => {
    mockWebAudio();
    const engines = Array.from({ length: 8 }, () => renderHook(useAudioEngine));
    expect(Context.instances).toHaveLength(0);

    const contexts = [];
    for (const { result } of engines) {
      contexts.push(await result.current.ensureRunning());
      result.current.stopAudio();
      await waitForAudioContext();
    }

    expect(Context.instances).toHaveLength(1);
    const ctx = Context.instances[0]!;
    expect(contexts).toEqual(Array(8).fill(ctx));
    expect(ctx.createGain).toHaveBeenCalledTimes(8);
    expect(ctx.state).toBe('suspended');
    engines.slice(0, -1).forEach(engine => engine.unmount());
    expect(ctx.close).not.toHaveBeenCalled();
    engines.at(-1)!.unmount();
    expect(ctx.close).toHaveBeenCalledTimes(1);
    expect(ctx.state).toBe('closed');

    const next = renderHook(useAudioEngine);
    expect(await next.result.current.ensureRunning()).not.toBe(ctx);
    expect(Context.instances).toHaveLength(2);
  });

  it('keeps app audio running while a player stops and unmounts, with separate dry and wet paths', async () => {
    mockWebAudio();
    const app = renderHook(useAudioEngine);
    const player = renderHook(useAudioEngine);
    const appCtx = await app.result.current.ensureRunning();
    expect(await player.result.current.ensureRunning()).toBe(appCtx);
    const ctx = Context.instances[0]!;
    const [appMaster, playerMaster] = ctx.createGain.mock.results.map(result => result.value);
    const appVoice = await app.result.current.loadTrackInstrument(track);
    const playerVoice = await player.result.current.loadTrackInstrument(track);
    expect(appVoice).not.toBe(playerVoice);
    expect(appVoice.options.destination).toBe(appMaster);
    expect(playerVoice.options.destination).toBe(playerMaster);
    const appReverb = appVoice.output.addEffect.mock.calls[0][1];
    const playerReverb = playerVoice.output.addEffect.mock.calls[0][1];
    expect(appReverb).not.toBe(playerReverb);
    expect(appReverb.connect).toHaveBeenCalledWith(appMaster);
    expect(playerReverb.connect).toHaveBeenCalledWith(playerMaster);

    app.result.current.triggerNote(track, 2, 1.1);
    player.result.current.stopAudio();
    expect(playerMaster!.gain.value).toBe(0);
    expect(playerVoice.stop).toHaveBeenCalledExactlyOnceWith({ time: 0 });
    expect(appMaster!.gain.value).toBe(1);
    expect(ctx.suspend).not.toHaveBeenCalled();
    player.unmount();
    expect(playerMaster!.disconnect).toHaveBeenCalledOnce();
    expect(playerVoice.disconnect).toHaveBeenCalledOnce();
    expect(playerReverb.input.disconnect).toHaveBeenCalledOnce();
    expect(appVoice.stop).not.toHaveBeenCalled();
    expect(appVoice.disconnect).not.toHaveBeenCalled();
    expect(appMaster!.disconnect).not.toHaveBeenCalled();
    expect(ctx.state).toBe('running');
    expect(ctx.close).not.toHaveBeenCalled();
    await app.result.current.previewSound(track);
    expect(appVoice.start).toHaveBeenCalledTimes(2);
    app.unmount();
    expect(ctx.state).toBe('closed');
  });

  it('suspends when the active engine unmounts but an idle engine still holds the context', async () => {
    mockWebAudio();
    const idle = renderHook(useAudioEngine);
    const active = renderHook(useAudioEngine);
    const ctx = idle.result.current.getContext();
    await active.result.current.ensureRunning();
    active.unmount();
    await waitForAudioContext();
    expect(ctx.state).toBe('suspended');
    idle.unmount();
    expect(ctx.state).toBe('closed');
  });

  it('does not register an instrument that finishes loading after unmount', async () => {
    mockWebAudio();
    const engine = renderHook(useAudioEngine);
    const { loadTrackInstrument, instrumentsRef } = engine.result.current;
    const pending = loadTrackInstrument(track);
    engine.unmount();
    expect(await pending).toBeNull();
    expect(instrumentsRef.current.size).toBe(0);
    expect(Context.instances).toHaveLength(1);
    expect(Context.instances[0]!.state).toBe('closed');
  });
});
