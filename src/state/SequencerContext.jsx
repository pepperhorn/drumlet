import { createContext, useContext, useReducer, useEffect } from 'react';
import { sequencerReducer, createInitialState } from './sequencerReducer.js';

const SequencerContext = createContext(null);

const STORAGE_KEY = 'drumlet-state';

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.pages && parsed.stepsPerPage) {
        // Migrate: add fields that may not exist in older saved states
        if (parsed.swing == null) parsed.swing = 0;
        if (parsed.humanize == null) parsed.humanize = 0;
        // Migrate global velocityLevels → per-track velMode
        if (parsed.velocityLevels != null) {
          for (const page of parsed.pages) {
            for (const track of page.tracks) {
              if (track.velMode == null) track.velMode = parsed.velocityLevels;
            }
          }
          delete parsed.velocityLevels;
        } else {
          for (const page of parsed.pages) {
            for (const track of page.tracks) {
              if (track.velMode == null) track.velMode = 3;
            }
          }
        }
        return parsed;
      }
    }
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
