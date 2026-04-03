import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { normalizeSequencerState } from './normalizeSequencerState.js';

const LIBRARY_KEY = 'drumlet-user-library-v1';
const BOOKMARKS_KEY = 'drumlet-bookmarks-v1';

function normalizeBookmarkId(bookmarkId) {
  if (typeof bookmarkId !== 'string' || !bookmarkId) return null;
  const segments = bookmarkId.split('/');
  if (segments.length === 2) {
    return `factory-library/${bookmarkId}`;
  }
  return bookmarkId;
}

/* ── localStorage helpers ─────────────────────────────────── */

function loadUserLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        const state = normalizeSequencerState(entry?.state);
        if (!state) return null;

        const firstTrack = state.pages[0]?.tracks?.[0];

        return {
          id: entry?.id || uuid(),
          name: entry?.name || 'Untitled',
          inTheStyleOf: entry?.inTheStyleOf ?? false,
          credit: entry?.credit || '',
          creditUrl: entry?.creditUrl || '',
          cover: entry?.cover || '',
          body: entry?.body || '',
          notes: entry?.notes || '',
          links: {
            wikipedia: entry?.links?.wikipedia || '',
            spotify: entry?.links?.spotify || '',
            youtube: entry?.links?.youtube || '',
          },
          bpm: entry?.bpm ?? state.bpm,
          swing: entry?.swing ?? state.swing ?? 0,
          kit: entry?.kit || {
            type: firstTrack?.sourceType || 'drumMachine',
            id: firstTrack?.instrument || firstTrack?.kitId || 'TR-808',
          },
          createdAt: entry?.createdAt || new Date().toISOString(),
          updatedAt: entry?.updatedAt || entry?.createdAt || new Date().toISOString(),
          sourcePreset: entry?.sourcePreset || null,
          state,
        };
      })
      .filter(Boolean);
  } catch { return []; }
}

function persistLibrary(entries) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries)); }
  catch { /* quota exceeded — silently ignore */ }
}

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(normalizeBookmarkId).filter(Boolean))];
  } catch { return []; }
}

function persistBookmarks(ids) {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids)); }
  catch { /* quota exceeded */ }
}

/* ── Preset key for bookmarks ─────────────────────────────── */

export function presetKey(categoryName, presetName) {
  return normalizeBookmarkId(`${categoryName}/${presetName}`);
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useUserLibrary() {
  const [entries, setEntries] = useState(loadUserLibrary);
  const [bookmarks, setBookmarks] = useState(loadBookmarks);

  const addEntry = useCallback((metadata, state) => {
    const normalizedState = normalizeSequencerState(state);
    if (!normalizedState) return null;

    const timestamp = new Date().toISOString();
    const firstTrack = normalizedState.pages[0]?.tracks?.[0];
    const entry = {
      id: uuid(),
      name: metadata.name || 'Untitled',
      inTheStyleOf: metadata.inTheStyleOf ?? false,
      credit: metadata.credit || '',
      creditUrl: metadata.creditUrl || '',
      cover: metadata.cover || '',
      body: metadata.body || '',
      notes: metadata.notes || '',
      links: {
        wikipedia: metadata.links?.wikipedia || '',
        spotify: metadata.links?.spotify || '',
        youtube: metadata.links?.youtube || '',
      },
      bpm: normalizedState.bpm,
      swing: normalizedState.swing || 0,
      kit: firstTrack
        ? { type: firstTrack.sourceType, id: firstTrack.instrument || firstTrack.kitId }
        : { type: 'drumMachine', id: 'TR-808' },
      createdAt: timestamp,
      updatedAt: timestamp,
      sourcePreset: metadata.sourcePreset || null,
      state: normalizedState,
    };
    setEntries((prev) => {
      const next = [entry, ...prev];
      persistLibrary(next);
      return next;
    });
    return entry.id;
  }, []);

  const updateEntry = useCallback((id, updates) => {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              ...updates,
              state: updates.state ? normalizeSequencerState(updates.state) : e.state,
              updatedAt: new Date().toISOString(),
            }
          : e
      );
      persistLibrary(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistLibrary(next);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((key) => {
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
