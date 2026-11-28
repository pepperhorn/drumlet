// SPDX-License-Identifier: MIT
type AudioFormat = 'ogg' | 'm4a';

export interface KitSampleDef {
  file: string;
  label?: string;
}

export interface KitManifest {
  name: string;
  id: string;
  description?: string;
  formats?: AudioFormat[];
  samples: Record<string, KitSampleDef>;
}

interface KitCacheEntry {
  manifest: KitManifest;
  buffers: Map<string, AudioBuffer>;
}

const KIT_FALLBACKS = [
  [/^(hh|hihat|hat).*open/, 'hh-open'],
  [/foot|pedal/, 'hh-foot'],
  [/^(hh|hihat|hat|maraca)|^(tambourine|cabasa|shaker)$/, 'hh-closed1'],
  [/^(kick|bass-drum)/, 'kick'],
  [/^(rim|stick|clave)/, 'crossstick'],
  [/^(snare|clap)/, 'snare-on1'],
  [/^(?=.*(?:tom|conga))(?=.*(?:-(?:l{1,3}|low|3)(?:-|$)|floor))/, 'floor-tom'],
  [/tom|conga/, 'hi-tom'],
  [/bell/, 'ride-bell'],
  [/^ride/, 'ride'],
  [/^(crash|cymbal)/, 'crash'],
  [/^/, 'kick'],
] as const;

const kitCache = new Map<string, KitCacheEntry>();
let kitBaseUrl = '/samples/';
let preferredAudioFormat: AudioFormat | undefined;

export function setKitBaseUrl(url: string): void {
  kitBaseUrl = `${url.replace(/\/+$/, '')}/`;
}

export function getKitBaseUrl(): string {
  return kitBaseUrl;
}

export function pickAudioFormat(canPlay: (mime: string) => string): AudioFormat {
  return canPlay('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
}

function getPreferredAudioFormat(): AudioFormat {
  if (preferredAudioFormat) return preferredAudioFormat;
  const audio = globalThis.document?.createElement('audio');
  preferredAudioFormat = pickAudioFormat((mime) => audio?.canPlayType(mime) ?? '');
  return preferredAudioFormat;
}

function kitDirectoryUrl(kitId: string): string {
  return `${getKitBaseUrl()}${kitId}/`;
}

function sampleFile(file: string, format: AudioFormat): string {
  return `${file.replace(/\.[^./]+$/, '')}.${format}`;
}

export function kitSampleUrl(kitId: string, file: string, fmt: AudioFormat): string {
  return `${kitDirectoryUrl(kitId)}${sampleFile(file, fmt)}`;
}

export function resolveKitSampleKey(manifest: KitManifest, wanted: string): string {
  const { samples } = manifest;
  if (Object.hasOwn(samples, wanted)) return wanted;

  const normalized = wanted.toLowerCase();
  for (const [pattern, key] of KIT_FALLBACKS) {
    if (pattern.test(normalized) && Object.hasOwn(samples, key)) return key;
  }
  return Object.keys(samples)[0] ?? 'kick';
}

export async function loadKitManifest(kitId: string): Promise<KitManifest> {
  const directory = kitDirectoryUrl(kitId);
  const cached = kitCache.get(directory);
  if (cached) return cached.manifest;

  const res = await fetch(`${directory}kit.json`);
  if (!res.ok) throw new Error(`Kit "${kitId}" not found`);
  const manifest = (await res.json()) as KitManifest;

  kitCache.set(directory, { manifest, buffers: new Map() });
  return manifest;
}

export async function loadKitSample(ctx: AudioContext, kitId: string, sampleKey: string): Promise<AudioBuffer> {
  const directory = kitDirectoryUrl(kitId);
  const entry = kitCache.get(directory);
  if (!entry) throw new Error(`Kit "${kitId}" not loaded`);

  const cachedBuf = entry.buffers.get(sampleKey);
  if (cachedBuf) return cachedBuf;

  const sampleDef = entry.manifest.samples[sampleKey];
  if (!Object.hasOwn(entry.manifest.samples, sampleKey) || !sampleDef) {
    throw new Error(`Sample "${sampleKey}" not in kit "${kitId}"`);
  }

  const formats = entry.manifest.formats;
  let format = formats?.[0];
  if (format) {
    const preferred = getPreferredAudioFormat();
    if (formats?.includes(preferred)) format = preferred;
  }

  async function fetchSample(file: string): Promise<ArrayBuffer> {
    const res = await fetch(`${directory}${file}`);
    if (!res.ok) throw new Error(`Sample "${sampleKey}" in kit "${kitId}" returned HTTP ${res.status}`);
    return res.arrayBuffer();
  }

  const file = sampleDef.file;
  const bytes = await fetchSample(format ? sampleFile(file, format) : file);
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(bytes);
  } catch (error) {
    const alternate = formats?.find((candidate) => candidate !== format);
    if (!alternate) throw error;
    audioBuffer = await ctx.decodeAudioData(await fetchSample(sampleFile(file, alternate)));
  }

  entry.buffers.set(sampleKey, audioBuffer);
  return audioBuffer;
}

export interface KitSampleEntry {
  key: string;
  label: string;
}

export function getKitSampleNames(manifest: KitManifest): KitSampleEntry[] {
  return Object.entries(manifest.samples).map(([key, def]) => ({
    key,
    label: def.label ?? key,
  }));
}

export const CUSTOM_KIT_IDS: string[] = ['acoustic1'];
