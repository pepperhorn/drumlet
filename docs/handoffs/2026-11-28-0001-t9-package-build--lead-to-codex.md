# Handoff: 0001-t9 — Package build: @pepperhorn/drumlet-player (lead → codex)

- **Date:** 2026-11-28
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t9, "Task 9")
- **Branch:** orch/0001-t9-package-build · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** 6408ec8 (main with t1–t8b, 0003–0009 merged)
- **Port (if running a server):** 5219
- **Status:** open

## Goal
Implement plan **Task 9** exactly as written on main, including its note: a publishable `packages/drumlet-player` (Vite library mode, ESM) whose `dist/` holds the component, a fully scoped `style.css`, the acoustic1 kit (ogg + m4a) under `dist/kits/`, and types — MIT-licensed, SSR-import-safe, with notation as a lazy chunk. Pads must size from their container in the player (not viewport breakpoints) without changing the app's look.

## Context you need
- Plan: Global Constraints (scoping rules, jsDelivr default kit URL, SSR, lazy notation), Task 9 + note, Review Focus.
- Proven reference to port: `/home/shaun/module/packages/sound-module/` — `package.json` exports/files/sideEffects, `vite.config.ts`, `scripts/build-css.mjs` (scoping: `:root`/`html` → scope, everything else under `:where(scope, scope *)`, `--tw-*` → prefixed, layers + keyframes prefixed, rem→px), `scripts/verify-dist.mjs`, `README.md`. Read them; keep behaviour, change names to `.drumlet-player` / `--dp-tw-` / `dp-`.
- Also study PepperScore's packaging notes if useful: `/home/shaun/ph-vexflow-view/packages/pepperscore/` (`vite.config.ts`, `scripts/finalize-css.mjs`, `validation/css-scope.mjs`).
- On main: `src/player/index.ts` (exports), `DrumletPlayer`, shared AudioContext (`src/audio/sharedAudioContext.ts`), kit loader `setKitBaseUrl` (`src/audio/customKits.ts`) — set the package default to `https://cdn.jsdelivr.net/npm/@pepperhorn/drumlet-player@${VERSION}/dist/kits/` when no `assetBaseUrl` is given; app keeps `/samples/`.
- Licence (owner decision 2026-11-27): package MIT; Drumlet app AGPL-3.0. Every `src/` file the package bundles gets `// SPDX-License-Identifier: MIT` as line 1 (determine the set from the built module graph, not by guessing); root `LICENSE` gets a short note on the dual arrangement; package gets its own MIT `LICENSE`.
- Small carry-over from the t8b review (you'll be touching the file for the SPDX header anyway): add `stopAudio` to the `AudioEngineApi` interface and restore `useAudioEngine`'s explicit return type.

## Scope
- **In:** plan Task 9 (+ the carry-over above).
- **Out:** demo page and Playwright embed checks (t10), iframe replacement (t11), release workflow and publishing (t12). Don't publish anything.
- **Files you own:** `packages/drumlet-player/**`, `src/player/styles/**`, `src/styles/hardware.css` (add the `.drumlet-player` token scope only), `src/components/Cell.tsx` (container-driven pad sizing for the player only — app look unchanged), root `package.json` (scripts + devDeps such as postcss/postcss-selector-parser/@tailwindcss/cli if needed) and `package-lock.json`, root `LICENSE` (note only), SPDX header lines in bundled `src/**` files (line 1 only), `src/audio/useAudioEngine.ts` (carry-over only), `vite.config.js` only if the app build needs a change.
- **Do not touch:** `docs/wip/LEDGER.md`; behaviour of any `src/**` file beyond what's listed.

## Acceptance criteria
- [ ] `npm run build:lib && npm run verify:lib` pass; `verify-dist` enforces everything the plan lists (scoped selectors only, no vw/vh/position:fixed, no verovio in the main chunk, 28 kit audio files present).
- [ ] `packages/drumlet-player/scripts/ssr-import.test.mjs` imports the built package in plain Node with no DOM and passes.
- [ ] `npm pack --dry-run -w packages/drumlet-player` lists only `dist/**`, README, LICENSE, package.json; report the tarball size and the main-chunk/notation-chunk/style.css sizes.
- [ ] App (`npm run dev`, `npm run build`) looks and behaves exactly as before (screenshot grid + notation at 360 and 1280, both themes, before/after).
- [ ] In a scratch Vite app outside the repo that installs the packed tarball, a `<DrumletPlayer groove="<stock id>" />` renders with the hardware look and plays (kit fetched from a local `assetBaseUrl`, since nothing is on jsDelivr yet).

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run build:lib && npm run verify:lib && node packages/drumlet-player/scripts/ssr-import.test.mjs
npm pack --dry-run -w packages/drumlet-player
```
Chromium via playwright-core at /home/shaun/piano-invaders/node_modules/playwright-core, executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell.

## Known gotchas / decisions already made
- `hardware.css` is unlayered in the app; in the package it must end up under the scope like everything else.
- If the plan and this handoff disagree, the plan on main wins — say so.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
