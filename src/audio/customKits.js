/**
 * Custom sample kit loader.
 *
 * Kit structure on disk:
 *   public/samples/{kitId}/kit.json   — manifest
 *   public/samples/{kitId}/*.ogg      — sample files
 *
 * kit.json schema:
 *   {
 *     "name": "Acoustic Kit 1",
 *     "id": "acoustic1",
 *     "description": "...",
 *     "samples": {
 *       "kick": { "file": "kick.ogg", "label": "Kick" },
 *       ...
 *     }
 *   }
 */

const kitCache = new Map(); // kitId → { manifest, buffers }

/**
 * Fetch and cache a kit manifest.
 */
export async function loadKitManifest(kitId) {
  if (kitCache.has(kitId)) return kitCache.get(kitId).manifest;

  const res = await fetch(`/samples/${kitId}/kit.json`);
  if (!res.ok) throw new Error(`Kit "${kitId}" not found`);
  const manifest = await res.json();

  kitCache.set(kitId, { manifest, buffers: {} });
  return manifest;
}

/**
 * Load a single sample buffer from a kit.
 */
export async function loadKitSample(ctx, kitId, sampleKey) {
  const entry = kitCache.get(kitId);
  if (!entry) throw new Error(`Kit "${kitId}" not loaded`);

  // Return cached buffer
  if (entry.buffers[sampleKey]) return entry.buffers[sampleKey];

  const sampleDef = entry.manifest.samples[sampleKey];
  if (!sampleDef) throw new Error(`Sample "${sampleKey}" not in kit "${kitId}"`);

  const url = `/samples/${kitId}/${sampleDef.file}`;
  const res = await fetch(url);
  const arrayBuf = await res.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuf);

  entry.buffers[sampleKey] = audioBuffer;
  return audioBuffer;
}

/**
 * Get sample names/labels for a kit (for the UI picker).
 */
export function getKitSampleNames(manifest) {
  return Object.entries(manifest.samples).map(([key, def]) => ({
    key,
    label: def.label || key,
  }));
}

/**
 * Discover available kits by fetching a registry.
 * For now, hardcoded. Later: fetch from /samples/index.json or API.
 */
export const CUSTOM_KIT_IDS = ['acoustic1'];
