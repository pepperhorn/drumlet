# Handoff: 0002 — Hardware pads: review r2 fixes (claude → lead)

- **Date:** 2026-11-27
- **Type:** return
- **Ledger:** 0002 · **Dispatch handoff:** `2026-11-27-0002-review-fixes--lead-to-claude.md` (commit a27339c on the lead branch; not copied here)
- **Branch:** `feat/hardware-pads-r1`, pushed to `feat/hardware-pads` · **PR:** https://github.com/pepperhorn/drumlet/pull/27
- **Status:** ready for re-review

## Receiver ack
Fix the five findings of review 6082556853 on PR #27 without changing the approved look: knob keys must not reach the window shortcuts, selection and split indicators must show on every pad state, focus must be visible on every hw control, materials must follow theme mode and registered colours, and labels must meet 12px desktop / 14px mobile. Moving the `body` backdrop out of `hardware.css` too. Only the files listed under "Files you own" change.

## What changed, per finding
1. **Knob keys leak.** `App.tsx` keydown handler returns early when the target is inside `[role="slider"]`. `Knob.tsx` also calls `stopPropagation` for Arrow/Home/End. Headless Chromium: Shift+Right on Swing 0 → 1, BPM stays 120 (light and dark).
2. **Selection and split master.** `.pad.cell-active` and `.pad.step-cell-split-master` are now `outline` rules in `hardware.css`, so the pad box-shadows and playhead rules can't hide them. The Tailwind `ring-violet` classes are removed from `Cell.tsx`. `violet` isn't a theme colour, so those utilities generated nothing even before the restyle. The new `--pad-select` token (`#8B5CF6`) replaces them. Computed outline on the selected pad: 2px solid violet, light and dark; unselected pads: none.
3. **Focus.** One rule gives `.hw-btn`, `.hw-well`, `.knob-body` and `.pad` a `:focus-visible` outline of 2px accent, offset 2px. The box-shadow focus rules are removed, as are the dead `focus-visible:ring-*` utilities on the page-jump input and time-sig select. Tabbing the Transport, PageTabs and TrackControls in both themes: every `hw-*` control, the knob, the pressed page tab and the wells report a 2px solid outline.
4. **Theme contract.** `applyTheme.ts` sets `data-theme-mode` on every apply, and `data-theme-custom` for any theme that isn't built in. Dark materials key on `[data-theme="dark"], [data-theme-mode="dark"]` (the first keeps the no-flash bootstrap). `:root[data-theme-custom]` derives room, faceplate, wells, keycaps, knobs and pads from `--color-bg/card/card-elevated/border/cell/cell-hover` with `color-mix`. `--mat-lift` (60% light, 10% dark) sets how much white the derived surfaces get. A test theme registered with id `neon`, `mode: 'dark'` renders dark materials in the registered purples (screenshot checked).
5. **Sizes.** `.legend` is 12px; `.track-mobile-volume-label` is 14px; the desktop M/S buttons use `text-xs` (12px). Chakra Petch is unchanged.
6. **Suggestion taken.** The `body` rule is gone from `hardware.css`; `src/index.css` already had the same rule using `--room-bg`.

## Files changed
`src/styles/hardware.css`, `src/App.tsx` (one line in the keydown handler), `src/components/{Cell,Knob,TrackControls,PageTabs,Transport}.tsx`, `src/themes/applyTheme.ts`, `DESIGN.md` (decisions log line). `MpcPads.tsx` and `index.css` needed no edit.

## Verification
`npm ci && npm run typecheck && npx eslint src && npm run build` — typecheck clean, eslint 0 errors (2 existing warnings in `AuthModal.tsx`), build OK. Headless Chromium checks as above, on port 5220.

## Decisions made
- Theme extension uses a `data-theme-custom` attribute plus `data-theme-mode`, not per-theme override files. Small, and the player package can reuse `hardware.css` by setting the same two attributes on its root.
- Selection and focus use `outline`, so a focused selected pad shows the accent colour in place of violet.

## Follow-ups
- Smaller legends remain at 11px on the notation toggle, TAP and CLEAR buttons (`PageTabs.tsx`, `Transport.tsx`). The review didn't name them; they are below the DESIGN.md minimum.
- Expanded split master and playhead overlap were not screenshotted; outline is independent of the box-shadow rules.

GBrain: unavailable (server failed to connect); `projects/drumlet` not consulted.
