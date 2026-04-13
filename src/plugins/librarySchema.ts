/**
 * Generalized library helpers.
 * Plugins can store arbitrary typed fields, while the host renders a normalized card view.
 */

import type { SequencerState } from '../state/sequencerReducer.js';

export const FIELD_TYPES = {
  TEXT: 'text',
  RICH_TEXT: 'rich_text',
  MARKDOWN: 'markdown',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DURATION: 'duration',
  ENUM: 'enum',
  TAGS: 'tags',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  FILE: 'file',
  URL: 'url',
  BADGE_LIST: 'badge_list',
  PERSON: 'person',
  REFERENCE: 'reference',
  PATTERN_STATE: 'pattern_state',
  CHALLENGE_CONFIG: 'challenge_config',
  LESSON_BLOCKS: 'lesson_blocks',
  TRACK_SELECTION: 'track_selection',
  SCORING_POLICY: 'scoring_policy',
  INPUT_MODE: 'input_mode',
  PROGRESS_STATE: 'progress_state',
  LICENSE_GATE: 'license_gate',
  TELEMETRY_SUMMARY: 'telemetry_summary',
  TELEPHONE_CHAIN: 'telephone_chain',
  CUSTOM_JSON: 'custom_json',
  PATCH_REF: 'patch_ref',
} as const;

export type FieldType = (typeof FIELD_TYPES)[keyof typeof FIELD_TYPES];

export interface PatchRef {
  sourceType: string;
  instrument: string | null;
  kitId: string | null;
}

export function createPatchRef({
  sourceType,
  instrument = null,
  kitId = null,
}: {
  sourceType: string;
  instrument?: string | null;
  kitId?: string | null;
}): PatchRef {
  return { sourceType, instrument, kitId };
}

/**
 * Apply a patch ref to every track in a sequencer state.
 * Returns a new state with each track's source fields rewritten to match the patch.
 * Track `group` (kick/snare/etc) is preserved — only the sound source changes.
 */
export function applyPatchToState(state: SequencerState | null, patch: PatchRef | null): SequencerState | null {
  if (!state || !patch) return state;
  const isCustomKit = patch.sourceType === 'kit';
  return {
    ...state,
    pages: state.pages.map((page) => ({
      ...page,
      tracks: page.tracks.map((track) => ({
        ...track,
        sourceType: patch.sourceType,
        instrument: isCustomKit ? null : (patch.instrument || track.instrument),
        kitId: isCustomKit ? (patch.kitId || track.kitId) : null,
        kitSample: isCustomKit ? track.group : null,
        soundfontName: null,
        customSampleName: null,
      })),
    })),
  };
}

export const ACTION_KINDS = {
  LOAD_STATE: 'load_state',
  OPEN_MODE: 'open_mode',
  OPEN_LESSON: 'open_lesson',
  SHARE: 'share',
} as const;

export type ActionKind = (typeof ACTION_KINDS)[keyof typeof ACTION_KINDS];

export interface LibraryField<T = unknown> {
  id: string;
  type: FieldType;
  value: T;
  [extra: string]: unknown;
}

export function createField<T>(id: string, type: FieldType, value: T, extra: Record<string, unknown> = {}): LibraryField<T> {
  return { id, type, value, ...extra };
}

export interface LibraryItem {
  id: string;
  pluginId: string;
  collectionId: string;
  kind: string;
  title: string;
  fields: LibraryField[];
  card: CardView;
  actions: LibraryAction[];
}

export interface LibraryAction {
  id: string;
  label: string;
  kind: ActionKind;
  targetPluginId?: string;
}

export interface LibraryCollection {
  id: string;
  pluginId: string;
  label: string;
  itemKind: string;
  items: LibraryItem[];
}

export function getFieldValue<T = unknown>(item: unknown, fieldId: string, fallback: T | null = null): T {
  const it = item as { fields?: LibraryField[] } | null | undefined;
  const found = it?.fields?.find((f) => f.id === fieldId);
  return (found?.value ?? fallback) as T;
}

export function createNamespacedLibraryId(pluginId: string, collectionId: string, itemId: string): string {
  return `${pluginId}/${collectionId}/${itemId}`;
}

export interface CardView {
  title: string;
  subtitle: string;
  cover: string;
  meta: string[];
  badges: string[];
  previewSteps: number[] | null;
}

export function createCardView({
  title,
  subtitle = '',
  cover = '',
  meta = [],
  badges = [],
  previewSteps = null,
}: {
  title: string;
  subtitle?: string;
  cover?: string;
  meta?: string[];
  badges?: string[];
  previewSteps?: number[] | null;
}): CardView {
  return { title, subtitle, cover, meta, badges, previewSteps };
}
