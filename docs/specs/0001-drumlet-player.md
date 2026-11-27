# 0001 — Drumlet Player (embeddable component) + Endless view

Status: draft — owner review · 2026-11-27

## Intent

Drumlet grooves need to live inside other pages (lessons, CRF / PepperHorn sites, blog posts) as a
first-class React component, not an iframe. The owner wants a single component you hand a groove to,
which gives you the transport, playback and a switch to notation — "a stripped-down interface", in the
same spirit as the PepperScore library's `<PepperScore>` component
(`/home/shaun/ph-vexflow-view/packages/pepperscore`, spec at
`/home/shaun/ph-vexflow-view/docs/specs/pepperscore-embeddable-component.md`).

It **replaces** the current iframe embed (`?embed=1#s=…`, `isEmbedMode()` in
`src/state/shareCodec.ts`, `buildEmbedSnippet`), which is limited by iframe sizing, styling and messaging.

Alongside it, Drumlet gains PepperScore's **endless view**: the groove scrolls horizontally as one long
strip instead of being split into pages.

## Goals

1. Publishable package `@pepperhorn/drumlet-player` exporting `<DrumletPlayer>`.
2. Caller supplies only the groove; the component renders transport, the pad grid, and a grid ⇄ notation
   switch.
3. UI presets like PepperScore's `chrome`: `full`, `minimal`, `none`.
4. Ships a default acoustic kit so it makes sound with zero setup.
5. Endless (horizontal, page-less) view in **both** the player and the Drumlet app.
6. The iframe embed path is rebuilt on top of the component (one implementation, not two).
7. Uses the new hardware look (silicone glowing pads, keycaps, knobs — branch `feat/hardware-pads`).

## Non-goals

- Editing grooves inside the player (v1 is view + play). Leave room for a later `editable` prop.
- Library, login/Directus, plugins, share/export, MIDI export, challenge/scoring inside the player.
- A separate sounds npm package (the kit is small enough to ship in the main package).
- Replacing the paged model in the app — endless is a *view*; pages stay the data model.

## Anti-goals (would be a failure even if it "works")

- The component's CSS leaks into the host page, or host CSS breaks the component.
- Importing the package touches `window`/`document` at module load (breaks SSR / Astro).
- Two copies of the engine/grid/notation code (player and app drifting apart).
- Grid-only embeds paying for the notation engine (verovio wasm is 500 kB+).
- Two players on one page playing over each other.

## Constraints

- React 19 + Vite 8 + Tailwind 4, TypeScript. Peer deps `react`/`react-dom` ≥ 19 (match PepperScore).
- Every element carries a contextual kebab-case class name first (project CLAUDE.md rule).
- DESIGN.md governs visual decisions; the hardware materials in `src/styles/hardware.css` are the
  source for the player's look. Track palette stays identical across themes.
- `main` is branch-protected: all changes land via PR.
- Must render client-side; must be SSR-import-safe.

## Approaches considered

1. **In-repo package built from Drumlet's own modules (chosen).** `packages/drumlet-player` (Vite library
   mode) imports the audio engine, transport, grid and notation from `src/`. The app and the player share
   one implementation; the iframe embed becomes a thin page rendering `<DrumletPlayer>`. Cost: the
   engine/grid/notation must be decoupled from the app-wide `SequencerContext` and the 1,447-line
   `App.tsx`.
2. *Separate repo copying the needed pieces.* Faster start, but every engine fix and style change has to be
   made twice — exactly the drift this is meant to end. Rejected.
3. *React wrapper around the existing iframe.* Cheapest, but keeps iframe sizing/styling/messaging limits;
   not "better". Rejected.

## Design (decided)

### Component API

```tsx
import { DrumletPlayer } from '@pepperhorn/drumlet-player'
import '@pepperhorn/drumlet-player/style.css'

<DrumletPlayer
  groove={…}                     // required, see "Groove input"
  chrome="full"                  // 'full' | 'minimal' | 'none'
  view="endless"                 // 'endless' | 'paged'   (default 'endless')
  display="grid"                 // 'grid' | 'notation'   (initial; user can toggle in 'full')
  theme="dark"                   // 'dark' | 'light'      (applied to the component root only)
  bpm={…}                        // optional override of the groove's tempo
  assetBaseUrl="…"               // optional; where kits/ (and verovio) are served from
  className="…"
  onReady onPlay onStop onError onStep   // callbacks
  ref={…}                        // imperative: play(), stop(), seek(step)
/>
```

- **Groove input** accepts any of the three formats Drumlet already has: a stock rhythm id
  (`src/data/stockRhythms.json`, via `findStockRhythm` / `stockRhythmToState`), a `.dottl` project object
  (`deserializeProject` in `src/state/projectSerializer.ts`), or a share code string (the `s=` payload,
  `decodePayload` in `src/state/shareCodec.ts`).
- **Chrome presets** (modelled on PepperScore `src/lib/chrome.ts`):
  - `full` — transport (play/stop, BPM, loop), grid ⇄ notation toggle, endless ⇄ paged toggle.
  - `minimal` — the groove plus a single play/stop keycap.
  - `none` — the groove only; no audio is loaded.

