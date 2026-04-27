# Design System — Drumlet

## Product Context
- **What this is:** Browser-based rhythm education game / step sequencer
- **Who it's for:** Everyone — musicians, non-musicians, kids, anyone with a browser
- **Space/industry:** Music education, rhythm games (closest peers: Groove Pizza, Drumhaus, Rhythm Cat)
- **Project type:** Web app (interactive instrument + game)

## Aesthetic Direction
- **Direction:** Playful/Toy-like — warm, rounded, approachable. Not a studio tool. An instrument that feels like a game.
- **Decoration level:** Intentional — subtle shadows, card depth, glow effects on active elements. Not minimal (too cold), not expressive (fights grid density).
- **Mood:** Opening Drumlet should feel like picking up a colorful toy instrument. Friendly, inviting, zero intimidation. The warm light theme is a deliberate departure from the dark aesthetic that dominates music tools.
- **Reference sites:** Drumhaus (drumha.us) for light-themed drum machine, Groove Pizza (musedlab.org/groovepizza) for educational approach

## Typography
Three-tier type stack. Each font has a clear job.

- **Display/Headings:** Fredoka 600/700 — personality tier. Track names, logo wordmark, control labels, section titles, modal headers. Rounded and bouncy, says "this is fun" without saying "childish."
- **Body/UI:** Inter 400/500 — utility tier. Body text, button labels, descriptions, tooltips, help text. Clean and readable, disappears into the content.
- **Data/Precision:** JetBrains Mono 400/500/600/700 — precision tier. BPM display, accuracy percentages, timing data, count-in numbers, key badges, score breakdowns. Monospace = precision = timing.
- **Loading:** Google Fonts CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
- **Scale (desktop):**
  - 3xl: 48px Fredoka 700 (hero/logo)
  - 2xl: 32px Fredoka 700 (section titles)
  - xl: 24px Fredoka 700 (page titles)
  - lg: 20px Fredoka 600 (track names, control labels)
  - md: 16px Inter 500 (body, buttons)
  - sm: 14px Inter 400 (descriptions, secondary text)
  - xs: 13px Inter 500 / JetBrains Mono 600 (labels, badges)
  - 2xs: 12px JetBrains Mono 500 (micro labels, keyboard hints)
  - data-lg: 48px JetBrains Mono 700 (BPM display, score percentage)
  - data-md: 28px JetBrains Mono 700 (live accuracy)
  - data-sm: 13px JetBrains Mono 600 (timing badges, key badges)
- **Minimum readable size:** 12px on desktop, 14px on mobile. Nothing smaller.

## Color
- **Approach:** Balanced — 8 track accents for instrument identity, 2 semantic, warm neutrals
- **Track accents** (one per instrument row — color IS the track identity):
  - Coral: `#FF6B6B` — typically Kick
  - Amber: `#FFB347` — typically Snare
  - Lime: `#A8E06C` — typically HiHat
  - Sky: `#5BC0EB` — typically Clap, also primary action color
  - Lavender: `#B39DDB` — additional track
  - Peach: `#FFAB91` — additional track
  - Mint: `#66D9A0` — additional track
  - Rose: `#F48FB1` — additional track
- **Semantic:**
  - Play: `#22C55E` — play button, hit feedback, positive states, perfect score
  - Stop: `#EF4444` — stop button, miss feedback, error states
- **Neutrals:**
  - Background: `#FAFBFC` (warm near-white)
  - Card/Surface: `#FFFFFF`
  - Border: `#E2E8F0` (soft edge)
  - Muted: `#94A3B8` (secondary text, labels)
  - Text: `#1A1A2E` (warm navy, NOT pure black)
- **Challenge feedback colors:**
  - Perfect hit: Play green `#22C55E` + glow shadow
  - Great hit: Amber `#FFB347`
  - OK hit: Muted `#94A3B8`
  - Miss: Stop red `#EF4444` + glow shadow
  - Weak timing: Amber `#FFB347`
- **Dark mode:** Available as **Dark Studio** (toggle in app header). Grey-black canvas (`#0F1218`), dark-blue cards (`#1E2A47`), near-white text (`#F1F5F9`). Track palette stays identical — instrument identity does not flip with theme. The warm light theme remains the default and the brand differentiator.

## Theming System

Themes are defined as `DrumletTheme` objects (see `src/themes/types.ts`) and applied at runtime by writing CSS custom properties on `<html>`. Built-ins: `light`, `dark`. Plugins can register their own with `registerTheme()` from `src/themes/applyTheme.ts`.

Token groups:
- **Surfaces** — `bg`, `card`, `cardElevated`, `inset` (DESIGN L0–L3 tiers).
- **Tailwind grays** — `surface1/2/3` map to `--color-gray-50/100/200` so existing utility classes stay legible in dark themes.
- **Text** — `text`, `textInverse`, `muted`.
- **Lines** — `border`.
- **Accent** — `accent`, `accentText` (primary action; default = sky).
- **Semantic** — `play`, `stop`.
- **Track palette** — eight named instrument colors: `coral, amber, lime, sky, lavender, peach, mint, rose`.

Persistence: user choice stored in `localStorage` under `drumlet-theme`. Special value `"system"` follows OS `prefers-color-scheme`.

No-flash: `index.html` runs an inline bootstrap that sets `data-theme` + `color-scheme` before first paint. `index.css` provides CSS-variable fallbacks for `[data-theme="dark"]` so initial render is correct even before `applyTheme.ts` loads. JS later writes the same vars as inline styles on `<html>` (higher specificity), so plugin/custom themes can override.

