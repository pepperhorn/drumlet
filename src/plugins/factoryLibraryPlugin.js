import { loadPresetCategories, presetToState } from '../state/presets.js';
import { ACTION_KINDS, FIELD_TYPES, createCardView, createField, createNamespacedLibraryId } from './librarySchema.js';

function makeFactoryItem(category, preset) {
  const itemId = createNamespacedLibraryId('factory-library', category.name, preset.name);
  return {
    id: itemId,
    pluginId: 'factory-library',
    collectionId: 'grooves',
    kind: 'pattern',
    title: preset.name,
    fields: [
      createField('cover', FIELD_TYPES.IMAGE, preset.cover || ''),
      createField('bpm', FIELD_TYPES.NUMBER, preset.bpm),
      createField('swing', FIELD_TYPES.NUMBER, preset.swing || 0),
      createField('credit', FIELD_TYPES.TEXT, preset.credit || ''),
      createField('credit_url', FIELD_TYPES.URL, preset.creditUrl || ''),
      createField('description', FIELD_TYPES.MARKDOWN, preset.body || ''),
      createField('notes', FIELD_TYPES.MARKDOWN, preset.notes || ''),
      createField('links', FIELD_TYPES.CUSTOM_JSON, preset.links || {}),
      createField('pattern_state', FIELD_TYPES.PATTERN_STATE, presetToState(preset)),
      createField('source_preset', FIELD_TYPES.TEXT, preset.name),
      createField('in_the_style_of', FIELD_TYPES.BOOLEAN, preset.inTheStyleOf ?? false),
    ],
    card: createCardView({
      title: preset.name,
      subtitle: preset.inTheStyleOf ? 'In the style of' : '',
      cover: preset.cover || '',
      meta: [
        `${preset.bpm} BPM${preset.swing ? ` · swing ${preset.swing}` : ''}`,
        preset.credit || '',
      ].filter(Boolean),
      previewSteps: preset.tracks?.[0]?.steps || null,
    }),
    actions: [
      { id: 'load', label: 'Load', kind: ACTION_KINDS.LOAD_STATE },
      { id: 'practice', label: 'Practice', kind: ACTION_KINDS.OPEN_MODE, targetPluginId: 'practice-follow' },
      { id: 'challenge', label: 'Challenge', kind: ACTION_KINDS.OPEN_MODE, targetPluginId: 'rhythm-challenge' },
      { id: 'telephone', label: 'Telephone', kind: ACTION_KINDS.OPEN_MODE, targetPluginId: 'telephone' },
    ],
  };
}

export const factoryLibraryPlugin = {
  manifest: {
    id: 'factory-library',
    name: 'Factory Library',
    version: '0.1.0',
    kind: 'library',
    capabilities: ['library.source'],
    commercial: false,
    licenseTier: 'core',
  },
  getCollections() {
    return loadPresetCategories().map((category) => ({
      id: `factory-library:${category.name}`,
      pluginId: 'factory-library',
      label: category.name,
      itemKind: 'pattern',
      items: category.presets.map((preset) => makeFactoryItem(category, preset)),
    }));
  },
};
