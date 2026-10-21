import { STOCK_RHYTHMS, stockRhythmToState } from '../state/stockRhythms.js';
import type { StockRhythm } from '../state/stockRhythms.js';
import {
  ACTION_KINDS,
  FIELD_TYPES,
  createCardView,
  createField,
  createNamespacedLibraryId,
} from './librarySchema.js';
import type { LibraryCollection, LibraryItem } from './librarySchema.js';
import type { LibraryPlugin } from './runtime.js';

export const STOCK_RHYTHMS_SECTION = 'Stock Rhythms';

function makeStockItem(rhythm: StockRhythm): LibraryItem {
  const state = stockRhythmToState(rhythm);
  return {
    id: createNamespacedLibraryId('stock-rhythms', rhythm.genre, rhythm.id),
    pluginId: 'stock-rhythms',
    collectionId: `stock-rhythms:${rhythm.genre}`,
    kind: 'pattern',
    title: rhythm.name,
    fields: [
      createField('bpm', FIELD_TYPES.NUMBER, rhythm.bpm),
      createField('swing', FIELD_TYPES.NUMBER, rhythm.swing),
      createField('difficulty', FIELD_TYPES.ENUM, rhythm.level),
      createField('genre', FIELD_TYPES.TEXT, rhythm.genre),
      createField('time_signature', FIELD_TYPES.TEXT, rhythm.timeSignature),
      createField('bars', FIELD_TYPES.NUMBER, rhythm.barCount),
      createField('kit', FIELD_TYPES.TEXT, rhythm.kitLabel),
      createField('tags', FIELD_TYPES.TAGS, rhythm.tags),
      createField('description', FIELD_TYPES.MARKDOWN, rhythm.description),
      createField('notes', FIELD_TYPES.MARKDOWN, rhythm.tip),
      createField('pattern_state', FIELD_TYPES.PATTERN_STATE, state),
      createField('source_preset', FIELD_TYPES.TEXT, rhythm.id),
    ],
    card: createCardView({
      title: rhythm.name,
      meta: [
        `${rhythm.tempo} BPM`,
        rhythm.timeSignature,
        `${rhythm.barCount} bars`,
        rhythm.kitLabel,
      ],
      badges: [rhythm.level],
      previewSteps: state.pages?.[0]?.tracks?.[0]?.steps as number[] | undefined ?? null,
    }),
    actions: [
      { id: 'load', label: 'Load', kind: ACTION_KINDS.LOAD_STATE },
      { id: 'practice', label: 'Practice', kind: ACTION_KINDS.OPEN_MODE, targetPluginId: 'practice-follow' },
      { id: 'challenge', label: 'Challenge', kind: ACTION_KINDS.OPEN_MODE, targetPluginId: 'rhythm-challenge' },
    ],
  };
}

export const stockRhythmsPlugin: LibraryPlugin = {
  manifest: {
    id: 'stock-rhythms',
    name: 'Stock Rhythms',
    version: '0.1.0',
    kind: 'library',
    capabilities: ['library.source'],
    commercial: false,
    licenseTier: 'core',
  },
  getCollections(): LibraryCollection[] {
    return STOCK_RHYTHMS.genres.map((genre) => ({
      id: `stock-rhythms:${genre}`,
      pluginId: 'stock-rhythms',
      label: genre,
      itemKind: 'pattern',
      section: STOCK_RHYTHMS_SECTION,
      items: STOCK_RHYTHMS.rhythms.filter((r) => r.genre === genre).map(makeStockItem),
    }));
  },
};
