# Handoff: 0016 — Endless downloads have no mid-strip title (Codex → lead)

- **Date:** 2026-11-28
- **Type:** return
- **Ledger:** 0016
- **Dispatch:** [Endless SVG/PNG downloads](2026-11-28-0016-endless-export-title--lead-to-codex.md)
- **Branch:** `orch/0016-endless-export-title`
- **Worktree:** `/home/shaun/.t3/worktrees/drumlet/t3-71edaf9e-e55e4161e132803a`
- **Commits:** ack `917aa8f`, implementation `25d77bdff93d7ced2f62fa46e38f1802269ec682`
- **Base:** `ebeb9ff`. Chromium comparison used `origin/main` at `a88dce44cc642d6a1fb41e769ba55424891681da`, which has the same source.
- **Outcome:** done. Open a draft from this branch after committing this handoff.

## What changed

Endless SVG and PNG downloads omit the engraved title at every chunk. The renderer clears each Endless header after measuring the score, as before. It no longer saves header nodes for the exporter to restore. Wrapped notation keeps its title.

Only the three owned files under `src/notation/` and the two task handoffs changed. The diff outside docs is 50 changed lines. No changes to `NotationView`, playback, or package exports.

## Acceptance and verification

- The SVG regression tests exercise the actual download Blob: 8-bar Endless and 225-bar chunked Endless export zero titles, and 4-bar Paged exports one. Both Endless assertions failed on the original implementation.
- In Chromium 158, clicked both download buttons in light and dark. The 4-bar Endless SVG went from one title to zero and the 230-bar SVG from four to zero. Normalized SVGs matched main after removing its title headers. The PNGs kept their dimensions (1300×294 and 49656×246) and differed in exactly one and four title pixel regions, respectively.
- Paged SVGs retained one title and matched main after normalizing generated Verovio IDs. Paged PNGs were byte-identical at 1300×248 in both themes.
- The on-screen Endless SVG matched main after normalizing IDs. Paged kept the on-screen title. All 64 short-score and 3,680 long-score step positions matched main. The short-score playhead advanced and disappeared on stop in both layouts and themes.

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run build:lib && npm run verify:lib && npm run check:embed
```

Final run after `orch-deslop` exited 0:

```text
✖ 2 problems (0 errors, 2 warnings)
Test Files  22 passed (22)
     Tests  268 passed (268)
dist OK: scoped CSS, lazy notation, declarations and 28 matching acoustic1 samples.
SSR import passed with browser globals unavailable.
check:embed: packed-host checks passed, including Grid / notation and playback handoff.
```

The two lint warnings are in untouched `AuthModal.tsx`.

## Decisions and follow-ups

Keep the empty header groups and existing geometry. Clearing before measurement or changing the MEI can shift staff and playhead positions. No open questions. The draft is ready for lead review.

GBrain context: `projects/drumlet`. No write-back by the implementer.
