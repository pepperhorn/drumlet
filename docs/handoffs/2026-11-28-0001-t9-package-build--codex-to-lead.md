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
