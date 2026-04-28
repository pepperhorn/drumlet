# Theme Plugin — Design Notes

Status: **planning** — themes ship as built-ins today (`light`, `dark`). This doc captures the contract a future plugin will implement so users can install community themes without forking Drumlet.

## Goals

1. **Zero-build user authoring.** A theme is a single JSON file. No bundler, no TypeScript, no React.
2. **Drop-in install.** Importing a theme adds it to the picker and persists across reloads.
3. **Sandboxed.** A theme cannot run code or read user data. It only declares colors.
4. **Forwards-compatible.** New optional tokens never break old themes; missing tokens fall back to a sensible base.

## What already exists (PR #13/14)

- Theme schema + JSON Schema export — `src/themes/types.ts` (`DrumletTheme`, `THEME_JSON_SCHEMA`)
- Built-in themes — `src/themes/builtin.ts` (`LIGHT_THEME`, `DARK_THEME`)
- Runtime application — `src/themes/applyTheme.ts`
  - `registerTheme(theme)` — adds a theme to the in-memory registry
  - `applyPreference(id)` / `getStoredPreference()` / `setStoredPreference()`
  - `subscribeTheme(fn)` — change listener
- React hook — `src/state/useTheme.ts`
- Header toggle (light ⇄ dark) — `src/App.tsx`
- No-flash bootstrap — `index.html`
- Doc — `DESIGN.md` § Theming System

The plugin layer is the missing piece: a UI for browsing, importing, validating, persisting, and selecting community themes.

## Scope of the plugin

| In scope | Out of scope |
|---|---|
| Browse a curated theme registry | Hosting the registry (separate concern; can start as a JSON file in this repo) |
| Import from URL or paste-JSON | Editing themes inline (a separate "theme studio" plugin later) |
| Validate against `THEME_JSON_SCHEMA` | Custom CSS / arbitrary stylesheets — themes are color tokens only |
| Persist installed themes in `localStorage` | Cross-device sync (Directus-backed; revisit when there's an account flow) |
| Show preview swatches in the picker | Live preview-on-hover (nice-to-have, not v1) |
| Export current theme as JSON | Theme inheritance / patching |

## Plugin shape

```ts
// src/plugins/themePlugin.ts (future)
import { registerTheme, listThemes } from '../themes/applyTheme.js';
import type { DrumletTheme } from '../themes/types.js';

export interface InstalledTheme extends DrumletTheme {
  installedAt: number;   // unix ms
  source: 'builtin' | 'url' | 'paste';
  sourceUrl?: string;
}

export function installFromJson(json: unknown): InstalledTheme;   // throws on schema fail
export function installFromUrl(url: string): Promise<InstalledTheme>;
export function uninstall(id: string): void;
export function listInstalled(): InstalledTheme[];
```

Installed themes live under `localStorage["drumlet-themes-installed"]` as a JSON array. On app boot the plugin reads them and calls `registerTheme()` for each before the picker mounts. Built-ins are always present; user themes can never override a built-in id (validation rejects `light`, `dark`, anything starting with `drumlet:`).

## Theme id namespacing

| Prefix | Owner | Example |
|---|---|---|
| (none) | Drumlet built-ins | `light`, `dark` |
| `drumlet:` | Reserved for future first-party themes | `drumlet:high-contrast` |
| `user:` | Locally installed | `user:vapor`, `user:nord` |
| `community:` | Pulled from the registry | `community:tomorrow-night` |

Validation rejects ids that don't match `^[a-z0-9][a-z0-9-:_]*$`.

## JSON theme — minimal example

```json
{
  "id": "user:vapor",
  "name": "Vapor",
  "mode": "dark",
  "description": "Synthwave magenta + cyan on plum.",
  "colors": {
    "bg": "#1E0B33",
    "card": "#2C1149",
    "cardElevated": "#3A1B5D",
    "inset": "#170725",
    "surface1": "#2C1149",
    "surface2": "#3A1B5D",
    "surface3": "#481F70",
    "text": "#F8E7FF",
    "textInverse": "#1E0B33",
    "muted": "#B39BD0",
    "border": "#5A2A8A",
    "accent": "#FF4DFF",
    "accentText": "#1E0B33",
    "play": "#22C55E",
    "stop": "#FF5577",
    "track": {
      "coral": "#FF6B6B",
      "amber": "#FFB347",
      "lime": "#A8E06C",
      "sky": "#5BC0EB",
      "lavender": "#B39DDB",
      "peach": "#FFAB91",
      "mint": "#66D9A0",
      "rose": "#F48FB1"
    }
  }
}
```

## Track palette: keep or override?

Built-ins keep the eight track colors constant — instrument identity is part of the brand and a track flipping color when the theme changes is disorienting. Plugin themes **can** override them (the schema permits it) but the picker should warn users that the colors of their existing tracks will visibly shift.

Possible v2: a "Keep my track colors" toggle when applying a theme that supplies its own palette.

## Open questions

- **Registry transport.** A static JSON manifest in this repo (or a sibling repo) is the lightest start. A Directus collection on `apps.pepperhorn.com` would let the team curate without releases — match the existing model used for the beats DB.
- **Picture preview.** Showing a small SVG/PNG mock of the transport bar in each theme's swatch makes a huge UX difference. Render server-side from theme JSON, cache by id-hash.
- **Themes from `.dottl` files.** A song could carry a recommended theme in `extensions.drumlet.recommendedTheme`. Worth speccing once we have more than two themes.
- **Accessibility.** Auto-compute WCAG contrast for `text` on `bg` / `card` and warn when a theme falls below AA. Cheap to add and prevents broken themes shipping.
- **Theme inheritance.** Rather than copy-pasting tokens, allow `"extends": "dark"` so a theme can tweak just a couple of colors. Simple to implement; useful for "Dark + my brand accent" style customisation.

## Naming

Working title: **"Theme Studio"** for the install UI, **"Theme Library"** for the picker. Open to bikeshedding.
