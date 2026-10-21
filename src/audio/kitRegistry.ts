/**
 * Registry of every sound patch (kit) a user can apply to a whole pattern.
 *
 * Drum machines come from smplr (see MACHINE_GROUPS); custom sample kits live in
 * public/samples/{kitId}/kit.json. There is no discovery API for custom kits, so
 * they are listed here by hand — add a new entry when a kit folder is added.
 */

import { MACHINE_GROUPS } from './drumGroups.js';
import { applyPatchToState, createPatchRef } from '../plugins/librarySchema.js';
import type { PatchRef } from '../plugins/librarySchema.js';
import type { SequencerState, Track } from '../state/sequencerReducer.js';

export type KitCategory = 'acoustic' | 'analog' | 'digital';

export interface KitDefinition {
  id: string;
  name: string;
  description: string;
  category: KitCategory;
  /** Short era/flavour tag shown as a badge. */
  tag: string;
  patch: PatchRef;
  /** Sample/group names this kit provides. */
  sounds: string[];
}

/** Sample keys in public/samples/acoustic1/kit.json. */
const ACOUSTIC1_SAMPLES = [
  'kick', 'snare-on1', 'snare-on2', 'snare-off', 'crossstick',
  'hh-closed1', 'hh-closed2', 'hh-open', 'hh-foot',
  'hi-tom', 'floor-tom', 'crash', 'ride', 'ride-bell',
];

const machine = (
  id: string,
  name: string,
  description: string,
  category: KitCategory,
  tag: string,
): KitDefinition => ({
  id: `machine:${id}`,
  name,
  description,
  category,
  tag,
  patch: createPatchRef({ sourceType: 'drumMachine', instrument: id }),
  sounds: MACHINE_GROUPS[id] ?? [],
});

export const KIT_REGISTRY: KitDefinition[] = [
  {
    id: 'kit:acoustic1',
    name: 'Acoustic Kit 1',
    description: 'A natural, real-room acoustic drum kit. Warm and human.',
    category: 'acoustic',
    tag: 'Acoustic',
    patch: createPatchRef({ sourceType: 'kit', kitId: 'acoustic1' }),
    sounds: ACOUSTIC1_SAMPLES,
  },
  machine('TR-808', 'Roland TR-808', 'The classic analog boom — deep kicks, snappy claps and crisp hats.', 'analog', 'Classic analog'),
  machine('Roland CR-8000', 'Roland CR-8000', 'Early-80s analog rhythm box with a soft, vintage character.', 'analog', 'Vintage analog'),
  machine('LM-2', 'LinnDrum LM-2', 'Sampled 80s digital drums — punchy pop and funk staple.', 'digital', '80s digital'),
  machine('Casio-RZ1', 'Casio RZ-1', 'Lo-fi 80s sampling drum machine. Gritty and characterful.', 'digital', '80s lo-fi digital'),
  machine('MFB-512', 'MFB-512', 'Compact German analog drum machine. Tight and electronic.', 'analog', 'Analog electronic'),
];

/* ── Sound-role mapping ─────────────────────────────────────── */

/**
 * Canonical role for any group/sample name used across machines and kits.
 * Order matters: more specific patterns first.
 */
const ROLE_PATTERNS: [RegExp, string][] = [
  [/^(kick|bd)/, 'kick'],
  [/cross|stick|rim/, 'rimshot'],
  [/clap/, 'clap'],
  [/snare/, 'snare'],
  [/^(hh|hihat).*foot|pedal/, 'hihat-foot'],
  [/^(hh|hihat).*open/, 'hihat-open'],
  [/^(hh|hihat)/, 'hihat-closed'],
  [/cowbell/, 'cowbell'],
  [/ride-?bell/, 'ride-bell'],
  [/ride/, 'ride'],
  [/crash|cymbal|cymball/, 'crash'],
  [/floor|tom-?(low|l|ll)$|tom-3/, 'tom-low'],
  [/mid-tom|tom-?(mid|m)$|tom-2/, 'tom-mid'],
  [/tom/, 'tom-high'],
  [/clave/, 'clave'],
  [/maraca|cabasa|shaker/, 'shaker'],
  [/tambourine/, 'tambourine'],
  [/conga.*(low|l)+$/, 'conga-low'],
  [/conga.*(mid|m)$/, 'conga-mid'],
  [/conga/, 'conga-high'],
];

