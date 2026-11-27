# Handoff: 0003 — Mobile notation (codex → lead)

- **Date:** 2026-11-27
- **Type:** return
- **Ledger:** 0003 · [Spec](../specs/0003-mobile-notation.md) · [Plan](../plans/0003-mobile-notation.md)
- **Branch:** `orch/0003-mobile-notation`
- **Worktree:** `/home/shaun/.t3/worktrees/drumlet/t3-9b456f9f-7f5e8ba5d057ee97`
- **PR:** Opened as draft after this handoff commit
- **Base commit:** `d077bf2` (amended scope)
- **Port:** 5230
- **Status:** ready for review

## Goal

Show loading feedback through engine download and score render, fit the score card on phones, and engrave beat-relative durations from onsets.

## Context you need

- [Dispatch and acknowledgement](2026-11-27-0003-mobile-notation--lead-to-codex.md)
- GBrain: `projects/drumlet` for project context. The repo plan and amended spec govern this task.

## Scope

- **In:** Lazy loading, cache headers, the notation toggle, Auto bars/line, onset durations, and per-step overlay coordinates.
- **Out:** Endless notation, audio behavior, changing notation fonts, and production deployment.
- **Files owned:** `src/App.tsx` (notation only), `src/components/PageTabs.tsx` (toggle only), `src/components/NotationView.tsx`, `src/components/NotationLoading*`, `src/components/notationPrefetch*`, `src/notation/renderStaff*`, `src/notation/beatToEvents*`, `public/serve.json`, and the two handoffs. The ledger and Dockerfile were not changed.

## Acceptance and verification

- Auto laid out all four bars of Basic 8th-Note Rock at 360×800 and 16th-Note Hi-Hat Rock at 412×900. Card scroll width matched client width at 334 px and 386 px, respectively. The score title, drum key, and staff were inside the card.
- Manual 2/3/4/∞ kept all four bars. Resizing 412 → 1280 → 412 changed Auto from four systems to one and back.
- The 18 px mobile icon rendered before either notation asset was requested. On simulated Fast 3G, engine and render feedback remained visible until the score appeared. Holding the font past 15 s showed Retry, which canceled the stalled request and loaded the score. Focus started prefetch on simulated 3G. An unthrottled context requested each asset once before the toggle was used. Engine and render Retry recovered from an interrupted module import and a font HTTP 503.
- In the isolated hi-hat part of Basic 8th-Note Rock, bar 2 has pairs of eighth notes with no intervening rests. The integration test checks every grid step has a position and verifies interpolation between onsets.
- `serve -s dist` sent `no-cache` for the index and deep SPA path and `public, max-age=31536000, immutable` for the hashed notation chunk. The deep route body matched `dist/index.html`.

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npx serve -s dist -l 5230
curl -fsSI http://localhost:5230/
curl -fsSI "http://localhost:5230/$(find dist/assets -name 'NotationView-*.js' -printf 'assets/%f')"
curl -fsS http://localhost:5230/examples/deep/path | cmp - dist/index.html
node /tmp/drumlet-0003/check.cjs
node /tmp/drumlet-0003/retries.cjs
```

```text
typecheck: passed
lint: 0 errors, 2 existing AuthModal.tsx warnings
Vite: built successfully
Test Files  9 passed (9)
Tests       168 passed (168)
```

Screenshots and browser checks are local to the worktree host.

- 360 px: `/tmp/drumlet-0003/360-toggle.png`, `/tmp/drumlet-0003/360-engine.png`, `/tmp/drumlet-0003/360-render.png`, `/tmp/drumlet-0003/360-slow.png`, `/tmp/drumlet-0003/360-auto.png`
- 412 px: `/tmp/drumlet-0003/412-auto.png`, `/tmp/drumlet-0003/412-eighth-note-pairs.png`
- Retry errors: `/tmp/drumlet-0003/engine-error.png`, `/tmp/drumlet-0003/render-error.png`

## Decisions made

- A rejected browser module import is cached for the current document. Engine Retry reloads and reopens notation. The normal audio-start prompt may reappear. Score Retry stays in the current view and restarts a stalled font request.
- Compound 6/8 and 12/8 group onsets in threes. Active splits keep their subdivision inside the grid cell. A gap after such a split is written as a rest if the fixed split durations do not cover it. Nothing ties across a beat.
- Across regular onsets, the rare unrepresentable spans in the tests were five thirty-seconds (eighth + thirty-second rest) and five sixteenths (quarter + sixteenth rest).
- Single-system layouts disable Verovio's automatic breaks so a dense last bar cannot move to an unrendered second page. Overlay coordinates use CSS pixels at the displayed scale.

## Open questions

None.

## Return

- **Outcome:** done
- **Implementation commit:** 40e0da3c6e05437245f1963fea288214a36d0293
- **Follow-ups:** Lead review before 0001-t6 edits the same files. The browser checks used local Chromium, not Android hardware or production.
- **For GBrain:** Keep genuine rests in Petaluma. The false rests came from step-based transcription. Layout tests should count bars as well as systems because the first rendered SVG can omit a paginated bar.
