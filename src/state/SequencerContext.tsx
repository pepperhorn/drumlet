/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useMemo, type Dispatch, type ReactNode } from 'react';
import { sequencerReducer, createInitialState } from './sequencerReducer.js';
import type { SequencerState, SequencerAction } from './sequencerReducer.js';
import { normalizeSequencerState } from './normalizeSequencerState.js';

interface SequencerContextValue {
  state: SequencerState;
  dispatch: Dispatch<SequencerAction | HistoryAction>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const SequencerContext = createContext<SequencerContextValue | null>(null);

const STORAGE_KEY = 'drumlet-state-v2';
const HISTORY_LIMIT = 50;

// Actions that should not push onto undo history (transient UI / cursor state)
const NON_HISTORY_ACTIONS = new Set<string>([
  'SET_ACTIVE_CELL',
  'SET_PENDING_SPLIT',
  'SET_CURRENT_PAGE',
]);

export type HistoryAction = { type: 'UNDO' } | { type: 'REDO' };

interface HistoryState {
  past: SequencerState[];
  present: SequencerState;
  future: SequencerState[];
}

function historyReducer(
  hist: HistoryState,
  action: SequencerAction | HistoryAction,
): HistoryState {
  if (action.type === 'UNDO') {
    if (hist.past.length === 0) return hist;
    const previous = hist.past[hist.past.length - 1]!;
    return {
      past: hist.past.slice(0, -1),
      present: previous,
      future: [hist.present, ...hist.future],
    };
  }
  if (action.type === 'REDO') {
    if (hist.future.length === 0) return hist;
    const next = hist.future[0]!;
    return {
      past: [...hist.past, hist.present],
      present: next,
      future: hist.future.slice(1),
    };
  }
  const next = sequencerReducer(hist.present, action);
  if (next === hist.present) return hist;
  if (NON_HISTORY_ACTIONS.has(action.type) || action.type === 'LOAD_STATE') {
    return { past: hist.past, present: next, future: hist.future };
  }
  const newPast = [...hist.past, hist.present];
  if (newPast.length > HISTORY_LIMIT) newPast.shift();
  return { past: newPast, present: next, future: [] };
}

function loadSavedState(): SequencerState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return normalizeSequencerState(JSON.parse(saved));
  } catch { /* ignore */ }
  return null;
}

export function SequencerProvider({ children }: { children: ReactNode }) {
  const [hist, dispatch] = useReducer(
    historyReducer,
    null,
    (): HistoryState => ({
      past: [],
      present: loadSavedState() ?? createInitialState(),
      future: [],
    }),
  );

  const state = hist.present;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch { /* quota exceeded, ignore */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [state]);

  const value = useMemo<SequencerContextValue>(() => ({
    state,
    dispatch,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
  }), [state, hist.past.length, hist.future.length]);

  return (
    <SequencerContext.Provider value={value}>
      {children}
    </SequencerContext.Provider>
  );
}

export function useSequencer(): SequencerContextValue {
  const ctx = useContext(SequencerContext);
  if (!ctx) throw new Error('useSequencer must be within SequencerProvider');
  return ctx;
}
