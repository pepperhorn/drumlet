# Handoff: 0013 — [quick] Dark theme: notation title, clef and time signature (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0013 · **Spec:** none (quick; owner accepted ledger S26) · **Plan:** none
- **Branch:** orch/0013-dark-notation-glyphs · **Worktree:** created by T3
- **Base commit:** aea44ca
- **Status:** open

## Goal
In the Dark Studio theme the notation title ("Drumlet notation"), the drum clef and the time signature render black on the dark card (found in PR #44 review r2; pre-existing on main). Make every non-coloured glyph (title, clef, time signature, staff lines, bar lines, rests, stems/beams if they're also black, tempo/section text) follow the theme's text colour in both light and dark — e.g. drive verovio SVG fills/strokes from `currentColor` with `color: var(--color-text)` on the notation container, or post-process the SVG. Colour-coded noteheads ("Color On") keep their track colours. SVG/PNG export must still produce readable output (dark-on-light is fine for exports; say what you chose).

## Files you own
`src/notation/**`, `src/components/NotationView.tsx`, their tests.

Parallel quick items right now (disjoint files): 0011 owns `src/App.tsx` (prefetch block) + `src/components/notationPrefetch.ts`; 0012 owns `.github/workflows/**`; 0013 owns `src/notation/**` + `src/components/NotationView.tsx`. Touch nothing else; note needs in your return handoff.

## Acceptance criteria
- [ ] Chromium screenshots of wrapped and endless notation in light and dark at 412 and 1280 px: all glyphs visible against the card (paste paths); a test asserting no hard-coded black fill/stroke remains on title/clef/time-signature elements in the rendered SVG.
- [ ] Export SVG/PNG still legible.
- [ ] Contextual class names on any new element; no behaviour change outside the goal.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```
Chromium: executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell.

---
## Receiver ack
I’ll make uncoloured wrapped and endless notation follow the theme text colour, preserve track colours, and verify readable SVG and PNG downloads. I’ll change only `src/notation/**`, `src/components/NotationView.tsx`, and their tests, then check both layouts in Chromium at 412 and 1280 px. GBrain context: `projects/drumlet`.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
