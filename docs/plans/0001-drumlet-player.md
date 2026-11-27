# Drumlet Player + Endless View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@pepperhorn/drumlet-player` — an MIT, SSR-safe, style-isolated `<DrumletPlayer>` React component that plays a supplied groove with a stripped-down transport and grid ⇄ notation switch — plus an endless (horizontal, page-less) view in both the player and the Drumlet app, and rebuild the iframe embed on top of it.

**Architecture:** The player is built in-repo (`packages/drumlet-player`, Vite library mode) from Drumlet's own `src/` modules. Grid, NotationView, Transport and the audio hooks already take props (no context), so the player composes them around a player-local `useReducer(sequencerReducer)`. Endless view is a *view*: pages stay the data model; a global-step model (`globalStep = pageIndex * stepsPerPage + step`) drives play-through, rendering and auto-follow. CSS isolation reuses the proven `~/module/packages/sound-module/scripts/build-css.mjs` approach.

**Tech Stack:** React 19, Vite 8 (lib mode), Tailwind 4 (+ `@tailwindcss/cli` for the package CSS), smplr, verovio (lazy), Vitest + jsdom + @testing-library/react, Playwright (playwright-core, already-cached Chromium), ffmpeg (kit encode script).

**Spec:** `docs/specs/0001-drumlet-player.md` (approved 2026-11-27). Read it alongside this plan.

## Global Constraints

- Peer deps `react` / `react-dom` `>=19`. ESM only.
- Package name `@pepperhorn/drumlet-player`, license **MIT**; Drumlet app stays AGPL-3.0. Every `src/` file the package imports gets `// SPDX-License-Identifier: MIT` as line 1.
- Every JSX element has a contextual kebab-case class name **first**, before Tailwind utilities (CLAUDE.md).
- Root element: `<div class="drumlet-player …" data-theme="light|dark">`. Default `theme` is `light`.
- Generic class names inside the package CSS are scoped under `.drumlet-player`; Tailwind vars renamed `--dp-tw-*`, layers `dp-*`, keyframes `dp-*`, `rem`→`px`. No viewport units, no `position: fixed`, no viewport media queries in player code (container queries instead).
- Importing the package must not touch `window`, `document`, `localStorage` or `AudioContext` at module load.
- Notation (verovio) is a lazy chunk; `chrome="none"` and grid-only display never fetch it.
- Default kit `acoustic1` = owner-approved variant B: tails crash 5 s / ride 4.5 s / ride-bell 3.5 s / hh-open 2.5 s with 0.4 s fade-out; crash, ride, ride-bell, hh-open stereo, all others mono; 44.1 kHz; `.ogg` Vorbis `-q:a 3` and `.m4a` AAC 64k mono / 96k stereo.
- Default kit URL: `https://cdn.jsdelivr.net/npm/@pepperhorn/drumlet-player@${VERSION}/dist/kits/`; `assetBaseUrl` overrides (`${assetBaseUrl}/kits/`).
- `main` is protected — every task lands via PR. Verify: `npm run typecheck && npm run lint && npm run build && npm test`.
- **Precondition:** branch `feat/hardware-pads` (pads/keycaps/knobs, `src/styles/hardware.css`, `src/components/Knob.tsx`) is merged to `main` before Task 1 starts.

## Review Focus

1. **Groove with zero tracks or zero pages** (empty dottl, garbage share code) → player renders an empty-state message and `onError` fires; it must not throw. → test in Task 3 + Task 8.
2. **Two players on one page** → starting B stops A; A's play button returns to stopped. → Task 8 unit test + Task 10 Playwright.
3. **Host unmounts mid-playback** (route change) → scheduler interval and rAF cleared, no further notes. → Task 4 test.
4. **Old v1–v3 share codes / existing `?embed=1` links** → still decode and play as single-page grooves. → Task 2 + Task 11.
5. **Voice missing from acoustic1** (groove uses an 808 group or a soundfont tom the kit lacks) with no network to smplr CDN → falls back to nearest acoustic voice, never silence, never throws. → Task 1 test.

## Dispatch table

Keys `0001-t1`…`0001-t12`, branches `orch/0001-tN-<slug>`. **Verify** for every task: `npm run typecheck && npm run lint && npm run build && npm test` plus the task's own named checks. **Acceptance** = every test/check named in the task passes and the task's Interfaces exist exactly as written.

