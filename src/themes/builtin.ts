import type { DrumletTheme } from './types.js';

const TRACK_PALETTE = {
  coral: '#FF6B6B',
  amber: '#FFB347',
  lime: '#A8E06C',
  sky: '#5BC0EB',
  lavender: '#B39DDB',
  peach: '#FFAB91',
  mint: '#66D9A0',
  rose: '#F48FB1',
};

export const LIGHT_THEME: DrumletTheme = {
  id: 'light',
  name: 'Light',
  mode: 'light',
  description: 'The original warm-light Drumlet theme.',
  colors: {
    bg: '#FAFBFC',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    inset: '#FAFBFC',
    text: '#1A1A2E',
    textInverse: '#FFFFFF',
    muted: '#94A3B8',
    border: '#E2E8F0',
    accent: '#5BC0EB',
    accentText: '#FFFFFF',
    play: '#22C55E',
    stop: '#EF4444',
    track: TRACK_PALETTE,
  },
};

export const DARK_THEME: DrumletTheme = {
  id: 'dark',
  name: 'Dark Studio',
  mode: 'dark',
  description: 'Grey-black canvas with dark-blue cards. White text. High contrast.',
  colors: {
    bg: '#0F1218',
    card: '#1E2A47',
    cardElevated: '#243454',
    inset: '#161B25',
    surface1: '#1E2A47',
    surface2: '#283557',
    surface3: '#324166',
    text: '#F1F5F9',
    textInverse: '#0F1218',
    muted: '#94A3B8',
    border: '#334155',
    accent: '#5BC0EB',
    accentText: '#FFFFFF',
    play: '#22C55E',
    stop: '#EF4444',
    track: TRACK_PALETTE,
  },
};

export const BUILTIN_THEMES: DrumletTheme[] = [LIGHT_THEME, DARK_THEME];
