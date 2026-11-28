# Handoff: 0001-t11 — Replace the iframe embed (lead → codex)

- **Date:** 2026-11-28
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t11, "Task 11")
- **Branch:** orch/0001-t11-iframe-replace · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** f2cfd53 (main with the package build, #44)
- **Port (if running a server):** 5211
- **Status:** open

## Goal
Implement plan **Task 11** on main with the amendments below: the existing `?embed=1#s=…` iframe route renders `<DrumletPlayer>` instead of the full app for plain grooves, and the Share modal offers an npm/React snippet alongside the iframe snippet.

## Amendments to the plan (lead, 2026-11-28 — these win over the plan text)
- **Don't pass `assetBaseUrl`** in `EmbedPage`. In the app build the kit loader already defaults to `/samples/`, which is where `public/samples/acoustic1` lives; `assetBaseUrl="/samples"` would point at `/samples/kits/…`, which doesn't exist.
- **You own the legacy-route check** (moved out of t10): write `scripts/embed-route.check.mjs` (playwright-core) that builds/serves the app and asserts:
  1. a legacy **v3** share code at `/?embed=1#s=<code>` renders a `.drumlet-player` (not `.drumlet-app`) and plays;
  2. a **v4** multi-page share code renders all pages in the endless view;
  3. a payload with `pluginMeta` (challenge) still renders the full app as today;
  4. `?theme=dark` gives `data-theme="dark"`; no theme → light;
  5. the embed page has no horizontal scrollbar at 360 px and fills the iframe height.
- Spec decisions to honour: grid editing in embeds is dropped (player is view + play); `chrome="full"` in the embed.

## Scope
- **Files you own:** `src/main.tsx`, new `src/player/EmbedPage.tsx` (+ test), `src/components/ShareModal.tsx`, `buildEmbedSnippet` (and a new npm-snippet builder) in `src/state/shareCodec.ts` (+ tests), `scripts/embed-route.check.mjs`, root `package.json` (script `check:embed-route` only).
- **Added by lead for fix round 3 (after t10 merged):** `vite.config.js` and `index.html` — only to restore normal-app startup parity (preload the App chunk).
- **Do not touch:** `docs/wip/LEDGER.md`, `player-demo.html`, `scripts/player-embed.check.mjs`, `scripts/pack-smoke.mjs` (t10 runs in parallel), the package build.

## Acceptance criteria
- [ ] Plan Task 11 steps done; existing embed links keep working (v1–v3 decode as single-page grooves via the player).
- [ ] ShareModal "Embed" shows two snippets with copy buttons: npm (`npm i @pepperhorn/drumlet-player` + `import`, `import '@pepperhorn/drumlet-player/style.css'`, and `<DrumletPlayer groove={{ share: '<code>' }} />`) and the iframe snippet. Snippet builders have unit tests.
- [ ] `npm run check:embed-route` exits 0 with all five assertions.
- [ ] Contextual class names on new elements; DESIGN.md sizes.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run check:embed-route
```
Chromium: playwright-core at /home/shaun/piano-invaders/node_modules/playwright-core (or this repo's if t10 adds it later), executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell; make it overridable via `CHROMIUM_PATH`.

## Known gotchas / decisions already made
- If the plan and this handoff disagree, this handoff's Amendments win; say so.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