### Endless view

- Pages remain the data model. Endless lays all pages side by side in one horizontal row with a bar line
  and the page/section name at each join.
- The playhead travels the whole strip and auto-scrolls to keep itself in view (PepperScore endless
  behaviour). Manual scroll/drag pauses auto-follow until the next play or a tap on the playhead.
- Notation in endless renders as one long system rather than wrapped lines (`NotationView` already merges
  pages via `mergePages`).
- **In the Drumlet app:** a Paged / Endless toggle next to the Notation View button, persisted per user
  (localStorage). Editing works in both modes.
- **In the player:** `view` prop, default `endless`.

### Default kit

- `acoustic1`, re-encoded (owner A/B-approved variant "B", 2026-11-27): cymbal tails trimmed with a 0.4 s
  fade (crash 5 s, ride 4.5 s, ride bell 3.5 s, open hat 2.5 s); kick/snares/hats-closed/foot/toms/cross
  stick mono; crash/ride/ride bell/open hat stereo; 44.1 kHz. ≈327 KB vs 881 KB today.
- Shipped as both `.ogg` (Vorbis q3) and `.m4a` (AAC 64k mono / 96k stereo); the player picks per browser
  (`canPlayType` / decode fallback) so each browser downloads ≈330 KB. *(My call: covers older Safari.)*
- Lives in the package as `dist/kits/acoustic1/` (not inlined into JS). Default URL: jsDelivr at the
  matching package version; `assetBaseUrl` overrides for self-hosting.
- The app should use the same re-encoded kit (replace `public/samples/acoustic1`) so app and player
  sound identical.
- Grooves that reference smplr machines (TR-808, LM-2, …) still stream from smplr's CDN, loaded only on
  demand. A voice missing from the acoustic kit falls back to the nearest acoustic voice, never silence.
  Reproducible encode script committed under `scripts/` (ffmpeg commands as used in the A/B test).

### Packaging (mirrors PepperScore)

- Vite library mode, ESM only; entries split so notation (verovio) is a lazy chunk loaded only when the
  user/host switches to notation.
- Exports map: `.`, `./style.css`, `./package.json`; `sideEffects: ["*.css"]`.
- CSS scoped under a `.drumlet-player` root (`dp-` prefix for generic class names, `:where(...)` revert
  reset), no viewport units / `position: fixed` / viewport media queries — container queries instead.
- One shared AudioContext per page; starting one player stops any other (`claimPlayback` pattern).
- Demo/playground page in the repo; Playwright embed checks (no style leak, one-player-at-a-time,
  `chrome="none"` loads no audio, custom `assetBaseUrl`); pack-smoke install into a fresh Vite app.

### Replacing the iframe embed

- `?embed=1` renders a minimal page that mounts `<DrumletPlayer chrome="full">` from the share code, so
  existing embed links keep working.
- Share modal's embed snippet offers the React/npm usage (and keeps the iframe snippet for non-React
  hosts).

## Calls made after builder review (owner to check)

- **Endless + loop:** endless always plays through every page (it implies chain). The `loop` control in
  endless means "repeat the whole groove" vs "stop at the end". Chain/loop-one-page stays a paged-mode
  setting in the app.
- **Order of work:** finish and merge `feat/hardware-pads` first; the player is built on `main` after it,
  so CSS scoping isn't done against a moving target.
- **Share codes carry all pages:** `encodeState` currently encodes only the current page. Bump the share
  payload to v4 carrying every page (and section headings); v1–v3 codes still decode as single-page
  grooves.
- **Iframe embeds:** `?embed=1` with a plain groove payload → `<DrumletPlayer>` (view + play). Payloads
  carrying plugin/challenge data keep the current full-app embed path until the player grows those
  features. Grid editing in embeds is dropped.
- **Default theme:** `light`, per DESIGN.md (warm light is the brand default); hosts pass `theme="dark"`
  for the brushed-navy look.
- **License (owner decision, 2026-11-27):** `@pepperhorn/drumlet-player` ships **MIT**, like PepperScore.
  The owner relicenses the shared code the player pulls in (audio engine, transport, grid/cells, notation,
  state/serializers it imports) as MIT; the Drumlet app as a whole stays AGPL-3.0. Mark relicensed files
  with an `SPDX-License-Identifier: MIT` header and note the dual arrangement in the README/LICENSE.
- **Samples (owner decision, 2026-11-27):** acoustic1 is cleared for public redistribution; ship it in the
  package.

## Left to the builder

- How to decouple engine/transport/grid/notation from `SequencerContext` (e.g. a player-local reducer or
  store reusing `sequencerReducer`) — keep the app's behaviour unchanged.
- How verovio's wasm is located in the library build (lazy import, `assetBaseUrl`, or inline) — must not
  load for grid-only use.
- Auto-follow scroll algorithm details and the manual-scroll pause heuristic.
- Exact keycap/legend layout of the `full` chrome at narrow container widths.
- npm publish mechanics (follow `@pepperhorn/sound-module`'s trusted-publishing setup in `~/module`).
