# Handoff: 0005 — [quick] Notation Retry without page reload (lead → codex)

- **Date:** 2026-11-27
- **Type:** quick
- **Ledger:** 0005 · **Spec:** none (quick; from PR #33 review, ledger S12 + S13) · **Plan:** none
- **Branch:** orch/0005-notation-retry-in-place · **Worktree:** created by T3
- **Base commit:** e480679
- **Status:** open

## Goal
Two small resilience fixes to the notation loader merged in #33:
1. **Retry reloads the page** (`src/App.tsx:~43`, `window.location.reload()`): on a slow phone that discards the half-finished 2.3 MB download and the undo history. Retry must instead re-attempt the lazy import in place (fresh `React.lazy` / keyed boundary) and keep app state.
2. **A failed import is cached** (`src/components/notationPrefetch.ts` `loadNotation`): if the idle prefetch fails once, the first tap goes straight to the error card. Clear the cached promise on rejection so the next call retries.

## Files you own
`src/App.tsx` (notation lazy-load / Suspense / retry block only), `src/components/notationPrefetch.ts`, `src/components/notationPrefetch.test.ts`, a new `src/components/NotationBoundary.tsx` (+ test) if you need an error boundary component.

## Acceptance criteria
- [ ] After a forced import failure, Retry loads notation without `location.reload`; pattern, page and undo history are unchanged (test with a mocked failing-then-succeeding import).
- [ ] `loadNotation()` after a rejected attempt starts a new import; concurrent calls still share one promise (tests).
- [ ] The slow (15 s) state's Retry also retries in place.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

---
## Receiver ack

I will retry the notation loader in place from both fallback states, preserve sequencer and undo state, and clear failed prefetch promises without breaking concurrent deduplication. I will limit edits to the owned files and leave NotationView.tsx and src/notation/ to the parallel task. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
