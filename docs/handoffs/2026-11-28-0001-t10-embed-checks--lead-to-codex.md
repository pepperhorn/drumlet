# Handoff: 0001-t10 — Demo page, embed checks, pack smoke (lead → codex)

- **Date:** 2026-11-28
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t10, "Task 10")
- **Branch:** orch/0001-t10-embed-checks · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** f2cfd53 (main with the package build, #44)
- **Port (if running a server):** 5210
- **Status:** open

## Goal
Implement plan **Task 10** on main with the lead's amendments below: a demo page, a Playwright embed-isolation check and a pack-smoke script that together prove the published package behaves in a real host. These become the release gate for t12.

## Amendments to the plan (lead, 2026-11-28 — these win over the plan text)
- **Hostile host CSS is unlayered now.** Since #44 the package CSS is unlayered and guaranteed against unlayered host rules. Use the five host sheets the t9 reviews used: clean; `button{all:unset}`; `*{font-size:30px}`; `button{padding:12px 20px;display:inline-block;font-size:18px}`; `div{padding:20px}` — plus a host Tailwind build loaded before `style.css`. Run each in light and dark.
- **Run the checks against the packed tarball**, not `src/`: `pack-smoke.mjs` packs `packages/drumlet-player`, installs it into a fresh Vite React app in a temp dir and builds it; `player-embed.check.mjs` serves that built app (plus the demo page variants) and drives it in Chromium. The demo page in the repo (`player-demo.html` + `src/player/demo.tsx`) may import from `src/` for local development.
- **Drop the legacy `?embed=1` route assertion** from this task — the route is rebuilt in t11, which owns its own check.
- **Add the t8b gate:** a page with 8 players played in turn creates exactly 1 AudioContext (patch `window.AudioContext` in the harness); suspended when idle.

## Assertions `player-embed.check.mjs` must make (exit non-zero on any failure)
1. Pads 36×36 and Play 44×44 (or whatever the clean host measures) identical across all 5 host sheets × 2 themes.
2. Host elements outside `.drumlet-player` have identical computed styles with and without the player's `style.css` (sample ≥ 10 elements: headings, buttons, links, inputs, a content-box div).
3. Starting player B stops A.
4. `chrome="none"` makes zero requests to `/kits/` and to the notation/verovio chunk; a grid-only player never fetches the notation chunk.
5. `assetBaseUrl` override makes kit requests go there.
6. 8 players → 1 AudioContext.
7. A host `className` rule (margin/outline/width) applies to the player root.

## Scope
- **Files you own:** `player-demo.html`, `src/player/demo.tsx`, `scripts/player-embed.check.mjs`, `scripts/pack-smoke.mjs`, `vite.config.js` (multi-page input only), root `package.json` (scripts `check:embed`, `smoke:pack` only; devDeps only if unavoidable — playwright-core may be added as a devDependency).
- **Do not touch:** `docs/wip/LEDGER.md`, `src/main.tsx`, `src/player/EmbedPage.tsx`, `src/components/ShareModal.tsx`, `src/state/shareCodec.ts` (t11 runs in parallel), the package's source or build.

## Acceptance criteria
- [ ] `npm run smoke:pack` exits 0; `npm run check:embed` exits 0 with every assertion above; both print a short summary table.
- [ ] Deliberately break one thing (e.g. inject `button{display:none !important}`-free regression by layering style.css in a scratch copy) and show the check fails — paste the failing output in the return handoff.
- [ ] The chromium path is configurable (`CHROMIUM_PATH` env, default to the cached headless shell below) so CI can use its own.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run build:lib && npm run verify:lib && npm run smoke:pack && npm run check:embed
```
Chromium: playwright-core (installed in this repo or at /home/shaun/piano-invaders/node_modules/playwright-core), executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell.

## Known gotchas / decisions already made
- PepperScore's `validation/embed.mjs` (/home/shaun/ph-vexflow-view) is the reference pattern.
- If the plan and this handoff disagree, this handoff's Amendments win; say so.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