function roleOf(group: string | null | undefined): string | null {
  const g = (group ?? '').toLowerCase();
  if (!g) return null;
  for (const [pattern, role] of ROLE_PATTERNS) {
    if (pattern.test(g)) return role;
  }
  return null;
}

/** Ordered candidate names per role — first one the target kit has wins. */
const ROLE_CANDIDATES: Record<string, string[]> = {
  'kick': ['kick', 'bd'],
  'snare': ['snare', 'snare-on1', 'snare-h', 'snare-m'],
  'rimshot': ['rimshot', 'crossstick', 'stick-m', 'stick-h', 'clave', 'snare-off', 'snare'],
  'clap': ['clap', 'snare-on2', 'snare'],
  'hihat-closed': ['hihat-closed', 'hihat-close', 'hhclosed', 'hh-closed1'],
  'hihat-foot': ['hh-foot', 'hhclosed-short', 'hihat-closed', 'hihat-close', 'hh-closed2'],
  'hihat-open': ['hihat-open', 'hhopen', 'hh-open'],
  'ride-bell': ['ride-bell', 'cowbell', 'ride', 'cymbal', 'cymball'],
  'ride': ['ride', 'cymbal', 'cymball', 'crash'],
  'crash': ['crash', 'cymbal', 'cymball', 'ride'],
  'tom-high': ['tom-hi', 'tom-high', 'tom-1', 'tom-h', 'hi-tom'],
  'tom-mid': ['mid-tom', 'tom-mid', 'tom-2', 'tom-m', 'hi-tom', 'tom-hi', 'tom-high'],
  'tom-low': ['tom-low', 'tom-3', 'tom-l', 'floor-tom'],
  'cowbell': ['cowbell', 'ride-bell', 'cymbal', 'ride'],
  'clave': ['clave', 'stick-h', 'crossstick', 'rimshot', 'hihat-closed'],
  'shaker': ['maraca', 'cabasa', 'tambourine', 'hihat-closed', 'hihat-close', 'hhclosed-short', 'hh-closed2'],
  'tambourine': ['tambourine', 'maraca', 'cabasa', 'hihat-open', 'hh-open'],
  'conga-high': ['conga-hi', 'conga-high', 'conga-h', 'tom-hi', 'tom-high', 'tom-1', 'hi-tom'],
  'conga-mid': ['conga-mid', 'conga-m', 'conga-hi', 'conga-high', 'tom-mid', 'mid-tom', 'tom-2', 'hi-tom'],
  'conga-low': ['conga-low', 'conga-l', 'tom-low', 'tom-3', 'floor-tom'],
};

/** Pick the target kit's sound name for a track's existing group, or null if none fits. */
export function resolveSoundForKit(kit: KitDefinition, group: string | null | undefined): string | null {
  if (group && kit.sounds.includes(group)) return group;
  const role = roleOf(group);
  if (!role) return null;
  for (const candidate of ROLE_CANDIDATES[role] ?? []) {
    if (kit.sounds.includes(candidate)) return candidate;
  }
  return null;
}

/**
 * Bulk-apply a kit to every track on every page of a pattern.
 * Uses applyPatchToState for the source swap, then remaps each track's
 * group/kitSample so it points at a sound the new kit actually has.
 * Tracks with no sensible equivalent keep their original sound.
 */
export function applyKitToState(state: SequencerState, kit: KitDefinition): SequencerState {
  const patched = applyPatchToState(state, kit.patch);
  if (!patched) return state;
  const isCustomKit = kit.patch.sourceType === 'kit';

  return {
    ...patched,
    pages: patched.pages.map((page, pageIndex) => ({
      ...page,
      tracks: page.tracks.map((track, trackIndex): Track => {
        const original = state.pages[pageIndex]?.tracks[trackIndex];
        if (!original) return track;
        const sound = resolveSoundForKit(kit, original.kitSample ?? original.group);
        if (!sound) return original;
        return isCustomKit
          ? { ...track, group: sound, kitSample: sound }
          : { ...track, group: sound };
      }),
    })),
  };
}

/** Which registry kit (if any) the current page is using, based on its first track. */
export function getActiveKitId(state: SequencerState): string | null {
  const track = state.pages[state.currentPageIndex]?.tracks[0];
  if (!track) return null;
  const match = KIT_REGISTRY.find(({ patch }) => (
    patch.sourceType === track.sourceType && (
      patch.sourceType === 'kit' ? patch.kitId === track.kitId : patch.instrument === track.instrument
    )
  ));
  return match?.id ?? null;
}
