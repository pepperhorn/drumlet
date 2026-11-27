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
  [/^snare/i, 'snare-on1'],
  [/^(hh|hat)/i, 'hh-closed1'],
  [/^tom/i, 'hi-tom'],
  [/^(cymbal|crash)/i, 'crash'],
  [/^ride/i, 'ride'],
  [/^(rim|stick)/i, 'crossstick'],
] as const;

const kitCache = new Map<string, KitCacheEntry>();
let kitBaseUrl = '/samples/';

export function setKitBaseUrl(url: string): void {
  kitBaseUrl = `${url.replace(/\/+$/, '')}/`;
}

export function getKitBaseUrl(): string {
  return kitBaseUrl;
}

export function pickAudioFormat(canPlay: (mime: string) => string): AudioFormat {
  return canPlay('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
}

function kitDirectoryUrl(kitId: string): string {
  return `${getKitBaseUrl()}${kitId}/`;
}

export function kitSampleUrl(kitId: string, file: string, fmt: AudioFormat): string {
  return `${kitDirectoryUrl(kitId)}${file.replace(/\.[^./]+$/, '')}.${fmt}`;
}

export function resolveKitSampleKey(manifest: KitManifest, wanted: string): string {
  const { samples } = manifest;
  if (Object.hasOwn(samples, wanted)) return wanted;

  const fallback = KIT_FALLBACKS.find(([prefix]) => prefix.test(wanted))?.[1];
  if (fallback && Object.hasOwn(samples, fallback)) return fallback;
  if (Object.hasOwn(samples, 'kick')) return 'kick';
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
  let url = `${directory}${sampleDef.file}`;
  if (formats?.[0]) {
    const audio = globalThis.document?.createElement('audio');
    const preferred = pickAudioFormat((mime) => audio?.canPlayType(mime) ?? '');
    const format = formats.includes(preferred) ? preferred : formats[0];
    url = kitSampleUrl(kitId, sampleDef.file, format);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sample "${sampleKey}" in kit "${kitId}" returned HTTP ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuf);

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
