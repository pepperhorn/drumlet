import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import acousticKit from '../../public/samples/acoustic1/kit.json';
import {
  getKitBaseUrl, kitSampleUrl, pickAudioFormat,
  resolveKitSampleKey, setKitBaseUrl, type KitManifest,
} from './customKits.js';
import { COMMON_GROUPS, MACHINE_GROUPS } from './drumGroups.js';

const manifest = acousticKit as KitManifest;
const kickFile = acousticKit.samples.kick.file;
const groupNames = [...new Set([...COMMON_GROUPS.map(({ key }) => key), ...Object.values(MACHINE_GROUPS).flat()])];

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
    ['hihat-closed', 'hh-closed1'],
    ['hihat-close', 'hh-closed1'],
    ['hihat-open', 'hh-open'],
    ['hhopen', 'hh-open'],
    ['hat-open', 'hh-open'],
    ['hh-closed3', 'hh-closed1'],
    ['hihat-pedal', 'hh-foot'],
    ['pedal-open-hat', 'hh-foot'],
    ['mid-tom', 'hi-tom'],
    ['tom-low', 'floor-tom'],
    ['tom-1', 'hi-tom'],
    ['tom-2', 'hi-tom'],
    ['tom-3', 'floor-tom'],
    ['conga-lll', 'floor-tom'],
    ['high-conga', 'hi-tom'],
    ['floor-conga', 'floor-tom'],
    ['rimshot', 'crossstick'],
    ['cowbell', 'ride-bell'],
    ['ride-bell', 'ride-bell'],
    ['cymbal', 'crash'],
    ['cymbal-splash', 'crash'],
    ['crash-dark', 'crash'],
    ['ride-edge', 'ride'],
    ['rim-shot', 'crossstick'],
    ['stick-click', 'crossstick'],
    ['woodblock', 'kick'],
    ['constructor', 'kick'],
    ['HIHAT-OPEN', 'hh-open'],
  ])('resolves %s to %s', (wanted, expected) => {
    expect(resolveKitSampleKey(manifest, wanted)).toBe(expected);
  });

  it.each(groupNames)('resolves app group %s to a kit voice, with kick reserved for kick groups', (group) => {
    const resolved = resolveKitSampleKey(manifest, group);
    expect(Object.hasOwn(manifest.samples, resolved)).toBe(true);
    expect(resolved === 'kick').toBe(/^(kick|bass-drum)/.test(group));
  });

  it('continues through matching rules when their targets are absent', () => {
    const { 'hh-closed1': closed, 'hi-tom': hiTom, ride, kick } = acousticKit.samples;
    const partial = { ...manifest, samples: { 'hh-closed1': closed, 'hi-tom': hiTom, ride, kick } };
    expect(resolveKitSampleKey(partial, 'hihat-open')).toBe('hh-closed1');
    expect(resolveKitSampleKey(partial, 'tom-low')).toBe('hi-tom');
    expect(resolveKitSampleKey(partial, 'ride-bell')).toBe('ride');
  });
});

describe('kit loading', () => {
  const decodeAudioData = vi.fn<AudioContext['decodeAudioData']>();
  const decoder: Pick<AudioContext, 'decodeAudioData'> = { decodeAudioData };
  const ctx = decoder as AudioContext;
  const decoded = { duration: 1 } as AudioBuffer;
  let loader: typeof import('./customKits.js');

  beforeEach(async () => {
    decodeAudioData.mockReset();
    vi.resetModules();
    loader = await import('./customKits.js');
  });

  it.each(['ogg', 'm4a'])('fetches only the selected %s format and decodes it', async (format) => {
    const { setKitBaseUrl, loadKitManifest, loadKitSample } = loader;
    const base = `https://x/${format}/`;
    setKitBaseUrl(base);
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue(format === 'ogg' ? 'probably' : '');
    const bytes = new ArrayBuffer(4);
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
    const { setKitBaseUrl, loadKitManifest, loadKitSample } = loader;
    const error = new Error('offline');
    setKitBaseUrl('https://x/offline');
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockRejectedValueOnce(error);
    vi.stubGlobal('fetch', fetch);

    await loadKitManifest('acoustic1');
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).rejects.toBe(error);
    expect(decodeAudioData).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects an HTTP error before attempting to decode', async () => {
    const { setKitBaseUrl, loadKitManifest, loadKitSample } = loader;
    setKitBaseUrl('https://x/missing');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(new Response(null, { status: 404 })));

    await loadKitManifest('acoustic1');
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).rejects.toThrow('HTTP 404');
    expect(decodeAudioData).not.toHaveBeenCalled();
  });

  it('leaves the declared file unchanged for manifests without formats', async () => {
    const { loadKitManifest, loadKitSample } = loader;
    const legacy = { id: 'legacy', name: 'Legacy', samples: { kick: { file: 'kick.wav' } } };
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json(legacy))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4)));
    vi.stubGlobal('fetch', fetch);

    await loadKitManifest('legacy');
    await loadKitSample(ctx, 'legacy', 'kick');
    expect(fetch).toHaveBeenLastCalledWith('/samples/legacy/kick.wav');
  });

  it('probes browser support once for two different samples', async () => {
    const { loadKitManifest, loadKitSample } = loader;
    const canPlay = vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockImplementation(() => Promise.resolve(new Response(new ArrayBuffer(4)))));
    decodeAudioData.mockResolvedValue(decoded);

    await loadKitManifest('acoustic1');
    await loadKitSample(ctx, 'acoustic1', 'kick');
    await loadKitSample(ctx, 'acoustic1', 'snare-on1');
    expect(canPlay).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['maybe', 'ogg', 'm4a'],
    ['', 'm4a', 'ogg'],
  ] as const)('tries the other listed format after decode failure (%s, %s → %s)', async (support, preferred, alternate) => {
    const { loadKitManifest, loadKitSample } = loader;
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue(support);
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4)))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(8)));
    vi.stubGlobal('fetch', fetch);
    decodeAudioData.mockRejectedValueOnce(new Error('Cannot decode preferred format')).mockResolvedValueOnce(decoded);

    await loadKitManifest('acoustic1');
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).resolves.toBe(decoded);
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).resolves.toBe(decoded);
    expect(fetch.mock.calls).toEqual([
      ['/samples/acoustic1/kit.json'],
      [`/samples/acoustic1/acoustic-Kick.${preferred}`],
      [`/samples/acoustic1/acoustic-Kick.${alternate}`],
    ]);
    expect(decodeAudioData.mock.calls.map(([bytes]) => bytes.byteLength)).toEqual([4, 8]);
  });

  it('propagates a decode failure with no second advertised format', async () => {
    const { loadKitManifest, loadKitSample } = loader;
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ ...manifest, formats: ['ogg'] }))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4)));
    vi.stubGlobal('fetch', fetch);
    const error = new Error('Cannot decode the only format');
    decodeAudioData.mockRejectedValueOnce(error);

    await loadKitManifest('acoustic1');
    await expect(loadKitSample(ctx, 'acoustic1', 'kick')).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
