import { useCallback, useEffect, useState } from 'react';
import {
  applyPreference,
  getStoredPreference,
  listThemes,
  setStoredPreference,
  subscribeTheme,
} from '../themes/applyTheme.js';

export type ThemePreference = 'system' | 'light' | 'dark' | string;

export function useTheme(): {
  preference: ThemePreference;
  activeThemeId: string;
  setPreference: (pref: ThemePreference) => void;
  themes: ReturnType<typeof listThemes>;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getStoredPreference());
  const [activeThemeId, setActiveThemeId] = useState<string>(() => document.documentElement.dataset.theme || 'light');

  useEffect(() => subscribeTheme(setActiveThemeId), []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setStoredPreference(pref);
    setPreferenceState(pref);
    applyPreference(pref);
  }, []);

  return { preference, activeThemeId, setPreference, themes: listThemes() };
}
