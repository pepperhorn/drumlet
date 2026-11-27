# Handoff: 0001-t9 — Drumlet Player package build (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Plan](../plans/0001-drumlet-player.md), Task 9 · [Dispatch](2026-11-28-0001-t9-package-build--lead-to-codex.md)
- Branch: `orch/0001-t9-package-build`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-a9583e5d-098e33c18423e92f`
- Base: `6408ec8` (app) · `c390fa1` (dispatch)
- Commits: `56e8f40` acknowledgment · `6aac5fc` implementation
- Status: done, draft PR for review

## Goal and scope

Build `@pepperhorn/drumlet-player@0.1.0` as MIT ESM with TypeScript declarations,
scoped CSS, lazy notation, and the acoustic1 kit. The diff stays within the
files listed in the dispatch. The shared Cell has only an SPDX line. The
package turns the existing responsive styles into container queries. The
standalone app keeps its viewport breakpoints and `/samples/`. No changes
to the ledger, demo, iframe route, or release workflow. Nothing published.

## Verification

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run build:lib && npm run verify:lib && node packages/drumlet-player/scripts/ssr-import.test.mjs
npm pack --dry-run -w packages/drumlet-player
```

After orch-deslop:

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 1.05s
 Test Files  20 passed (20)
      Tests  250 passed (250)
