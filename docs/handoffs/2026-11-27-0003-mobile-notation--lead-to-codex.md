# Handoff: 0003 — Mobile notation: load feedback, fit to width, toggle icon (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0003 · **Spec:** docs/specs/0003-mobile-notation.md · **Plan:** docs/plans/0003-mobile-notation.md
- **Branch:** orch/0003-mobile-notation · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** cb8edd6
- **Port (if running a server):** 5230
- **Status:** open

## Goal
Fix the owner's phone bug report on drumlet.app: tapping the notation toggle must show a clear loading state until the score appears (and usually be ready already via prefetch), the score must fit the card width by default, and the toggle icon must render without the lazily-loaded music font. Exactly as the spec's Decisions and the plan's Steps say.

## Context you need
- Spec and plan above (read both fully). Owner screenshots described in the spec's Problem section.
- Measured on prod: NotationView chunk 7.9 MB raw / 2.26 MB compressed, 5.6 s download; no Cache-Control on /assets.
- Production runs `serve -s dist` (see Dockerfile).
- 0001-t6 (endless notation) will later edit the same files; keep changes focused so it rebases cleanly.

## Scope
- **In:** everything in the plan.
- **Out:** replacing verovio; endless layout; other app UI.
- **Files you own:** as listed under **Owns** in the plan.
- **Do not touch:** `docs/wip/LEDGER.md`, any file not in Owns.

## Acceptance criteria
- [ ] From tap to score there is never an empty card: engine → render phases visible, slow (15 s) and error states with Retry.
- [ ] Prefetch on idle unless saveData / slow-2g / 2g / 3g; also on toggle pointerdown/focus; idempotent.
- [ ] Default "Auto" bars/line: a 4-bar stock groove fits a 360 px and 412 px wide phone without horizontal scroll; manual 2/3/4/∞ still work.
- [ ] Toggle icon is an inline SVG with an accessible label; it renders before notation has ever loaded.
- [ ] `/assets/*` served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` `no-cache`; SPA rewrite still works (check a deep path returns index.html).
- [ ] All plan tests exist and pass; contextual class names on every new element; DESIGN.md min sizes.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npx serve -s dist -l 5230 & sleep 2; curl -sI http://localhost:5230/ | grep -i cache-control; curl -sI http://localhost:5230/assets/$(ls dist/assets | grep NotationView) | grep -i cache-control
# Headless Chromium: playwright-core at /home/shaun/piano-invaders/node_modules/playwright-core,
# executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell; emulate 360x800 and Fast 3G via CDP Network.emulateNetworkConditions.
```

## Known gotchas / decisions already made
- The toggle currently uses `fontFamily: 'Petaluma'` (PageTabs.tsx ~161); Petaluma is only fetched by the notation renderer.
- NotationView already has a portrait/landscape default (2/4 bars) — replace it with Auto, keep the override state.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
