import type { DrumletTheme } from './types.js';
import { BUILTIN_THEMES, LIGHT_THEME } from './builtin.js';

const STORAGE_KEY = 'drumlet-theme';
const SYSTEM_KEY = 'system';

const themeRegistry = new Map<string, DrumletTheme>();
for (const t of BUILTIN_THEMES) themeRegistry.set(t.id, t);

const listeners = new Set<(themeId: string) => void>();

/** Register a theme so it can be selected by id. Plugins call this. */
export function registerTheme(theme: DrumletTheme): void {
  themeRegistry.set(theme.id, theme);
}

export function listThemes(): DrumletTheme[] {
  return [...themeRegistry.values()];
}

export function getTheme(id: string): DrumletTheme | undefined {
  return themeRegistry.get(id);
}

/**
 * Stored preference. May be a concrete theme id or `"system"` to follow
 * `prefers-color-scheme`.
 */
export function getStoredPreference(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? SYSTEM_KEY;
  } catch {
    return SYSTEM_KEY;
  }
}

export function setStoredPreference(pref: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* quota / private mode — ignore */
  }
}

function resolvePreference(pref: string): DrumletTheme {
  if (pref === SYSTEM_KEY) {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return getTheme(dark ? 'dark' : 'light') ?? LIGHT_THEME;
  }
  return getTheme(pref) ?? LIGHT_THEME;
}

/** Apply a theme to the document root. */
function writeVars(theme: DrumletTheme): void {
  const root = document.documentElement;
  const c = theme.colors;
  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.mode;
  root.style.setProperty('--color-bg', c.bg);
  root.style.setProperty('--color-card', c.card);
  root.style.setProperty('--color-card-elevated', c.cardElevated);
  root.style.setProperty('--color-inset', c.inset);
  root.style.setProperty('--color-text', c.text);
  root.style.setProperty('--color-text-inverse', c.textInverse);
  root.style.setProperty('--color-muted', c.muted);
  root.style.setProperty('--color-border', c.border);
  root.style.setProperty('--color-accent', c.accent);
  root.style.setProperty('--color-accent-text', c.accentText);
  root.style.setProperty('--color-play', c.play);
  root.style.setProperty('--color-stop', c.stop);
  root.style.setProperty('--color-coral', c.track.coral);
  root.style.setProperty('--color-amber', c.track.amber);
  root.style.setProperty('--color-lime', c.track.lime);
  root.style.setProperty('--color-sky', c.track.sky);
  root.style.setProperty('--color-lavender', c.track.lavender);
  root.style.setProperty('--color-peach', c.track.peach);
  root.style.setProperty('--color-mint', c.track.mint);
  root.style.setProperty('--color-rose', c.track.rose);
  // Tailwind grays — dark themes provide these to keep button/hover surfaces
  // legible. Light themes leave them unset so Tailwind defaults apply.
  if (c.surface1) root.style.setProperty('--color-gray-50', c.surface1);
  else root.style.removeProperty('--color-gray-50');
  if (c.surface2) root.style.setProperty('--color-gray-100', c.surface2);
  else root.style.removeProperty('--color-gray-100');
  if (c.surface3) root.style.setProperty('--color-gray-200', c.surface3);
  else root.style.removeProperty('--color-gray-200');
}

/** Apply preference (theme id or `"system"`) and notify listeners. */
export function applyPreference(pref: string): void {
  const theme = resolvePreference(pref);
  writeVars(theme);
  for (const fn of listeners) fn(theme.id);
}

/** Subscribe to theme changes. Returns an unsubscribe fn. */
export function subscribeTheme(fn: (themeId: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Initialise theme handling: apply stored preference now, then re-apply when
 * the OS color-scheme flips (only if the user is on `"system"`).
 */
export function initTheme(): void {
  applyPreference(getStoredPreference());
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  mq?.addEventListener?.('change', () => {
    if (getStoredPreference() === SYSTEM_KEY) applyPreference(SYSTEM_KEY);
  });
}