dist OK: scoped CSS, lazy notation, declarations and 28 matching acoustic1 samples.
SSR import passed with browser globals unavailable.
npm notice package size: 1.2 MB
npm notice unpacked size: 1.6 MB
npm notice total files: 73
```

The two lint warnings are in `AuthModal.tsx`. The app build reports the
existing Verovio externalization and chunk-size warnings. npm audit reports
19 findings. The SSR test and library commands failed before implementation.
The finished verifier also rejected six injected regressions: an unscoped
selector, a viewport unit, fixed positioning, a viewport width query,
eager Verovio, and a missing kit sample.

The tarball contains only `dist/**`, `README.md`, `LICENSE`, and `package.json`.
It is 1,175,293 bytes packed and 1,597,717 bytes unpacked. The main entry is
55,677 bytes (17.73 kB gzip), its eager support chunk is 20,156 bytes,
the lazy notation wrapper is 36,415 bytes (12.09 kB gzip) before the external
Verovio dependency, and `style.css` is 38,742 bytes.

## Chromium checks

- App A/B on `c390fa1` and the branch used Basic 8th-Note Rock in both themes
  at 360 and 1280 px. Play advanced the playhead and Stop returned to the
  idle grid before each screenshot. All four notation pairs and both desktop
  grid pairs matched pixel for pixel. The mobile grid pairs differed in 13
  dark pixels (at most 5/255 per channel) and two light pixels (at most 1/255).
- A fresh Vite 8 host outside the repo installed the actual tarball and type
  checked, built, and ran under `/embed/`. In Chromium the stock groove
  rendered in both themes and each pad measured 36, 40, or 44 px at container
  widths of 340, 850, or 1080 px, with a fixed 1280 px viewport. A host button
  with colliding utility and pad classes kept its host styles.
- No kit, notation, or font request was made on initial grid display. Playback
  made eight successful kit requests per theme, started audio buffers, and
  advanced the step callback. The dark instance used `assetBaseUrl` under
  `/embed/local/`. The light instance used the versioned jsDelivr URL, fulfilled
  from the packed kit by the test. No live CDN publication was tested.
  Switching to Notation loaded the notation chunk and Petaluma, then rendered
  SVG notes. The same checks passed in Vite dev before the final license
  whitespace cleanup.

Screenshots and logs are in `/tmp/drumlet-t9-evidence/` on the worktree host.
The app images follow `{before,after}-{360,1280}-{light,dark}-{grid,notation}.png`.
Packed images follow `packed-340-*-grid.png` and `packed-1080-*.png`.
`app-pixel-comparison.log`, `packed-final.log`, and `verify-final.log` have the
results. The scratch server on port 5219 was stopped after checking.

## Decisions made and known gotchas

- Keep React, smplr, and Verovio external. Verovio remains behind the notation
  import. The package resolves Petaluma relative to the built modules and
  includes its separate font license.
- Set the versioned kit base only in the package build. The same build checks
  SPDX headers against Rolldown's emitted TypeScript modules. The generated
  stock catalog remains valid JSON and is covered by the root license note.
- `AudioEngineApi` exposes optional `stopAudio` so existing transport adapters
  still type-check. `useAudioEngine` explicitly returns the API with
  `stopAudio` required. No audio behavior changed.
- GBrain `projects/drumlet` confirms the repo and protected-main workflow.
  The spec, plan, and dispatch govern this task.

## Open questions and follow-ups

None for t9. Task 10 owns the in-repo embed demo and repeatable browser checks.
Task 12 owns publishing. No Safari or physical-device playback was checked.

## Review round 2

[Round 1 review](https://github.com/pepperhorn/drumlet/pull/44#pullrequestreview-6093857673).
The lead chose unlayered CSS for the published player. The build keeps
Tailwind's source order, then removes the cascade layers. The scoped reset
now has class specificity, so a host's unlayered element rules cannot reset
the player's box sizing or typography. The package gives the grid's inline
`rem` widths and scroll padding pixel equivalents without changing the app's
shared grid source.

`verify:lib` now runs the plain Node SSR check. The distribution verifier
rejects every `@layer`, including prefixed ones. The Vite build checks that
every bundled `src/**/*.tsx` module appears in Tailwind's explicit source
list. Removing the `NotationBoundary.tsx` entry failed the build, and adding
`@layer dp-base` failed distribution verification as expected.

A scratch Vite 8 and Tailwind 4 host installed the actual tarball. A 600 px
player at a 1280 px viewport had the same measurements in both themes in
Vite dev and production preview.

| Host rules | Round 1 lit pad | Round 1 Play | Fixed lit and unlit pads | Fixed Play |
|---|---|---|---|---|
| Clean | 36×36 flex | 44×44 flex | 36×36 flex | 44×44 flex |
| Button reset and 30 px universal type | 23.7×47 inline | 18×18 block | 36×36 flex | 44×44 flex |
| Button padding, inline-block and 18 px type | 36×36 inline-block | 44×44 block | 36×36 flex | 44×44 flex |
| Both hostile styles | 55.7×63 inline-block | 50×34 block | 36×36 flex | 44×44 flex |

The fixed player root measured 600×314 and its track labels measured 112 px
wide in all cases. Both host sentinels kept the same dimensions and computed
styles with the package stylesheet present and removed.

| Artifact | Round 1 bytes | Round 2 bytes |
|---|---:|---:|
| Tarball | 1,175,293 | 1,175,249 |
| Main entry | 55,677 | 55,677 |
| Eager support chunk | 20,156 | 20,156 |
| Lazy notation wrapper | 36,415 | 36,415 |
| `style.css` | 38,742 | 38,774 |

After orch-deslop, the full app and package checks passed again, with
250 tests, two existing lint warnings, and 73 pack entries. All 42 files
in the standalone production build had the same SHA-256 hashes as round 1.
Round 2 browser evidence and logs are in `/tmp/drumlet-t9-r2/`.
The standalone dev app also rendered and played the stock groove at 360
and 1280 px in both themes. Seven of eight grid and notation screenshot
pairs were pixel identical to the app baseline. The 360 px light grid
differed in 42 pixels, by at most 4/255 per channel.

## Review round 3

[Round 2 review](https://github.com/pepperhorn/drumlet/pull/44#pullrequestreview-6093967509).
The root half of the reset now uses `:where(.drumlet-player)`. A host can
set root layout with `className` in unlayered CSS. The descendant reset keeps
class specificity. The distribution verifier rejects a class-specific
`all` reset on the root.

The packed round 2 build discarded `.my-player` margin, red ring and width:
the root had zero margin, no visible ring and a 680 px width in the clean
host. The round 3 matrix used both full and minimal chrome across two themes
and five host styles: clean, button reset plus universal type, realistic
buttons, both button styles together, and generic div rules. Details and
screenshots are in `/tmp/drumlet-t9-r3/`.

Each packaged case preserved the host's 24 px margin, 3 px solid red outline,
and 600 px root width. Lit and unlit pads stayed 36×36 px and Play stayed
44×44 px in both chrome presets. The host sentinels kept their styles when
the package CSS was removed. The verifier rejected the actual round 2 CSS
and passed with the fixed CSS restored.

After orch-deslop, all 250 tests, the SSR check, library verification, and
the 73-entry pack dry run passed. The standalone build matched all 42
file hashes from a fresh build of the previous PR head. The tarball is
1,175,229 bytes and the stylesheet is 38,824 bytes.
