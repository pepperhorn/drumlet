import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { normalizeSequencerState } from './normalizeSequencerState.js';
// Plugin runtime stays JS until phase 2.
import { applyPatchToState, getFieldValue } from '../plugins/librarySchema.js';
import type { SequencerState, SequencerAction } from './sequencerReducer.js';
import type { LibraryEntry, UserLibraryAPI } from './userLibrary.js';

const applyPatchToStateFn = applyPatchToState as (state: unknown, patch: unknown) => unknown;
const getFieldValueFn = getFieldValue as <T>(item: unknown, field: string, fallback?: T) => T;

function snapshotState(state: SequencerState | null): string | null {
  const normalized = normalizeSequencerState(state);
  return normalized ? JSON.stringify(normalized) : null;
}

export interface ActivePresetMetadata {
  sourceEntryId?: string | null;
  sourcePreset?: string | null;
  name?: string;
  inTheStyleOf?: boolean;
  credit?: string;
  creditUrl?: string;
  cover?: string;
  links?: { wikipedia?: string; spotify?: string; youtube?: string };
  bpm?: number | null;
  body?: string | null;
  notes?: string | null;
}

export interface ActivePreset extends Required<Omit<ActivePresetMetadata, 'sourceEntryId' | 'sourcePreset' | 'links' | 'bpm' | 'body' | 'notes'>> {
  sourceEntryId: string | null;
  sourcePreset: string | null;
  links: NonNullable<ActivePresetMetadata['links']>;
  bpm: number | null;
  body: string | null;
  notes: string | null;
}

export interface LibraryEditMode {
  id: string | null;
  isNew?: boolean;
}

interface UseLibraryActionsParams {
  state: SequencerState;
  dispatch: Dispatch<SequencerAction>;
  stop: () => void;
  userLibrary: UserLibraryAPI;
}

