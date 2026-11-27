export type ViewMode = 'paged' | 'endless';

const STORAGE_KEY = 'drumlet-view-mode';

export function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'endless' ? 'endless' : 'paged';
  } catch {
    return 'paged';
  }
}

export function writeViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The current session still uses the selected view.
  }
}
