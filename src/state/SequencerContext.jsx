import { createContext, useContext, useReducer, useEffect } from 'react';
import { sequencerReducer, createInitialState } from './sequencerReducer.js';

const SequencerContext = createContext(null);

const STORAGE_KEY = 'drumlet-state-v2';

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.pages && parsed.stepsPerPage) {
        // Migrate top-level fields
        if (!parsed.bpm || !isFinite(parsed.bpm)) parsed.bpm = 120;
        if (parsed.swing == null || !isFinite(parsed.swing)) parsed.swing = 0;
        if (parsed.humanize == null || !isFinite(parsed.humanize)) parsed.humanize = 0;

        // Migrate global velocityLevels → per-track velMode
        const globalVel = parsed.velocityLevels;
        delete parsed.velocityLevels;

        for (const page of parsed.pages) {
          for (const track of page.tracks) {
            if (track.velMode == null) track.velMode = globalVel || 3;
            if (track.volume == null || !isFinite(track.volume)) track.volume = 80;
            if (track.reverb == null || !isFinite(track.reverb)) track.reverb = 20;
            if (!track.sourceType) track.sourceType = 'drumMachine';
            if (!track.instrument && track.sourceType === 'drumMachine') track.instrument = 'TR-808';
            if (!track.group && track.sourceType === 'drumMachine') track.group = 'kick';
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
