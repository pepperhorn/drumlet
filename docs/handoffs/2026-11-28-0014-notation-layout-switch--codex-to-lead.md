# Handoff: 0014 — Replace stale notation on layout switch (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0014 · Spec and plan: none (quick)
- Branch: `orch/0014-notation-layout-switch`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-134ec035-a9bad30080ec31f8`
- Base: `4252c85`
- Implementation commit: `14b570a90a1ae3f37e12085efdeab4a532508378`
- Status: closed (implementation complete, draft PR for review)
- Dispatch: [0014 lead → codex](2026-11-28-0014-notation-layout-switch--lead-to-codex.md)

## Goal and scope

Keep one score when switching Paged ↔ Endless, with counts and the playhead aligned to the current score. Changed only `src/components/NotationView.tsx`, `src/components/NotationView.test.tsx`, and the 0014 handoffs. No changes to `src/App.tsx`, the prefetch module, the renderer or the transport.

## Acceptance

- [x] The component regression test switches wrapped → Endless → wrapped and finds exactly one score SVG in the correct container each time. It found two SVGs on the first switch before the fix.
- [x] Chromium completed both directions while stopped and playing at 412 and 1280 px in light and dark themes. Each of 24 snapshots had one score root, four bars and 16 counts. The count and playhead positions were within 0.46 px of their expected positions on the engraved staff. Count labels were checked per bar and the playhead was absent while stopped.
- [x] The packed-player embed check passed.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run build:lib && npm run verify:lib && npm run check:embed
```

Used `PLAYWRIGHT_CORE_PATH=/home/shaun/piano-invaders/node_modules/playwright-core` and the Chromium executable in the dispatch handoff. The browser fixture used the local acoustic kick kit on four populated bars, Auto wrapping at 412 px and two bars per line at 1280 px. The verification chain passed again after shortening the regression test name and simplifying its control lookup in the orch-deslop pass.

```text
✖ 2 problems (0 errors, 2 warnings) [existing AuthModal hook warnings]
Test Files  22 passed (22)
Tests  259 passed (259)
dist OK: scoped CSS, lazy notation, declarations and 28 matching acoustic1 samples.
SSR import passed with browser globals unavailable.
Grid / notation: 0 engine requests in grid, switch fetches chunk and renders SVG
Shared audio: 8 players, 1 AudioContext, suspended at idle
```

Evidence on the worktree host:

- `/tmp/drumlet-0014-t3-134ec035/chromium-evidence.zip` contains all 24 PNGs, the Playwright script and its geometry log.
- `/tmp/drumlet-0014-t3-134ec035/412-light-playing-2-endless.png` shows the Endless strip at 412 px.
- `/tmp/drumlet-0014-t3-134ec035/1280-dark-playing-3-paged.png` shows the Paged score after the reverse switch.
- `/tmp/drumlet-0014-t3-134ec035/verify-final.log` contains the full command output.

## Decisions made

React matched the two unkeyed divs by type and position. On Paged → Endless, it reused the Paged score wrapper as the Endless scroll wrapper and reused the old SVG host as the new score wrapper. The old SVG had been inserted by Verovio, so React did not remove it. Keying the Endless wrapper gives the layout branches distinct identities and discards the old subtree. The render effect already uses `layout` via `options`. No render-cache change was needed.

GBrain context: `[default:projects/drumlet]` records the existing Endless notation and player work. No GBrain write was made by the implementer.

## Open questions and follow-ups

None for implementation. Review the draft PR at the reported head.
