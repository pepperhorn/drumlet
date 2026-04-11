/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect } from 'react';
import { sequencerReducer, createInitialState } from './sequencerReducer.js';
import { normalizeSequencerState } from './normalizeSequencerState.js';

const SequencerContext = createContext(null);

const STORAGE_KEY = 'drumlet-state-v2';

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return normalizeSequencerState(JSON.parse(saved));
  } catch { /* ignore */ }
  return null;
}

export function SequencerProvider({ children }) {
  const [state, dispatch] = useReducer(
    sequencerReducer,
    null,
    () => loadSavedState() || createInitialState()
  );

  // Auto-save (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Don't save customSampleName buffers, just the metadata
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch { /* quota exceeded, ignore */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <SequencerContext.Provider value={{ state, dispatch }}>
      {children}
    </SequencerContext.Provider>
  );
}

export function useSequencer() {
  const ctx = useContext(SequencerContext);
  if (!ctx) throw new Error('useSequencer must be within SequencerProvider');
  return ctx;
}