export function useLibraryActions({ state, dispatch, stop, userLibrary }: UseLibraryActionsParams) {
  const { addEntry, updateEntry, removeEntry } = userLibrary;

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryEditMode, setLibraryEditMode] = useState<LibraryEditMode | null>(null);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activePreset, setActivePreset] = useState<ActivePreset | null>(null);
  const savedSnapshotRef = useRef<string | null>(snapshotState(state));

  // Dirty-checking effect
  useEffect(() => {
    const currentSnapshot = snapshotState(state);
    setIsDirty(currentSnapshot !== savedSnapshotRef.current);
  }, [state]);

  const buildActivePreset = useCallback((metadata: ActivePresetMetadata = {}): ActivePreset => ({
    sourceEntryId: metadata.sourceEntryId ?? null,
    sourcePreset: metadata.sourcePreset ?? null,
    name: metadata.name ?? 'Untitled',
    inTheStyleOf: metadata.inTheStyleOf ?? false,
    credit: metadata.credit ?? '',
    creditUrl: metadata.creditUrl ?? '',
    cover: metadata.cover ?? '',
    links: metadata.links ?? {},
    bpm: metadata.bpm ?? null,
    body: metadata.body ?? null,
    notes: metadata.notes ?? null,
  }), []);

  const buildActivePresetFromLibraryItem = useCallback((item: unknown): ActivePreset => {
    const it = item as { title?: string; card?: { subtitle?: string; cover?: string } };
    return buildActivePreset({
      name: it.title,
      inTheStyleOf: it.card?.subtitle === 'In the style of' || getFieldValueFn(item, 'in_the_style_of', false),
      credit: getFieldValueFn(item, 'credit', ''),
      creditUrl: getFieldValueFn(item, 'credit_url', ''),
      cover: it.card?.cover ?? getFieldValueFn(item, 'cover', ''),
      links: getFieldValueFn(item, 'links', {}),
      bpm: getFieldValueFn<number | null>(item, 'bpm', null),
      body: getFieldValueFn<string | null>(item, 'description', null),
      notes: getFieldValueFn<string | null>(item, 'notes', null),
      sourcePreset: getFieldValueFn(item, 'source_preset', it.title ?? null),
    });
  }, [buildActivePreset]);

  const markClean = useCallback((nextState: SequencerState): void => {
    savedSnapshotRef.current = snapshotState(nextState);
    setIsDirty(false);
  }, []);

  const loadStateIntoSequencer = useCallback((
    nextState: unknown,
    nextActivePreset: ActivePreset | null = null,
    nextSaveId: string | null = null,
    closeLibrary = true,
  ): boolean => {
    const normalizedState = normalizeSequencerState(nextState);
    if (!normalizedState) return false;

    stop();
    dispatch({ type: 'LOAD_STATE', state: normalizedState });
    setActivePreset(nextActivePreset);
    setCurrentSaveId(nextSaveId);
    setLibraryEditMode(null);
    markClean(normalizedState);
    if (closeLibrary) setLibraryOpen(false);
    return true;
  }, [dispatch, markClean, stop]);

  const handleLoadLibraryState = useCallback((item: unknown): void => {
    const nextState = getFieldValueFn<unknown>(item, 'pattern_state', null);
    if (!nextState) return;
    const defaultPatch = getFieldValueFn<unknown>(item, 'default_patch', null);
    const stateWithPatch = defaultPatch ? applyPatchToStateFn(nextState, defaultPatch) : nextState;
    loadStateIntoSequencer(stateWithPatch, buildActivePresetFromLibraryItem(item), null, true);
  }, [buildActivePresetFromLibraryItem, loadStateIntoSequencer]);

  const handleLoadUserEntry = useCallback((entry: LibraryEntry): void => {
    const nextState = normalizeSequencerState(entry.state);
    if (!nextState) return;
    loadStateIntoSequencer(nextState, buildActivePreset({
      ...entry,
      sourceEntryId: entry.id,
    }), entry.id, true);
  }, [buildActivePreset, loadStateIntoSequencer]);

  const openLibrary = useCallback((): void => {
    setLibraryEditMode(null);
    setLibraryOpen(true);
  }, []);

  const handleEditEntry = useCallback((id: string): void => {
    setLibraryEditMode({ id, isNew: false });
    setLibraryOpen(true);
  }, []);

  const handleDeleteEntry = useCallback((id: string): void => {
    removeEntry(id);
    if (currentSaveId === id) {
      setCurrentSaveId(null);
      setIsDirty(true);
    }
    if (activePreset?.sourceEntryId === id) {
      setActivePreset(null);
    }
    if (libraryEditMode?.id === id) {
      setLibraryEditMode(null);
    }
  }, [activePreset, currentSaveId, libraryEditMode, removeEntry]);

  const handleSaveEdit = useCallback((metadata: ActivePresetMetadata): void => {
    if (libraryEditMode?.id) {
      updateEntry(libraryEditMode.id, {
        ...metadata,
        bpm: state.bpm,
        swing: state.swing || 0,
        state,
      } as Partial<LibraryEntry>);

      if (currentSaveId === libraryEditMode.id) {
        setActivePreset((prev) => buildActivePreset({
          ...(prev ?? {}),
          ...metadata,
          bpm: state.bpm,
          sourceEntryId: libraryEditMode.id,
        }));
      }
    } else {
      const entryId = addEntry(metadata as Parameters<typeof addEntry>[0], state);
      if (entryId) {
        setCurrentSaveId(entryId);
        setActivePreset(buildActivePreset({
          ...metadata,
          bpm: state.bpm,
          sourceEntryId: entryId,
        }));
      }
    }

    markClean(state);
    setLibraryEditMode(null);
  }, [addEntry, buildActivePreset, currentSaveId, libraryEditMode, markClean, state, updateEntry]);

  const handleSave = useCallback((): void => {
    if (!currentSaveId) {
      setLibraryEditMode({ id: null, isNew: true });
      setLibraryOpen(true);
      return;
    }

    if (!isDirty) return;

    updateEntry(currentSaveId, {
      bpm: state.bpm,
      swing: state.swing || 0,
      state,
    } as Partial<LibraryEntry>);
    markClean(state);
  }, [currentSaveId, isDirty, markClean, state, updateEntry]);

  return {
    libraryOpen,
    libraryEditMode,
    currentSaveId,
    isDirty,
    activePreset,
    setLibraryOpen,
    setLibraryEditMode,
    setActivePreset,
    setCurrentSaveId,
    openLibrary,
    handleEditEntry,
    handleDeleteEntry,
    handleSaveEdit,
    handleSave,
    handleLoadUserEntry,
    handleLoadLibraryState,
    loadStateIntoSequencer,
    markClean,
    buildActivePreset,
    buildActivePresetFromLibraryItem,
  };
}
