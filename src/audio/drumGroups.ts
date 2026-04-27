/**
 * Actual group names per drum machine as reported by smplr's getGroupNames().
 * These vary across machines — "hihat" doesn't exist on any of them.
 */
export const MACHINE_GROUPS: Record<string, string[]> = {
  'TR-808': [
    'kick', 'snare', 'clap', 'hihat-close', 'hihat-open',
    'tom-hi', 'mid-tom', 'tom-low', 'cowbell', 'conga-hi',
    'conga-mid', 'conga-low', 'cymbal', 'clave', 'maraca', 'rimshot',
  ],
  'Casio-RZ1': [
    'kick', 'snare', 'clap', 'hihat-closed', 'hihat-open',
    'tom-1', 'tom-2', 'tom-3', 'crash', 'ride',
    'cowbell', 'clave',
  ],
  'LM-2': [
    'kick', 'kick-alt', 'snare-h', 'snare-m', 'snare-l', 'clap',
    'hhclosed', 'hhclosed-long', 'hhclosed-short', 'hhopen',
    'tom-hh', 'tom-h', 'tom-m', 'tom-l', 'tom-ll',
    'crash', 'ride', 'cowbell', 'cabasa', 'tambourine',
    'conga-hh', 'conga-h', 'conga-m', 'conga-l', 'conga-ll', 'conga-lll',
    'stick-h', 'stick-m', 'stick-l',
  ],
  'MFB-512': [
    'kick', 'snare', 'clap', 'hihat-closed', 'hihat-open',
    'tom-hi', 'tom-mid', 'tom-low', 'cymbal',
  ],
  'Roland CR-8000': [
    'kick', 'snare', 'clap', 'hihat-closed', 'hihat-open',
    'tom-high', 'tom-low', 'cowbell', 'conga-high', 'conga-low',
    'cymball', 'clave', 'rimshot',
  ],
};

export interface CommonGroup {
  label: string;
  key: string;
}

export const COMMON_GROUPS: CommonGroup[] = [
  { label: 'Kick', key: 'kick' },
  { label: 'Snare', key: 'snare' },
  { label: 'Hi-hat (C)', key: 'hihat-closed' },
  { label: 'Hi-hat (O)', key: 'hihat-open' },
  { label: 'Clap', key: 'clap' },
  { label: 'Tom', key: 'tom' },
  { label: 'Cowbell', key: 'cowbell' },
  { label: 'Cymbal', key: 'cymbal' },
  { label: 'Rimshot', key: 'rimshot' },
  { label: 'Clave', key: 'clave' },
];

const ALIASES: Record<string, string[]> = {
  'hihat-closed': ['hihat-closed', 'hihat-close', 'hhclosed'],
  'hihat-open': ['hihat-open', 'hhopen'],
  'hihat': ['hihat-closed', 'hihat-close', 'hhclosed'],
  'tom': ['tom-hi', 'tom-high', 'tom-1', 'tom-hh', 'mid-tom'],
  'cymbal': ['cymbal', 'cymball', 'crash'],
  'rimshot': ['rimshot', 'rim'],
  'snare': ['snare', 'snare-h', 'snare-m'],
};

/**
 * Resolve a common group key to the actual group name for a specific machine.
 * Falls back to the first partial match or returns the original key.
 */
export function resolveGroup(machine: string, groupKey: string): string {
  const groups = MACHINE_GROUPS[machine];
  if (!groups) return groupKey;

  if (groups.includes(groupKey)) return groupKey;

  const candidates = ALIASES[groupKey];
  if (candidates) {
    for (const c of candidates) {
      if (groups.includes(c)) return c;
    }
  }

  const prefixMatch = groups.find((g) => g.startsWith(groupKey));
  if (prefixMatch) return prefixMatch;

  return groupKey;
}
