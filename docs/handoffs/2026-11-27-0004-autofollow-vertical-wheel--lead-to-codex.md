# Handoff: 0004 — [quick] Auto-follow: ignore vertical wheel (lead → codex)

- **Date:** 2026-11-27
- **Type:** quick
- **Ledger:** 0004 · **Spec:** none (quick) · **Plan:** none
- **Branch:** orch/0004-autofollow-vertical-wheel · **Worktree:** created by T3
- **Base commit:** 6a6cac0
- **Status:** open

## Goal
`useAutoFollow` (src/components/useAutoFollow.ts, merged in #32) pauses following on any wheel event over the scroller. A vertical wheel doesn't move the horizontal strip, so scrolling the host page past an embedded player wrongly stops it following. Pause only when the wheel actually scrolls the strip horizontally: `|deltaX| > |deltaY|`, or `shiftKey` with a non-zero `deltaY` (browsers map shift+wheel to horizontal). Owner decision (2026-11-27): arrow-key focus moves keep pausing as now — don't change that.

## Files you own
`src/components/useAutoFollow.ts`, `src/components/useAutoFollow.test.ts`

## Acceptance criteria
- [ ] Vertical wheel (deltaY only, no shift) over the strip → still following.
- [ ] Horizontal wheel (deltaX dominant) → paused. Shift + vertical wheel → paused.
- [ ] Existing tests still pass; new tests cover the three cases above.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
