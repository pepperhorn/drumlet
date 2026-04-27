import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { normalizeSequencerState } from './normalizeSequencerState.js';
import type { SequencerState } from './sequencerReducer.js';

const LIBRARY_KEY = 'drumlet-user-library-v1';
const BOOKMARKS_KEY = 'drumlet-bookmarks-v1';

export interface LibraryLinks {
  wikipedia?: string;
  spotify?: string;
  youtube?: string;
}

export interface LibraryKit {
  type: string;
  id: string;
}

export interface LibraryEntry {
  id: string;
  name: string;
  inTheStyleOf: boolean;
  credit: string;
  creditUrl: string;
  cover: string;
  body: string;
  notes: string;
  links: Required<LibraryLinks>;
  bpm: number;
  swing: number;
  kit: LibraryKit;
  createdAt: string;
  updatedAt: string;
  sourcePreset: string | null;
  state: SequencerState;
}

export type LibraryEntryMetadata = Partial<Omit<LibraryEntry, 'id' | 'createdAt' | 'updatedAt' | 'state'>>;

function normalizeBookmarkId(bookmarkId: unknown): string | null {
  if (typeof bookmarkId !== 'string' || !bookmarkId) return null;
  const segments = bookmarkId.split('/');
  if (segments.length === 2) {
    return `factory-library/${bookmarkId}`;
  }
  return bookmarkId;
}

/* ── localStorage helpers ─────────────────────────────────── */

function loadUserLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry): LibraryEntry | null => {
        const e = (entry ?? {}) as Record<string, unknown>;
        const state = normalizeSequencerState(e.state);
        if (!state) return null;

        const firstTrack = state.pages[0]?.tracks?.[0];
        const links = (e.links ?? {}) as LibraryLinks;

        return {
          id: typeof e.id === 'string' ? e.id : uuid(),
          name: typeof e.name === 'string' ? e.name : 'Untitled',
          inTheStyleOf: e.inTheStyleOf === true,
          credit: typeof e.credit === 'string' ? e.credit : '',
          creditUrl: typeof e.creditUrl === 'string' ? e.creditUrl : '',
          cover: typeof e.cover === 'string' ? e.cover : '',
          body: typeof e.body === 'string' ? e.body : '',
          notes: typeof e.notes === 'string' ? e.notes : '',
          links: {
            wikipedia: links.wikipedia ?? '',
            spotify: links.spotify ?? '',
            youtube: links.youtube ?? '',
          },
          bpm: typeof e.bpm === 'number' ? e.bpm : state.bpm,
          swing: typeof e.swing === 'number' ? e.swing : (state.swing ?? 0),
          kit: (e.kit as LibraryKit | undefined) ?? {
            type: firstTrack?.sourceType ?? 'drumMachine',
            id: firstTrack?.instrument ?? firstTrack?.kitId ?? 'TR-808',
          },
          createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
          updatedAt: typeof e.updatedAt === 'string'
            ? e.updatedAt
            : (typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString()),
          sourcePreset: typeof e.sourcePreset === 'string' ? e.sourcePreset : null,
          state,
        };
      })
      .filter((e): e is LibraryEntry => e !== null);
  } catch { return []; }
}

function persistLibrary(entries: LibraryEntry[]): void {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries)); }
  catch { /* quota exceeded — silently ignore */ }
}

function loadBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(normalizeBookmarkId).filter((s): s is string => s !== null))];
  } catch { return []; }
}

function persistBookmarks(ids: string[]): void {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids)); }
  catch { /* quota exceeded */ }
}

/* ── Preset key for bookmarks ─────────────────────────────── */

export function presetKey(categoryName: string, presetName: string): string | null {
  return normalizeBookmarkId(`${categoryName}/${presetName}`);
}

/* ── Hook ─────────────────────────────────────────────────── */

export interface UserLibraryAPI {
  entries: LibraryEntry[];
  bookmarks: string[];
  addEntry: (metadata: LibraryEntryMetadata, state: unknown) => string | null;
  updateEntry: (id: string, updates: Partial<LibraryEntry>) => void;
  removeEntry: (id: string) => void;
  toggleBookmark: (key: string) => void;
}

export function useUserLibrary(): UserLibraryAPI {
  const [entries, setEntries] = useState<LibraryEntry[]>(loadUserLibrary);
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks);

  const addEntry = useCallback((metadata: LibraryEntryMetadata, state: unknown): string | null => {
    const normalizedState = normalizeSequencerState(state);
    if (!normalizedState) return null;

    const timestamp = new Date().toISOString();
    const firstTrack = normalizedState.pages[0]?.tracks?.[0];
    const entry: LibraryEntry = {
      id: uuid(),
      name: metadata.name ?? 'Untitled',
      inTheStyleOf: metadata.inTheStyleOf ?? false,
      credit: metadata.credit ?? '',
      creditUrl: metadata.creditUrl ?? '',
      cover: metadata.cover ?? '',
      body: metadata.body ?? '',
      notes: metadata.notes ?? '',
      links: {
        wikipedia: metadata.links?.wikipedia ?? '',
        spotify: metadata.links?.spotify ?? '',
        youtube: metadata.links?.youtube ?? '',
      },
      bpm: normalizedState.bpm,
      swing: normalizedState.swing || 0,
      kit: firstTrack
        ? { type: firstTrack.sourceType, id: firstTrack.instrument ?? firstTrack.kitId ?? 'TR-808' }
        : { type: 'drumMachine', id: 'TR-808' },
      createdAt: timestamp,
      updatedAt: timestamp,
      sourcePreset: metadata.sourcePreset ?? null,
      state: normalizedState,
    };
    setEntries((prev) => {
      const next = [entry, ...prev];
      persistLibrary(next);
      return next;
    });
    return entry.id;
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<LibraryEntry>): void => {
    setEntries((prev) => {
      const next = prev.map((e): LibraryEntry =>
        e.id === id
          ? {
              ...e,
              ...updates,
              state: updates.state ? (normalizeSequencerState(updates.state) ?? e.state) : e.state,
              updatedAt: new Date().toISOString(),
            }
          : e
      );
      persistLibrary(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string): void => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistLibrary(next);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((key: string): void => {
    const bookmarkId = normalizeBookmarkId(key);
    if (!bookmarkId) return;
    setBookmarks((prev) => {
      const next = prev.includes(bookmarkId)
        ? prev.filter((k) => k !== bookmarkId)
        : [...prev, bookmarkId];
      persistBookmarks(next);
      return next;
    });
  }, []);

  return { entries, bookmarks, addEntry, updateEntry, removeEntry, toggleBookmark };
}
