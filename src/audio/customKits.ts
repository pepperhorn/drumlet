/**
 * Custom sample kit loader.
 *
 * Kit structure on disk:
 *   public/samples/{kitId}/kit.json   — manifest
 *   public/samples/{kitId}/*.ogg      — sample files
 */

export interface KitSampleDef {
  file: string;
  label?: string;
}

export interface KitManifest {
  name: string;
  id: string;
  description?: string;
  samples: Record<string, KitSampleDef>;
}

interface KitCacheEntry {
  manifest: KitManifest;
  buffers: Record<string, AudioBuffer>;
}

const kitCache = new Map<string, KitCacheEntry>();

export async function loadKitManifest(kitId: string): Promise<KitManifest> {
  const cached = kitCache.get(kitId);
  if (cached) return cached.manifest;

  const res = await fetch(`/samples/${kitId}/kit.json`);
  if (!res.ok) throw new Error(`Kit "${kitId}" not found`);
  const manifest = (await res.json()) as KitManifest;

  kitCache.set(kitId, { manifest, buffers: {} });
  return manifest;
}

export async function loadKitSample(ctx: AudioContext, kitId: string, sampleKey: string): Promise<AudioBuffer> {
  const entry = kitCache.get(kitId);
  if (!entry) throw new Error(`Kit "${kitId}" not loaded`);

  const cachedBuf = entry.buffers[sampleKey];
  if (cachedBuf) return cachedBuf;

  const sampleDef = entry.manifest.samples[sampleKey];
  if (!sampleDef) throw new Error(`Sample "${sampleKey}" not in kit "${kitId}"`);

  const url = `/samples/${kitId}/${sampleDef.file}`;
  const res = await fetch(url);
  const arrayBuf = await res.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuf);

  entry.buffers[sampleKey] = audioBuffer;
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
