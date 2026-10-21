/** Abbreviate long instrument names for the narrow portrait-mobile label column. */
export function shortTrackLabel(name: string): string {
  return name
    .replace(/^High\b/i, 'Hi')
    .replace(/\bTambourine\b/i, 'Tamb')
    .replace(/\bPercussion\b/i, 'Perc')
    .replace(/\bCymbal\b/i, 'Cym');
}
