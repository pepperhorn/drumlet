import { loadPresetByName, presetToState } from '../state/presets.js';
import { ACTION_KINDS, FIELD_TYPES, createCardView, createField, createNamespacedLibraryId } from './librarySchema.js';

function createLessonItem(id, title, summary, presetName, recommendedMode) {
  const preset = loadPresetByName(presetName);
  return {
    id: createNamespacedLibraryId('lesson-library', 'lessons', id),
    pluginId: 'lesson-library',
    collectionId: 'lessons',
    kind: 'lesson',
    title,
    fields: [
      createField('summary', FIELD_TYPES.MARKDOWN, summary),
      createField('duration', FIELD_TYPES.DURATION, '8 min'),
      createField('difficulty', FIELD_TYPES.ENUM, 'intermediate'),
      createField('recommended_input_mode', FIELD_TYPES.INPUT_MODE, recommendedMode),
      createField('related_pattern', FIELD_TYPES.REFERENCE, preset?.name || ''),
      createField('pattern_state', FIELD_TYPES.PATTERN_STATE, preset ? presetToState(preset) : null),
      createField('lesson_blocks', FIELD_TYPES.LESSON_BLOCKS, [
        { type: 'intro', title: 'Listen', body: 'Play the reference groove and internalize the pulse.' },
        { type: 'practice', title: 'Loop', body: 'Loop the groove and focus on consistency.' },
      ]),
      createField('cover', FIELD_TYPES.IMAGE, preset?.cover || ''),
    ],
    card: createCardView({
      title,
      subtitle: 'Lesson',
      cover: preset?.cover || '',
      meta: ['8 min', 'Intermediate'],
    }),
    actions: [
      { id: 'lesson-practice', label: 'Start lesson', kind: ACTION_KINDS.OPEN_MODE, targetPluginId: 'practice-follow' },
    ],
  };
}

export const lessonLibraryPlugin = {
  manifest: {
    id: 'lesson-library',
    name: 'Lesson Library',
    version: '0.1.0',
    kind: 'library',
    capabilities: ['library.source'],
    commercial: false,
    licenseTier: 'core',
  },
  getCollections() {
    return [{
      id: 'lesson-library:lessons',
      pluginId: 'lesson-library',
      label: 'Lessons',
      itemKind: 'lesson',
      items: [
        createLessonItem('pocket-foundations', 'Pocket Foundations', 'Work on laying back against a straight groove and keeping the backbeat consistent.', 'Funky Drummer', 'pads'),
        createLessonItem('ghost-note-shape', 'Ghost Note Shape', 'Focus on ghost-note placement and staying relaxed in the middle velocities.', 'Cold Sweat', 'audio'),
      ],
    }];
  },
};
