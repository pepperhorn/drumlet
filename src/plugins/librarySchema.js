/**
 * Generalized library helpers.
 * Plugins can store arbitrary typed fields, while the host renders a normalized card view.
 */

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
};

export const ACTION_KINDS = {
  LOAD_STATE: 'load_state',
  OPEN_MODE: 'open_mode',
  OPEN_LESSON: 'open_lesson',
  SHARE: 'share',
};

export function createField(id, type, value, extra = {}) {
  return { id, type, value, ...extra };
}

export function getFieldValue(item, fieldId, fallback = null) {
  return item.fields?.find((field) => field.id === fieldId)?.value ?? fallback;
}

export function createNamespacedLibraryId(pluginId, collectionId, itemId) {
  return `${pluginId}/${collectionId}/${itemId}`;
}

export function createCardView({
  title,
  subtitle = '',
  cover = '',
  meta = [],
  badges = [],
  previewSteps = null,
}) {
  return { title, subtitle, cover, meta, badges, previewSteps };
}
