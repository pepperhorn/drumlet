# Handoff: 0002 — Hardware pads: address review r2 (lead → claude)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0002 · **Spec:** none (adopted PR) · **Plan:** none
- **Branch:** feat/hardware-pads (existing PR branch; push to it) · **Worktree:** created by T3
- **PR:** https://github.com/pepperhorn/drumlet/pull/27
- **Base commit:** PR head 5535f517e5a073c03e63ab8bfcaf54026ef8ef15
- **Port (if running a server):** 5220
- **Status:** open

## Goal
Fix the five findings in Codex's review of PR #27 so the hardware restyle (keycaps, knobs, silicone step pads) keeps every existing state indicator, keyboard behaviour, theme-extension path and readable size, then push to `feat/hardware-pads` and reply on the PR.

## Context you need
- Review: https://github.com/pepperhorn/drumlet/pull/27#pullrequestreview-6082556853 (`gh api repos/pepperhorn/drumlet/pulls/27/reviews/6082556853 --jq .body`). Read it in full; findings below are summaries.
- Rules: `CLAUDE.md` (contextual class name first on every element), `DESIGN.md` (minimum 12px desktop / 14px mobile), `AGENTS.md`.
- The look itself is owner-approved — don't redesign it; fix the regressions.
- Theme system: `src/themes/applyTheme.ts`, `src/themes/builtin.ts`, `DESIGN.md` § Theming System.

## Scope
- **In:**
  1. **Knob shortcuts leak to the window handler** (`src/components/Knob.tsx:136`, `src/App.tsx:~572`): Shift+Arrow on a focused knob also nudges BPM. Make the App's global keydown handler ignore events whose target is (or is inside) `[role="slider"]`, matching how it already skips native inputs; also `stopPropagation` for keys the knob handles.
  2. **Selection / expanded-split indicators hidden** (`src/styles/hardware.css:~204,~220` vs Tailwind `ring-*` on `Cell.tsx:81,113,166`): `.cell-active` (copy/cut target) and the expanded split master must be visibly marked on lit, unlit and playhead pads, both themes. Compose the indicator into the pad box-shadow (e.g. `.pad.cell-active { box-shadow: <pad shadow>, 0 0 0 2px <violet> }`) or draw it with an `outline`/pseudo-element so it survives the playhead rules.
  3. **Focus rings hidden** (`hardware.css:~128` well shadow; `:~308` accent pressed rule vs `:~150` focus rule; `PageTabs.tsx:239`, `Transport.tsx:348`): every keycap, well and knob must show a visible `:focus-visible` indicator in both themes, including the pressed current page tab. Prefer `outline: 2px solid var(--color-accent); outline-offset: 2px` on `:focus-visible` so it never fights box-shadows.
  4. **Theme extension contract**: materials must not key only on the literal `[data-theme="dark"]`. Built-in light/dark keep their fixed gradients as defaults, but a registered theme with `mode: 'dark'` must get dark materials, and the registered `bg` / `card` / `cell` / `cellHover` tokens must still flow through (e.g. derive `--face-*`, `--pad-off-*` from `--color-card` / `--color-cell` via `color-mix` when a theme supplies them, or have `applyTheme.ts` set a `data-theme-mode="dark|light"` attribute that the materials key on). Pick one, keep it small, explain it in the PR reply.
  5. **Readable sizes**: restore ≥12px desktop / ≥14px mobile for the labels the review names (mobile track volume label `TrackControls.tsx:272`; desktop M/S labels lines 116, 131). Keep Chakra Petch.
  - Non-blocking suggestion to take: move the `body { background: var(--room-bg) }` rule out of `hardware.css` into `src/index.css` (it's app-only; the planned player package reuses the materials sheet).
- **Out:** the legacy mobile transport buttons in `App.tsx`; header buttons; anything about the player package.
- **Files you own:** `src/styles/hardware.css`, `src/index.css`, `src/components/Cell.tsx`, `src/components/Knob.tsx`, `src/components/TrackControls.tsx`, `src/components/PageTabs.tsx`, `src/components/Transport.tsx`, `src/components/MpcPads.tsx`, `src/themes/applyTheme.ts`, the keydown handler block in `src/App.tsx` only, `DESIGN.md` (decisions log line only, if behaviour of themes changes).
- **Do not touch:** `docs/wip/LEDGER.md`, anything under `packages/`, audio/state code.

## Acceptance criteria
- [ ] Focus Swing knob, press Shift+Right → Swing changes, BPM does not (also check Human knob and track volume knob).
- [ ] With a step selected for copy/cut, the selected pad is visibly ringed when unlit, lit, and under the playhead, in light and dark.
- [ ] Expanded split master shows its indicator in both themes.
- [ ] Tab through Transport, PageTabs, TrackControls: every control shows a visible focus indicator in both themes, including the pressed current page tab and wells (time-sig select, step-div well).
- [ ] Registering a custom theme with `mode: 'dark'` and a new id (e.g. via `registerTheme` in the console) gives dark materials; its `card`/`cell` colours visibly affect faceplate/unlit pads.
- [ ] Named labels meet 12px desktop / 14px mobile.
- [ ] `body` backdrop rule lives in `src/index.css`, not `hardware.css`.
- [ ] Every new JSX element has a contextual class name first.

## Verify with
```bash
npm ci && npm run typecheck && npx eslint src && npm run build
# Visual: npm run dev -- --host 0.0.0.0 --port 5220, check light + dark.
# Headless screenshots: playwright-core at /home/shaun/piano-invaders/node_modules/playwright-core with
#   executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell
#   set theme via localStorage 'drumlet-theme' = 'light' | 'dark' before load; click `.audio-start-btn` if present.
```

## Known gotchas / decisions already made
- `hardware.css` is imported unlayered, so it beats Tailwind utilities; Tailwind `ring-*`/`focus:` utilities will lose to its box-shadows. Fix in `hardware.css`, not by adding utilities.
- `.legend` sets `color`, which overrides Tailwind text colour utilities; buttons that change colour use `font-legend … uppercase tracking-[0.12em]` instead (existing decision).
- Dark theme name is "Dark Studio", id `dark`; light is the default and brand identity (DESIGN.md).
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