JSON Schema for theme files: exported as `THEME_JSON_SCHEMA` from `src/themes/types.ts`.

## Depth & Elevation
Three-layer depth system creates physical presence. Each layer sits on top of the previous one.

- **L0 — Background:** `#FAFBFC` — the canvas everything sits on. No shadow.
- **L1 — Card Surface:** `#FFFFFF` + `border: 1px solid #E2E8F0` + `shadow-sm` — transport bar, grid container, page tabs. Floats above the background.
- **L2 — Inset Element:** `#FAFBFC` + `inset shadow` — grid cells, inputs, sliders. Sits INSIDE cards, recessed to create depth.
- **L3 — Overlay/Modal:** `#FFFFFF` + `shadow-2xl` — results screen, share modal, library sidebar, challenge overlays. Floats above everything.

**Shadow scale:**
- `shadow-sm`: `0 1px 3px rgba(26,26,46,0.06), 0 4px 12px rgba(26,26,46,0.03)` — cards, containers
- `shadow-md`: `0 4px 12px rgba(26,26,46,0.08), 0 1px 3px rgba(26,26,46,0.06)` — dropdowns, popovers
- `shadow-lg`: `0 8px 24px rgba(26,26,46,0.08), 0 2px 6px rgba(26,26,46,0.04)` — modals, overlays
- `shadow-xl`: `0 12px 32px rgba(26,26,46,0.12), 0 4px 8px rgba(26,26,46,0.06)` — library sidebar
- `shadow-inset`: `inset 0 1px 2px rgba(26,26,46,0.04)` — cells, inputs (recessed feel)
- `shadow-glow`: `0 2px 8px rgba(accent,0.3)` — colored buttons, active states (uses track accent color)

**Colored glow shadows** (for buttons and active elements):
- Play: `0 2px 6px rgba(34,197,94,0.25)`
- Stop: `0 2px 6px rgba(239,68,68,0.25)`
- Sky: `0 2px 6px rgba(91,192,235,0.25)`
- Playhead: `0 0 8px 2px rgba(91,192,235,0.35)`

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — not cramped, not airy
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(12px) lg(16px) xl(24px) 2xl(32px) 3xl(48px)
- **Grid cell size:** 44px wide × 36px tall (touch-friendly, fits 16 steps on desktop)

## Layout
- **Approach:** Grid-disciplined — the 16-step sequencer grid IS the layout anchor
- **Max content width:** 1280px
- **Structure:** Vertical stack — header → transport → page tabs → grid → challenge bar → footer
- **Card containers:** `bg-card rounded-2xl shadow-sm border border-border` (16px radius)
- **Border radius scale:**
  - sm: 4px (key badges, small buttons)
  - md: 8px (cells, step grid, inputs)
  - lg: 12px (buttons, controls)
  - xl: 16px (cards, containers)
  - 2xl: 24px (overlays, results card)
  - full: 9999px (version badge, circular elements)
- **Breakpoints:**
  - Desktop: ≥1024px — full grid, keyboard input, side-by-side controls
  - Tablet: 768-1023px — full grid, touch input
  - Mobile: <768px — scrollable grid, MPC tap pads for challenge mode

## Motion
- **Approach:** Intentional — motion serves the game feel, not decoration
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **Specific animations:**
  - Cell toggle: scale(1.15) + color transition, 120ms ease
  - Playhead glow: pulsing box-shadow, 1s ease-in-out infinite
  - Hit feedback: flash green + glow, 200ms
  - Miss feedback: flash red + glow, 200ms
  - Count-in number: scale entrance from 0.8→1, 200ms ease-out
  - Mode transition: 500ms fade for hiding/showing UI sections
  - Results card: slide up from bottom, 300ms ease-out
  - Confetti (perfect score): canvas-based particle burst, 2s
  - Loading shimmer: gradient sweep, 1.5s infinite

## CSS Custom Properties
```css
@theme {
  --font-display: "Fredoka", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --color-bg: #FAFBFC;
  --color-card: #FFFFFF;
  --color-text: #1A1A2E;
  --color-muted: #94A3B8;
  --color-border: #E2E8F0;

  --color-coral: #FF6B6B;
  --color-amber: #FFB347;
  --color-lime: #A8E06C;
  --color-sky: #5BC0EB;
  --color-lavender: #B39DDB;
  --color-peach: #FFAB91;
  --color-mint: #66D9A0;
  --color-rose: #F48FB1;

  --color-play: #22C55E;
  --color-stop: #EF4444;
}
```

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Initial design system created | Formalized from existing codebase by /design-consultation. Warm light theme is a deliberate differentiator from dark music tools. |
| 2026-04-02 | 3-tier typography (Fredoka + Inter + JetBrains Mono) | Fredoka for personality, Inter for readability, JetBrains Mono for precision. Each font has one job. |
| 2026-04-02 | Keep all 8 accent colors | Each track accent IS the track identity. Color is information, not decoration. |
| 2026-04-02 | No dark mode planned | Warm light theme is brand identity. Dark mode would dilute the "approachable, not a studio tool" positioning. (Reversed 2026-04-28 — Dark Studio added behind a toggle; light remains default.) |
| 2026-04-28 | Add Dark Studio theme + theming schema | User testing of long ripped patterns showed real demand for a dimmer canvas. Built-in **Dark Studio** ships alongside Light. Theming is now extensible via `DrumletTheme` schema — plugins can register custom themes without forking. Track palette is intentionally kept across themes so instrument identity stays consistent. |
