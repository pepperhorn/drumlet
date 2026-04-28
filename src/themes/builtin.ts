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

// Dark theme palette: ~10% saturation drop. Keeps hue/identity but
// removes the neon-y feel against deep navy cards.
const TRACK_PALETTE_DARK = {
  coral: '#E87A7A',
  amber: '#E5A75C',
  lime: '#A4CF74',
  sky: '#6FB7D5',
  lavender: '#A695C8',
  peach: '#E5A18E',
  mint: '#74C29A',
  rose: '#D89AB1',
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
  description: 'Indigo-tinted canvas with dark-blue cards. Near-white text. High contrast.',
  colors: {
    // Slightly warmer / indigo-tinted bg keeps the brand warmth in the dark
    // register instead of reading as pure cool charcoal.
    bg: '#0E1220',
    // inset = bg so shadow-inset does the recess work (mirrors light theme).
    inset: '#0E1220',
    card: '#1E2A47',
    cardElevated: '#243454',
    // Surface tiers all sit *above* card so bg-gray-50 buttons inside cards
    // are visible without needing hover. Each tier adds ~15% lightness.
    surface1: '#283557',
    surface2: '#324166',
    surface3: '#3F517D',
    text: '#F1F5F9',
    textInverse: '#0E1220',
    muted: '#94A3B8',
    border: '#334155',
    accent: '#5BC0EB',
    accentText: '#FFFFFF',
    play: '#22C55E',
    stop: '#EF4444',
    track: TRACK_PALETTE_DARK,
  },
};

export const BUILTIN_THEMES: DrumletTheme[] = [LIGHT_THEME, DARK_THEME];
