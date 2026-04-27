/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, type Dispatch, type ReactNode } from 'react';
import { sequencerReducer, createInitialState } from './sequencerReducer.js';
import type { SequencerState, SequencerAction } from './sequencerReducer.js';
import { normalizeSequencerState } from './normalizeSequencerState.js';

interface SequencerContextValue {
  state: SequencerState;
  dispatch: Dispatch<SequencerAction>;
}

const SequencerContext = createContext<SequencerContextValue | null>(null);

const STORAGE_KEY = 'drumlet-state-v2';

function loadSavedState(): SequencerState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return normalizeSequencerState(JSON.parse(saved));
  } catch { /* ignore */ }
  return null;
}

export function SequencerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    sequencerReducer,
    null,
    () => loadSavedState() ?? createInitialState()
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
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

export function useSequencer(): SequencerContextValue {
  const ctx = useContext(SequencerContext);
  if (!ctx) throw new Error('useSequencer must be within SequencerProvider');
  return ctx;
}
