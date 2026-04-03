import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeSequencerState } from './normalizeSequencerState.js';
import { getFieldValue } from '../plugins/librarySchema.js';

function snapshotState(state) {
  const normalized = normalizeSequencerState(state);
  return normalized ? JSON.stringify(normalized) : null;
}

export function useLibraryActions({ state, dispatch, stop, userLibrary }) {
  const { addEntry, updateEntry, removeEntry } = userLibrary;

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryEditMode, setLibraryEditMode] = useState(null);
  const [currentSaveId, setCurrentSaveId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const savedSnapshotRef = useRef(snapshotState(state));

  // Dirty-checking effect
  useEffect(() => {
    const currentSnapshot = snapshotState(state);
    setIsDirty(currentSnapshot !== savedSnapshotRef.current);
  }, [state]);

  const buildActivePreset = useCallback((metadata = {}) => ({
    sourceEntryId: metadata.sourceEntryId || null,
    sourcePreset: metadata.sourcePreset || null,
    name: metadata.name || 'Untitled',
    inTheStyleOf: metadata.inTheStyleOf ?? false,
    credit: metadata.credit || '',
    creditUrl: metadata.creditUrl || '',
    cover: metadata.cover || '',
    links: metadata.links || {},
    bpm: metadata.bpm ?? null,
    body: metadata.body || null,
    notes: metadata.notes || null,
  }), []);

  const buildActivePresetFromLibraryItem = useCallback((item) => buildActivePreset({
    name: item.title,
    inTheStyleOf: item.card?.subtitle === 'In the style of' || getFieldValue(item, 'in_the_style_of', false),
    credit: getFieldValue(item, 'credit', ''),
    creditUrl: getFieldValue(item, 'credit_url', ''),
    cover: item.card?.cover || getFieldValue(item, 'cover', ''),
    links: getFieldValue(item, 'links', {}),
    bpm: getFieldValue(item, 'bpm', null),
    body: getFieldValue(item, 'description', null),
    notes: getFieldValue(item, 'notes', null),
    sourcePreset: getFieldValue(item, 'source_preset', item.title),
  }), [buildActivePreset]);

  const markClean = useCallback((nextState) => {
    savedSnapshotRef.current = snapshotState(nextState);
    setIsDirty(false);
  }, []);

  const loadStateIntoSequencer = useCallback((nextState, nextActivePreset = null, nextSaveId = null, closeLibrary = true) => {
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

  const handleLoadLibraryState = useCallback((item) => {
    const nextState = getFieldValue(item, 'pattern_state');
    if (!nextState) return;
    loadStateIntoSequencer(nextState, buildActivePresetFromLibraryItem(item), null, true);
  }, [buildActivePresetFromLibraryItem, loadStateIntoSequencer]);

  const handleLoadUserEntry = useCallback((entry) => {
    const nextState = normalizeSequencerState(entry.state);
    if (!nextState) return;
    loadStateIntoSequencer(nextState, buildActivePreset({
      ...entry,
      sourceEntryId: entry.id,
    }), entry.id, true);
  }, [buildActivePreset, loadStateIntoSequencer]);

  const openLibrary = useCallback(() => {
    setLibraryEditMode(null);
    setLibraryOpen(true);
  }, []);

  const handleEditEntry = useCallback((id) => {
    setLibraryEditMode({ id, isNew: false });
    setLibraryOpen(true);
  }, []);

  const handleDeleteEntry = useCallback((id) => {
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

  const handleSaveEdit = useCallback((metadata) => {
    if (libraryEditMode?.id) {
      updateEntry(libraryEditMode.id, {
        ...metadata,
        bpm: state.bpm,
        swing: state.swing || 0,
        state,
      });

      if (currentSaveId === libraryEditMode.id) {
        setActivePreset((prev) => buildActivePreset({
          ...prev,
          ...metadata,
          bpm: state.bpm,
          sourceEntryId: libraryEditMode.id,
        }));
      }
    } else {
      const entryId = addEntry(metadata, state);
      if (entryId) {
        setCurrentSaveId(entryId);
        setActivePreset(buildActivePreset({
          ...metadata,
          bpm: state.bpm,
          swing: state.swing || 0,
          sourceEntryId: entryId,
        }));
      }
    }

    markClean(state);
    setLibraryEditMode(null);
  }, [addEntry, buildActivePreset, currentSaveId, libraryEditMode, markClean, state, updateEntry]);

  const handleSave = useCallback(() => {
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
    });
    markClean(state);
  }, [currentSaveId, isDirty, markClean, state, updateEntry]);

  return {
    // State
    libraryOpen,
    libraryEditMode,
    currentSaveId,
    isDirty,
    activePreset,

    // Direct setters (for cross-hook coordination)
    setLibraryOpen,
    setLibraryEditMode,
    setActivePreset,
    setCurrentSaveId,

    // Actions
    openLibrary,
    handleEditEntry,
    handleDeleteEntry,
    handleSaveEdit,
    handleSave,
    handleLoadUserEntry,
    handleLoadLibraryState,
    loadStateIntoSequencer,
    markClean,

    // Helpers
    buildActivePreset,
    buildActivePresetFromLibraryItem,
  };
}
