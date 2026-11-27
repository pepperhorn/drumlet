import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import acousticKit from '../../public/samples/acoustic1/kit.json';
import {
  getKitBaseUrl, kitSampleUrl, loadKitManifest, loadKitSample, pickAudioFormat,
  resolveKitSampleKey, setKitBaseUrl, type KitManifest,
} from './customKits.js';

const manifest = acousticKit as KitManifest;
const kickFile = acousticKit.samples.kick.file;

afterEach(() => {
  setKitBaseUrl('/samples/');
});

describe('kit URLs and format selection', () => {
  it('defaults to /samples/ and normalizes the configured trailing slash', () => {
    expect(getKitBaseUrl()).toBe('/samples/');
    setKitBaseUrl('https://x/kits');
    expect(kitSampleUrl('acoustic1', kickFile, 'm4a')).toBe('https://x/kits/acoustic1/acoustic-Kick.m4a');
    setKitBaseUrl('https://x/kits///');
    expect(getKitBaseUrl()).toBe('https://x/kits/');
  });

  it('prefers Vorbis when the browser reports support', () => {
    const canPlay = vi.fn(() => 'probably');
    expect(pickAudioFormat(canPlay)).toBe('ogg');
    expect(canPlay).toHaveBeenCalledWith('audio/ogg; codecs="vorbis"');
    expect(pickAudioFormat(() => '')).toBe('m4a');
  });
});

describe('resolveKitSampleKey', () => {
  it.each([
    ['snare-rim', 'snare-on1'],
    ['hat-open', 'hh-closed1'],
    ['hh-closed3', 'hh-closed1'],
    ['tom-low', 'hi-tom'],
    ['cymbal-splash', 'crash'],
    ['crash-dark', 'crash'],
    ['ride-edge', 'ride'],
    ['ride-bell', 'ride-bell'],
    ['rim-shot', 'crossstick'],
    ['stick-click', 'crossstick'],
    ['cowbell', 'kick'],
    ['constructor', 'kick'],
  ])('resolves %s to %s', (wanted, expected) => {
    expect(resolveKitSampleKey(manifest, wanted)).toBe(expected);
  });
});

describe('kit loading', () => {
  const decodeAudioData = vi.fn<AudioContext['decodeAudioData']>();
  const decoder: Pick<AudioContext, 'decodeAudioData'> = { decodeAudioData };
  const ctx = decoder as AudioContext;

  beforeEach(() => {
    decodeAudioData.mockReset();
  });

  it.each(['ogg', 'm4a'])('fetches only the selected %s format and decodes it', async (format) => {
    const base = `https://x/${format}/`;
    setKitBaseUrl(base);
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue(format === 'ogg' ? 'probably' : '');
    const bytes = new ArrayBuffer(4);
    const decoded = { duration: 1 } as AudioBuffer;
    decodeAudioData.mockResolvedValue(decoded);
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(new Response(bytes));
    vi.stubGlobal('fetch', fetch);

    await expect(loadKitManifest('acoustic1')).resolves.toEqual(manifest);
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).resolves.toBe(decoded);
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).resolves.toBe(decoded);
    expect(fetch.mock.calls).toEqual([
      [`${base}acoustic1/kit.json`],
      [`${base}acoustic1/acoustic-Kick.${format}`],
    ]);
    expect(decodeAudioData).toHaveBeenCalledExactlyOnceWith(bytes);
  });

  it('propagates a sample fetch rejection', async () => {
    const error = new Error('offline');
    setKitBaseUrl('https://x/offline');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockRejectedValueOnce(error));

    await loadKitManifest('acoustic1');
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).rejects.toBe(error);
    expect(decodeAudioData).not.toHaveBeenCalled();
  });

  it('rejects an HTTP error before attempting to decode', async () => {
    setKitBaseUrl('https://x/missing');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(new Response(null, { status: 404 })));

    await loadKitManifest('acoustic1');
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).rejects.toThrow('HTTP 404');
    expect(decodeAudioData).not.toHaveBeenCalled();
  });

  it('leaves the declared file unchanged for manifests without formats', async () => {
    const legacy = { id: 'legacy', name: 'Legacy', samples: { kick: { file: 'kick.wav' } } };
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json(legacy))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4)));
    vi.stubGlobal('fetch', fetch);

    await loadKitManifest('legacy');
    await loadKitSample(ctx, 'legacy', 'kick');
    expect(fetch).toHaveBeenLastCalledWith('/samples/legacy/kick.wav');
  });
});