| Task | Slug | Owns | Depends on |
|---|---|---|---|
| t1 | kit-loader | `vitest.config.ts`, `src/test/**`, `scripts/encode-acoustic-kit.sh`, `public/samples/acoustic1/**`, `src/audio/customKits*`, `src/audio/useAudioEngine.ts`, `package.json`, `package-lock.json` | hardware-pads (#27) merged |
| t2 | share-v4 | `src/state/shareCodec*` | t1 (test harness) |
| t3 | groove-resolver | `src/player/resolveGroove*`, `src/state/stockRhythms.ts` | t2 |
| t4 | play-through | `src/audio/playPosition*`, `src/audio/useTransport*`, `src/state/sequencerReducer.ts` | t1 |
| t5 | endless-grid | `src/components/EndlessGrid*`, `src/components/useAutoFollow*`, `src/styles/hardware.css` | t4 |
| t6 | endless-notation | `src/components/NotationView.tsx`, `src/notation/**` | t5 (`useAutoFollow`) |
| t7 | app-view-toggle | `src/App.tsx`, `src/components/PageTabs.tsx`, `src/components/Transport.tsx` | t5, t6 |
| t8 | player-component | `src/player/**` (except resolveGroove) | t3, t5, t6 |
| t8b | shared-audio-context | `src/audio/useAudioEngine.ts`, `src/audio/sharedAudioContext*`, `src/player/**` (context call sites only) | t8 |
| t9 | package-build | `packages/drumlet-player/**`, `src/player/styles/**`, root `package.json` scripts, `LICENSE`, SPDX headers in bundled `src/**` files | t8 |
| t10 | embed-checks | `player-demo.html`, `src/player/demo.tsx`, `scripts/player-embed.check.mjs`, `scripts/pack-smoke.mjs`, `vite.config.js` | t9 |
| t11 | iframe-replace | `src/main.tsx`, `src/player/EmbedPage.tsx`, `src/components/ShareModal.tsx`, `buildEmbedSnippet` in `src/state/shareCodec.ts` | t9, t2 |
| t12 | release | `.github/workflows/release-player.yml`, `packages/drumlet-player/README.md`, `DESIGN.md`, `CHANGELOG.md` | t10, t11 |

Parallel-safe pairs (no Owns overlap): t2‖t4 after t1; t6 waits on t5. t1 also owns `package.json` — later tasks that add deps (t9) run after it, never alongside.
Merge order = task order.

---

### Task 1: Test harness, re-encoded kit, format-aware kit loader

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`, `scripts/encode-acoustic-kit.sh`
- Replace: `public/samples/acoustic1/*` (14 × `.ogg` + 14 × `.m4a`, `kit.json`)
- Modify: `src/audio/customKits.ts`, `package.json` (devDeps `vitest`, `jsdom`, `@testing-library/react`; script `"test": "vitest run"`)
- Test: `src/audio/customKits.test.ts`

**Interfaces:**
- Produces (in `customKits.ts`):
  - `setKitBaseUrl(url: string): void` — default `'/samples/'`; trailing slash normalised.
  - `getKitBaseUrl(): string`
  - `pickAudioFormat(canPlay: (mime: string) => string): 'ogg' | 'm4a'` — `'ogg'` when `canPlay('audio/ogg; codecs="vorbis"')` is non-empty, else `'m4a'`.
  - `kitSampleUrl(kitId: string, file: string, fmt: 'ogg' | 'm4a'): string` — swaps the extension of `file` to `fmt`.
  - `resolveKitSampleKey(manifest: KitManifest, wanted: string): string` — exact key, else the first matching rule of the ordered `KIT_FALLBACKS` (lower-cased `wanted`, substring/prefix matches; amended 2026-11-27 after t1 review r1 — the app's group names are in `src/audio/drumGroups.ts`):
    1. hat-like (`hh*`, `hihat*`, `hat*`) **and** contains `open` → `hh-open`
    2. contains `foot` or `pedal` → `hh-foot`
    3. `hh*`, `hihat*`, `hat*`, `tambourine`, `cabasa`, `maraca*`, `shaker` → `hh-closed1`
    4. `kick*`, `bass-drum*` → `kick`
    5. `rim*`, `stick*`, `clave*` → `crossstick`
    6. `snare*`, `clap*` → `snare-on1`
    7. contains `tom` or `conga`, **and** low (`-l`, `-ll`, `-lll`, `-low`, `-3`, `floor`) → `floor-tom`
    8. contains `tom` or `conga` (incl. `mid-tom`, `tom-m`, `tom-h…`, `tom-1/2`) → `hi-tom`
    9. contains `bell` (`ride-bell`, `cowbell`) → `ride-bell`
    10. `ride*` → `ride`
    11. `crash*`, `cymbal*` → `crash`
    12. anything else → `kick`
    Only rules whose target exists in the manifest apply; otherwise fall through to the next rule.
  - `loadKitManifest`, `loadKitSample` keep their signatures but build URLs via the above.

- [ ] **Step 1:** Write `scripts/encode-acoustic-kit.sh <src-dir> <out-dir>` reproducing the A/B variant B (ffmpeg `atrim`+`afade`, `-ac 1|2`, `-ar 44100`, libvorbis `-q:a 3`, aac 64k/96k). Run it into a temp dir from the current samples; confirm ogg total ≈ 335 KB.
- [ ] **Step 2:** Replace `public/samples/acoustic1/` with its output; `kit.json` unchanged except add `"formats": ["ogg","m4a"]`.
- [ ] **Step 3: Failing tests** in `customKits.test.ts`:
  - `pickAudioFormat(() => 'probably') === 'ogg'`; `pickAudioFormat(() => '') === 'm4a'`
  - `setKitBaseUrl('https://x/kits')` → `kitSampleUrl('acoustic1','acoustic-Kick.ogg','m4a') === 'https://x/kits/acoustic1/acoustic-Kick.m4a'`
  - `resolveKitSampleKey(m,'snare-rim') === 'snare-on1'`, `'hihat-closed' → 'hh-closed1'`, `'hihat-open' → 'hh-open'`, `'hhopen' → 'hh-open'`, `'mid-tom' → 'hi-tom'`, `'tom-low' → 'floor-tom'`, `'rimshot' → 'crossstick'`, `'cowbell' → 'ride-bell'`, `'ride-bell' → 'ride-bell'`, `'cymbal' → 'crash'`, `'woodblock' → 'kick'`
  - table test: every group name in `src/audio/drumGroups.ts` resolves, and none that isn't kick-like resolves to `kick`
  - `loadKitSample` with `fetch` mocked to reject → rejects with an `Error` (caller handles); with fetch ok + `decodeAudioData` stub → resolves.
- [ ] **Step 4:** `npm test -- customKits` → FAIL. Implement. → PASS.
- [ ] **Step 5:** In `useAudioEngine.ts`, when a kit track's `kitSample` is missing from the manifest, call `resolveKitSampleKey`. Manual check in the app: acoustic grooves sound identical to the A/B page's B.
- [ ] **Step 6:** Commit `feat(kit): re-encoded acoustic1 (ogg+m4a), format-aware kit loader, vitest harness`.

### Task 2: Share codec v4 — all pages

**Files:** Modify `src/state/shareCodec.ts` · Test `src/state/shareCodec.test.ts`

**Interfaces:**
- `encodeState(state, pluginMeta?)` now emits `v: 4` with a **shared track table** and per-page steps only (amended 2026-11-27 after t2 review r1, to keep URLs ~4× shorter):
  - `t: EncodedTrackMeta[]` — one entry per track (everything in today's `EncodedTrack` except `s`), taken from page 0's track order; a track that exists only on a later page is appended.
  - `pg: { n?: string; h?: [step:number,label:string][]; s: (string | 0)[] }[]` — `s[i]` is the step string for table track `i`; `0` = track absent/all-rest on that page; `n` omitted when it equals the default page name.
- `decodePayload(encoded)` accepts v1–v4; v1–v3 → one page; v4 → `state.pages.length === pg.length`, section headings restored, **one track id per table index reused on every page** (the audio engine caches instruments by track id), and `chainMode: true` when there is more than one page.
- `decodePayload(encoded)` accepts v1–v4; v1–v3 → one page; v4 → `state.pages.length === pg.length`, section headings restored.

- [ ] **Step 1: Failing tests:** round-trip a 3-page state with headings (`pages.length===3`, page 2 track 0 steps equal, heading `{step:4,label:'Chorus'}` on page 3); decoded `pages[0].tracks[i].id === pages[2].tracks[i].id` for every i; `chainMode === true` for multi-page; a mixed dm/sf/kit + velMode 1/3/7 + split-step state round-trips; a fixture v3 code (generate one from the pre-change encoder and paste as a constant) decodes to 1 page with the same steps; the encoded share URL for stock groove `cuban-cha-cha` is ≤ 1,600 chars; garbage string → `null`.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Commit `feat(share): v4 share codes carry every page`.

### Task 3: Groove input resolver

**Files:** Create `src/player/resolveGroove.ts` · Test `src/player/resolveGroove.test.ts`

**Interfaces:**
- `export type GrooveInput = string | DottlProject | { stock: string } | { share: string };`
- `export function resolveGroove(input: GrooveInput): SequencerState` — throws `GrooveError` (`class GrooveError extends Error { code: 'not-found'|'invalid'|'empty' }`).
  - string: if `findStockRhythm(input)` hits → stock; else try `decodePayload` (also accept a full URL containing `#s=`); else `GrooveError('invalid')`.
  - object with `pages`/`tracks` → `deserializeProject`.
  - Result merged over `initialState` from `sequencerReducer` so every field is present; zero tracks → `GrooveError('empty')`.
- Lazy-load the stock manifest: `resolveGroove` stays sync but stock lookup goes through `loadStockRhythms(): Promise<…>`; expose `resolveGrooveAsync(input): Promise<SequencerState>` and use that from the player. (Keeps the 281 KB manifest out of the main chunk.)

- [ ] **Step 1: Failing tests:** a known stock id → `pages.length` equals that rhythm's bar count; `{share: <v4 code>}` and a raw `https://drumlet.app/?embed=1#s=<code>` both decode; a dottl fixture from `src/data/presets.json` resolves; `''` → `GrooveError` code `invalid`; dottl with no tracks → code `empty`.
- [ ] **Step 2:** Run → FAIL. Implement. → PASS. Commit `feat(player): groove input resolver`.

### Task 4: Transport play-through, loop, seek, global step

**Files:** Create `src/audio/playPosition.ts` · Modify `src/audio/useTransport.ts` · Test `src/audio/playPosition.test.ts`, `src/audio/useTransport.test.tsx`

**Interfaces:**
- `export type PlayMode = 'page' | 'groove';`
- `export function advancePosition(pos: { page: number; step: number }, s: { pages: number; stepsPerPage: number; mode: PlayMode; chain: boolean; loop: boolean }): { page: number; step: number } | null` — `null` means "stop" (groove mode, `loop=false`, past last step). Page mode keeps today's behaviour (wrap the page; `chain` advances pages).
- `toGlobalStep(page, step, stepsPerPage): number`, `fromGlobalStep(g, stepsPerPage): {page, step}`.
- `SequencerState` gains optional `playMode?: PlayMode` and `loopGroove?: boolean` (initial state `'page'` / `true`; always read as `state.playMode ?? 'page'`, `state.loopGroove ?? true` — amended 2026-11-27 so other construction sites needn't change); reducer actions `SET_PLAY_MODE`, `SET_LOOP_GROOVE`.
- `TransportApi` gains `currentGlobalStep: number`, `currentPlayPage: number`, `seek(globalStep: number): void`, and an `onEnded?` option (`useTransport(stateRef, engine, { onEnded })`).

- [ ] **Step 1: Failing tests** (`playPosition.test.ts`): groove mode 3 pages × 16 → `{0,15}`→`{1,0}`, `{2,15}`+loop→`{0,0}`, `{2,15}`+!loop→`null`; page mode `{1,15}` chain=false → `{1,0}`, chain=true → `{2,0}`; `toGlobalStep(2,3,16)===35`, `fromGlobalStep(35,16)` → `{page:2,step:3}`.
- [ ] **Step 2: Failing test** (`useTransport.test.tsx`, fake AudioContext + fake timers): render hook, `play()`, unmount → no `triggerNote` calls after unmount and `clearInterval` called (Review Focus 3).
- [ ] **Step 3:** Run → FAIL. Implement; `scheduleNotes` reads notes from `pages[pos.page]` (not `currentPageIndex`) in groove mode and calls `advancePosition`. Run → PASS.
- [ ] **Step 4:** App check: paged mode behaviour unchanged (chain on/off). Commit `feat(transport): groove play-through, loop, seek`.

### Task 5: Endless grid + auto-follow

**Files:** Create `src/components/EndlessGrid.tsx`, `src/components/useAutoFollow.ts` · Modify `src/styles/hardware.css` (page-join marker) · Test `src/components/useAutoFollow.test.ts`, `src/components/EndlessGrid.test.tsx`

**Interfaces:**
- `EndlessGrid` props: `{ pages: Page[]; stepsPerPage: number; beatsPerBar: number; noteValue; stepValue; currentGlobalStep: number; isPlaying: boolean; editable: boolean; onToggleStep?(page: number, track: number, step: number): void; onSeek?(globalStep: number): void }`. Renders track labels once (sticky left column) and every page's cells in one horizontal row using the existing `Cell`; each page join shows a bar line + `page.name` / section heading label (`endless-page-join`).
- `useAutoFollow(scrollEl: HTMLElement | null, targetX: number | null, opts: { isPlaying: boolean; margin?: number }): { following: boolean; resume(): void }` — keeps `targetX` within `[scrollLeft+margin, scrollLeft+clientWidth-margin]` (default margin = 25% of width) by setting `scrollLeft`; any user `wheel`/`pointerdown`/`scroll` not caused by itself sets `following=false` until `resume()` or `isPlaying` goes false→true.

- [ ] **Step 1: Failing tests:** `useAutoFollow` — target past right margin moves scrollLeft; user wheel event → `following === false` and further target moves don't scroll; `resume()` → follows again. `EndlessGrid` — 3 pages × 16 steps × 2 tracks renders 96 `.step-cell`; clicking cell index 20 of track 1 calls `onToggleStep(1, 1, 4)`; `editable=false` → clicking calls `onSeek(20)` instead.
- [ ] **Step 2:** Run → FAIL. Implement. → PASS. Commit `feat(grid): endless view + playhead auto-follow`.

### Task 6: Endless notation

> Note (2026-11-27, from t5 review): reuse t5's pattern — memoised blocks, playhead target located in a `useLayoutEffect`, one commit per playhead step. Measure render cost per step on an 8-bar groove and report it.

**Files:** Modify `src/components/NotationView.tsx`, `src/notation/renderStaff.ts` · Test `src/notation/renderStaff.test.ts`

**Interfaces:**
- `NotationViewProps` gains `layout?: 'wrapped' | 'endless'` (default `'wrapped'`) and `currentGlobalStep?: number`.
- `renderDrumStaff(…, { layout })`: `'endless'` → verovio `breaks: 'none'`, `pageWidth` = left margin + totalSteps × stepWidth (cap at verovio max; if exceeded, chunk into ≤ 64-bar systems laid out horizontally).
- Endless notation reuses `useAutoFollow` against the returned `StepPosition` x for `currentGlobalStep`.

- [ ] **Step 1: Failing test:** render 8 pages × 16 in `'endless'` → returned result has one system (`systems.length===1` or equivalent field) and `stepPositions` x strictly increasing across page joins.
- [ ] **Step 2:** Run → FAIL. Implement. → PASS. Commit `feat(notation): endless single-system layout`.

### Task 7: App Paged / Endless toggle

> Note (2026-11-27, from t6 review): `NotationView` treats any `currentGlobalStep >= 0` as playing — pass `-1` whenever the transport is stopped.

**Files:** Modify `src/App.tsx`, `src/components/PageTabs.tsx`

- [ ] **Step 1:** Add a `page-tabs-view-toggle` keycap pair (Paged / Endless, `aria-pressed`) beside the Notation View button. Endless sets `playMode:'groove'`, renders `EndlessGrid` (editable, dispatching the existing toggle-step action with the page index) or `NotationView layout="endless"`; Paged restores today's UI. Persist under localStorage key `drumlet-view-mode` (try/catch).
- [ ] **Step 2:** In endless the transport's chain button becomes the loop button (`loopGroove`).
- [ ] **Step 3:** Manual check on a 4-bar stock groove: play runs bars 1→4, follows, loops; toggling back to Paged lands on the page under the playhead. Commit `feat(app): paged/endless view toggle`.

### Task 8: `<DrumletPlayer>` component

**Files:** Create `src/player/DrumletPlayer.tsx`, `src/player/chrome.ts`, `src/player/claimPlayback.ts`, `src/player/index.ts` · Test `src/player/DrumletPlayer.test.tsx`, `src/player/claimPlayback.test.ts`

**Interfaces:**
- `DrumletPlayerProps`: `groove: GrooveInput; chrome?: 'full'|'minimal'|'none' (default 'full'); view?: 'endless'|'paged' (default 'endless'); display?: 'grid'|'notation' (default 'grid'); theme?: 'light'|'dark' (default 'light'); bpm?: number; assetBaseUrl?: string; className?: string; onReady?(): void; onPlay?(): void; onStop?(): void; onError?(e: GrooveError | Error): void; onStep?(globalStep: number): void;`
- `DrumletPlayerHandle` via `forwardRef`: `{ play(): Promise<void>; stop(): void; seek(globalStep: number): void }`.
- `chrome.ts`: `resolveChrome(c): { transport: boolean; bpm: boolean; displayToggle: boolean; viewToggle: boolean; playButton: boolean; audio: boolean }` — `full` all true; `minimal` only `playButton`,`audio`; `none` all false.
- `claimPlayback(id: string, stop: () => void): () => void` — module-level registry; claiming stops the previous holder; returned fn releases.
- State: `useReducer(sequencerReducer, resolvedState)`; groove resolved with `resolveGrooveAsync` in an effect (SSR-safe); audio hooks created only when `resolveChrome(chrome).audio`.
- Notation imported with `React.lazy(() => import('../components/NotationView'))`.

- [ ] **Step 1: Failing tests:** `resolveChrome` table; `claimPlayback` A then B → A's stop called once; render `<DrumletPlayer groove="<stock id>" chrome="minimal"/>` → exactly one `.drumlet-player-play-btn`, no `.transport-bar`; `chrome="none"` → `useAudioEngine` never invoked (mock module); invalid groove → `onError` called with `GrooveError`, `.drumlet-player-empty` rendered, no throw; `theme="dark"` → root has `data-theme="dark"`.
- [ ] **Step 2:** Run → FAIL. Implement. → PASS. Commit `feat(player): DrumletPlayer component`.

### Task 8b: One shared AudioContext per page (added 2026-11-27 from t8 review)

**Why:** spec + project stack require a single shared AudioContext. t8 ships one context per player (created on first Play, closed on unmount, suspended on stop). Browsers cap live contexts (Chrome ~6/page, iOS stricter); a lesson page with 8 grooves must not hit that.

**Owns:** `src/audio/useAudioEngine.ts`, new `src/audio/sharedAudioContext.ts` (+ test), `src/player/**` (only the call sites that suspend/resume/close the context). **Depends on:** t8 merged. **Gates:** t10's embed check asserts ≤ 1 AudioContext with 8 players; t12 publish.

**Interfaces:**
- `acquireAudioContext(): AudioContext` — lazily creates the page's one context (SSR-safe: only called on first Play); ref-counts holders.
- `releaseAudioContext(): void` — decrements; closes the context only when the count reaches 0.
- `setAudioActive(id: string, active: boolean): void` — resumes the context when any holder is active; suspends it only when none are.
- `useAudioEngine()` uses `acquireAudioContext()` and gives each engine its own master `GainNode` (and reverb send) into `ctx.destination`, so per-player volume/teardown stays isolated. The app keeps working unchanged.

**Tests:** 8 engines → 1 context; releasing all closes it; one active holder keeps it running while others stop; unmounting one player doesn't silence another; app engine and a player engine coexist.

### Task 9: Package build — `packages/drumlet-player`

> Note (2026-11-27, from t5 review): `Cell` sizes pads with viewport breakpoints (`md:`/`lg:` Tailwind variants), which Global Constraints forbid in player code. t9 must make pad size container-driven for the player (e.g. the existing `--cell-w` custom property set from a container query / ResizeObserver) without changing the app's look.

**Files:** Create `packages/drumlet-player/{package.json,vite.config.ts,tsconfig.build.json,LICENSE,README.md}`, `packages/drumlet-player/scripts/{build-css.mjs,copy-kits.mjs,verify-dist.mjs}`, `src/player/styles/{tailwind.css,base.css}` · Modify root `package.json` (`build:lib`, `verify:lib`), `src/styles/hardware.css` (tokens also on `.drumlet-player` / `.drumlet-player[data-theme="dark"]`), add SPDX MIT header to every `src/` file the package bundles · Root `LICENSE` note on the dual arrangement.

**Interfaces:**
- `package.json`: `"name":"@pepperhorn/drumlet-player"`, `"license":"MIT"`, `"type":"module"`, exports `.` (types + import), `./style.css`, `./package.json`; `"sideEffects":["*.css"]`; `files: ["dist","README.md","LICENSE"]`; peer deps react/react-dom `>=19`; deps `smplr`, `verovio`.
- `build-css.mjs`: port `~/module/packages/sound-module/scripts/build-css.mjs` with `SCOPE='.drumlet-player'`, `VAR_PREFIX='--dp-tw-'`, `NAME_PREFIX='dp-'`.
- `copy-kits.mjs`: copies `public/samples/acoustic1` → `dist/kits/acoustic1`; injects `VERSION` used for the jsDelivr default URL.
- `verify-dist.mjs` fails if: `dist/style.css` contains a selector not under `.drumlet-player` (except `@property`/`@keyframes dp-*`), contains `vw|vh|position:\s*fixed`, the main chunk contains `verovio`, or `dist/kits/acoustic1` lacks any of 28 audio files.

- [ ] **Step 1: Failing check:** `node -e "import('@pepperhorn/drumlet-player')"` from a Node script with no DOM globals → must import without throwing (write as `packages/drumlet-player/scripts/ssr-import.test.mjs`, run via `node`).
- [ ] **Step 2:** `npm run build:lib && npm run verify:lib` → FAIL (nothing built). Implement. → PASS, plus SSR import PASS.
- [ ] **Step 3:** Commit `feat(pkg): @pepperhorn/drumlet-player library build (MIT)`.

### Task 10: Demo page, Playwright embed checks, pack smoke

**Files:** Create `player-demo.html` + `src/player/demo.tsx` (Vite multi-page input), `scripts/player-embed.check.mjs`, `scripts/pack-smoke.mjs`

- [ ] **Step 1:** Demo page renders two players (dark/full + light/minimal) inside a host page that loads its own Tailwind build plus layered hostile host CSS (`@layer host { button{color:red;border-radius:0} *{font-size:30px} }`), loaded before the player's `style.css` — the supported host setup per the README.
- [ ] **Step 2:** `player-embed.check.mjs` (playwright-core + cached Chromium, pattern of PepperScore `validation/embed.mjs`) asserts: host element styles outside `.drumlet-player` unchanged after mount; starting player B stops A; a `chrome="none"` player makes zero requests to `/kits/` or `verovio`; `assetBaseUrl` override makes kit requests go there; legacy `?embed=1#s=<v3 code>` route renders a player.
- [ ] **Step 3:** `pack-smoke.mjs`: `npm pack` the package, install into a fresh Vite React app in a temp dir, build it → exit 0.
- [ ] **Step 4:** Run both → PASS. Commit `test(player): embed isolation + pack smoke`.

### Task 11: Replace the iframe embed

**Files:** Modify `src/main.tsx`, `src/state/shareCodec.ts` (`buildEmbedSnippet`), `src/components/ShareModal.tsx` · Create `src/player/EmbedPage.tsx`

- [ ] **Step 1:** In `main.tsx`, when `isEmbedMode()` and the decoded payload has no `pluginMeta`, mount `<EmbedPage>` (a full-height `<DrumletPlayer chrome="full" groove={{share: code}} assetBaseUrl="/samples" />`, theme from `?theme=`); payloads with `pluginMeta` keep mounting `App` as today.
- [ ] **Step 2:** ShareModal "Embed" section shows two snippets: npm (`npm i @pepperhorn/drumlet-player` + the JSX with `groove={{share:'<code>'}}`) and the iframe snippet.
- [ ] **Step 3:** Manual + Playwright (Task 10 check already covers the legacy route). Commit `feat(embed): iframe embed rebuilt on DrumletPlayer`.

### Task 12: Release workflow + docs

**Files:** Create `.github/workflows/release-player.yml` (port `~/module/.github/workflows/release.yml`: npm trusted publishing with provenance, triggered by tag `player-v*`), update `packages/drumlet-player/README.md` (install, usage, props table, chrome presets, theming, `assetBaseUrl`, Astro `client:only="react"`/`client:visible`, licence), `DESIGN.md` decisions log (endless view; player), `CHANGELOG.md`.

- [ ] **Step 1:** `act`-free check: `npm run build:lib && npm run verify:lib && npm pack --dry-run -w packages/drumlet-player` lists only `dist/**`, README, LICENSE, package.json.
- [ ] **Step 2:** Commit `chore(release): drumlet-player publish workflow + docs`. First publish is done by the owner (npm login and publish as separate steps — see global CLAUDE.md).
