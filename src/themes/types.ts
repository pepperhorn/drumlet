/**
 * Drumlet theme schema.
 *
 * A theme is a flat object of named color tokens. Themes are applied at
 * runtime by writing CSS custom properties on `<html>` — there is no build
 * step. Plugins (and users) can register their own themes by passing a
 * `DrumletTheme` to `registerTheme()` from `applyTheme.ts`.
 *
 * Naming guide:
 *  - "surface*" — UI surfaces (button, hover, divider). Map to Tailwind grays.
 *  - "card", "bg", "inset" — depth/elevation tiers (DESIGN.md L0–L3).
 *  - "accent" — primary action color. "track.*" — instrument identity palette.
 */

export interface ThemeColors {
  /** App background (DESIGN L0). */
  bg: string;
  /** Floating cards: transport bar, page tabs, modals (DESIGN L1/L3). */
  card: string;
  /** Higher-elevation surface: dropdowns, menus that float over cards. */
  cardElevated: string;
  /** Recessed/inset surface: cells, inputs (DESIGN L2). */
  inset: string;

  /**
   * Soft button background — maps to Tailwind `gray-50`.
   * Default light theme leaves this empty (Tailwind default applies).
   */
  surface1?: string;
  /** Hover/pressed soft button background — maps to `gray-100`. */
  surface2?: string;
  /** Divider tint — maps to `gray-200`. */
  surface3?: string;

  /** Primary text. */
  text: string;
  /** Text used on accent / dark surfaces. */
  textInverse: string;
  /** Secondary / disabled text. */
  muted: string;

  /** Border between surfaces. */
  border: string;

  /**
   * Empty step-cell face — the "rubber pad" surface. Optional; defaults
   * to white. Override in dark themes to avoid stark white pads against
   * the dark canvas (e.g. warm cream / parchment for a Launchpad feel).
   */
  cell?: string;
  /** Empty step-cell hover. Optional; defaults to surface1 / gray-50. */
  cellHover?: string;

  /** Primary action accent (default: track.sky). */
  accent: string;
  /** Foreground used on accent backgrounds. */
  accentText: string;

  /** Play / success state. */
  play: string;
  /** Stop / error state. */
  stop: string;

  /** Eight-color instrument identity palette. Order is meaningful. */
  track: {
    coral: string;
    amber: string;
    lime: string;
    sky: string;
    lavender: string;
    peach: string;
    mint: string;
    rose: string;
  };
}

export interface DrumletTheme {
  /** Stable id used for persistence and `data-theme` attribute. */
  id: string;
  /** Display name shown in pickers. */
  name: string;
  /** Coarse mode hint — informs OS-level UI (scrollbars, color-scheme). */
  mode: 'light' | 'dark';
  /** Optional one-line description for theme pickers. */
  description?: string;
  /** Color tokens. Every required field must be set. */
  colors: ThemeColors;
}

/**
 * JSON Schema (draft-07) describing the theme format.
 * Exposed for tools that want to validate user/plugin themes.
 */
export const THEME_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://drumlet.app/schemas/theme.json',
  title: 'DrumletTheme',
  type: 'object',
  required: ['id', 'name', 'mode', 'colors'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-:_]*$' },
    name: { type: 'string', minLength: 1 },
    mode: { type: 'string', enum: ['light', 'dark'] },
    description: { type: 'string' },
    colors: {
      type: 'object',
      required: [
        'bg', 'card', 'cardElevated', 'inset',
        'text', 'textInverse', 'muted', 'border',
        'accent', 'accentText', 'play', 'stop', 'track',
      ],
      properties: {
        bg: { type: 'string' },
        card: { type: 'string' },
        cardElevated: { type: 'string' },
        inset: { type: 'string' },
        surface1: { type: 'string' },
        surface2: { type: 'string' },
        surface3: { type: 'string' },
        text: { type: 'string' },
        textInverse: { type: 'string' },
        muted: { type: 'string' },
        border: { type: 'string' },
        cell: { type: 'string' },
        cellHover: { type: 'string' },
        accent: { type: 'string' },
        accentText: { type: 'string' },
        play: { type: 'string' },
        stop: { type: 'string' },
        track: {
          type: 'object',
          required: ['coral', 'amber', 'lime', 'sky', 'lavender', 'peach', 'mint', 'rose'],
          properties: {
            coral: { type: 'string' },
            amber: { type: 'string' },
            lime: { type: 'string' },
            sky: { type: 'string' },
            lavender: { type: 'string' },
            peach: { type: 'string' },
            mint: { type: 'string' },
            rose: { type: 'string' },
          },
        },
      },
    },
  },
} as const;
