# Handoff: 0011 — [quick] Defer the notation prefetch on drumlet.app (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0011 · **Spec:** none (quick; owner accepted ledger S30) · **Plan:** none
- **Branch:** orch/0011-defer-notation-prefetch · **Worktree:** created by T3
- **Base commit:** aea44ca
- **Status:** open

## Goal
On `/`, the idle prefetch of the 7.9 MB notation chunk (+ Petaluma) starts soon after first paint (`src/App.tsx:~79-90`) and competes with the App chunk on slow links; Chromium's Fast-3G emulation doesn't set `navigator.connection`, so the 3g skip rule doesn't catch it. Change the trigger: start the background prefetch only after the app is interactive **and** either the user has interacted once (first pointerdown/keydown anywhere) or 5 s have passed after the window `load` event — whichever comes first — still via `requestIdleCallback` when available, and still skipped on saveData/slow-2g/2g/3g. Keep the existing pointerdown/focus trigger on the notation toggle (immediate). Keep `prefetchNotation` idempotent.

## Files you own
`src/App.tsx` (the prefetch effect only), `src/components/notationPrefetch.ts`, `src/components/notationPrefetch.test.ts`.

Parallel quick items right now (disjoint files): 0011 owns `src/App.tsx` (prefetch block) + `src/components/notationPrefetch.ts`; 0012 owns `.github/workflows/**`; 0013 owns `src/notation/**` + `src/components/NotationView.tsx`. Touch nothing else; note needs in your return handoff.

## Acceptance criteria
- [ ] Unit tests with fake timers: no prefetch before load+5 s with no interaction; first interaction after load prefetches; saveData/3g still skip; toggle pointerdown still prefetches immediately.
- [ ] Chromium (Fast 3G profile, ≥ 3 alternating pairs vs main): `/` time-to-app not worse and the notation chunk request starts after the App chunk finishes; paste the waterfall summary.
- [ ] `npm run check:embed-route` and `npm run check:embed` still pass.
- [ ] Contextual class names on any new element; no behaviour change outside the goal.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```
Chromium: executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
