# WIP Ledger

> Single writer: the **lead**, on the main branch only. Implementers report status through their return handoff.
> Status: proposed · specced · planned · dispatched · in-review · changes-requested · ready · merged · closed · blocked · parked
> Waiting on: `child <taskId>` · `review <taskId>` · `ci` · `human: <why>` · `lead: <next action>`. Set it on every status change. A row needs the lead when it starts with `lead`, or when it's empty and Status is dispatched, in-review, changes-requested, ready, or merged. The lead's Stop hook won't let the lead end its turn while any row needs it.
> Type: normal items have a spec and plan. Quick items have the title prefix `[quick]` (no spec or plan, a short handoff). PRs adopted by `orch-sweep` have the prefix `[pr]`.

Next ID: 0009

## Active

| K | Title | Status | Waiting on | Owner (provider/model) | Branch | PR | Worktree | T3 task/thread | Spec | Plan | Latest handoff | Updated |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0006 | [quick] Notation beat counts restart each bar | dispatched | child 0006-impl-r1 | codex/gpt-6.2-sol | orch/0006-beat-counts-per-bar | — | — | — | — | — | docs/handoffs/2026-11-27-0006-beat-counts-per-bar--lead-to-codex.md | 2026-11-27 |
| 0007 | [quick] Stop renderStaff test timing out | dispatched | child 0007-impl-r1 | codex/gpt-6.2-sol | orch/0007-flaky-renderstaff-test | — | — | — | — | — | docs/handoffs/2026-11-27-0007-flaky-renderstaff-test--lead-to-codex.md | 2026-11-27 |
| 0008 | [quick] Screen-reader names for step pads | dispatched | child 0008-impl-r1 | codex/gpt-6.2-sol | orch/0008-pad-screen-reader-names | — | — | — | — | — | docs/handoffs/2026-11-27-0008-pad-screen-reader-names--lead-to-codex.md | 2026-11-27 |
| 0001 | Drumlet Player (embeddable component) + endless view | in-review | review 0001-t7-review-r1 (t7 #37), review 0001-t8-review-r1 (t8 #38) | codex/gpt-6.2-sol (t1) | orch/0001-t2-share-v4, orch/0001-t4-play-through | https://github.com/pepperhorn/drumlet/pull/37, https://github.com/pepperhorn/drumlet/pull/38 | /home/shaun/.t3/worktrees/drumlet/t3-2afd6bc2-3454cab65970f66a | t1 thread: thread:delegated-task:command%3Amcp%3A7e96baca-8201-49c3-af48-c6e3aea92013%3Adelegate-task%3A0001-t1-impl-r1 | docs/specs/0001-drumlet-player.md | docs/plans/0001-drumlet-player.md | docs/handoffs/2026-11-27-0001-t1-kit-loader--codex-to-lead.md @ 5e09ee8 | 2026-11-27 |

## Done / closed

| K | Title | PR | Merged | Notes |
|---|---|---|---|---|
| 0005 | [quick] Notation Retry without page reload | https://github.com/pepperhorn/drumlet/pull/35 | 2026-11-27 (d9291cc) | 2 review rounds (opus); owner OK |
| 0001-t6 | Endless notation | https://github.com/pepperhorn/drumlet/pull/36 | 2026-11-27 (23c53b9) | 1 review round (opus); owner OK |
| 0003 | Mobile notation: load feedback, fit to width, onset durations, toggle icon | https://github.com/pepperhorn/drumlet/pull/33 | 2026-11-27 (e480679) | 1 review round (opus; 98 grooves × 1,536 renders); owner OK |
| 0004 | [quick] Auto-follow: ignore vertical wheel | https://github.com/pepperhorn/drumlet/pull/34 | 2026-11-27 (7f31818) | 1 review round (opus); owner OK |
| 0001-t5 | Endless grid + auto-follow | https://github.com/pepperhorn/drumlet/pull/32 | 2026-11-27 (6a6cac0) | 2 review rounds (opus); worst 1.2 ms/step on 1024 pads |
| 0001-t3 | Groove input resolver | https://github.com/pepperhorn/drumlet/pull/31 | 2026-11-27 (21803c6) | 1 review round (opus); nits → S9 |
| 0001-t4 | Transport play-through, loop, seek, global step | https://github.com/pepperhorn/drumlet/pull/30 | 2026-11-27 (aa29ff2) | 2 review rounds (opus); playhead now audio-clock timed |
| 0001-t2 | Share codec v4 — all pages | https://github.com/pepperhorn/drumlet/pull/29 | 2026-11-27 (b45025e) | 2 review rounds (opus); format decided by lead (shared track table) |
| 0001-t1 | Test harness, re-encoded kit, format-aware kit loader | https://github.com/pepperhorn/drumlet/pull/28 | 2026-11-27 (f8c05d6) | 2 review rounds (opus); plan KIT_FALLBACKS amended |
| 0002 | [pr] Hardware look + glowing silicone step pads | https://github.com/pepperhorn/drumlet/pull/27 | 2026-11-27 (3384c8f) | 4 review rounds (codex gpt-6.2-sol); fixes by claude-sonnet-5-5 |

## Suggestions

> Lead-curated ideas: next steps, improvements, code efficiencies, stack changes, risks. Each needs evidence (file:line, a measurement, or a link). Status: `new` · `accepted → NNNN` · `declined: <why>` · `done`. Keep declined rows so they aren't suggested again. A PR mentioned here isn't tracked: only the PR column of Active or Done rows counts.

| S | Kind | Suggestion | Evidence | Effort (S/M/L) | Value | Source | Status |
|---|---|---|---|---|---|---|---|
| S1 | improvement | Raise Steps/Split selector labels to ≥12px desktop | PageTabs.tsx Steps/Split options 10px at md (pre-existing) | S | DESIGN.md min sizes | 0002 return handoff | new |
| S2 | improvement | Raise mobile MPC pad label to ≥14px | MpcPads.tsx `mpc-pad-label` text-[10px] | S | readability on phones | 0002 return handoff | new |
| S3 | next step | Restyle mobile transport + header buttons as keycaps | App.tsx mobile-transport, drumlet-header buttons still flat Tailwind | M | consistent hardware look | PR #27 body | new |
| S4 | improvement | Cache a failed audio format per session so a broken format isn't re-downloaded for every sample | PR #28 review r2 suggestion; src/audio/customKits.ts retry path | S | fewer wasted fetches on broken decoders | 0001-t1 review r2 | new |
| S5 | efficiency | Share one in-flight fetch when the same kit sample is requested twice concurrently | PR #28 review r2 suggestion | S | avoids duplicate downloads on load | 0001-t1 review r2 | new |
| S6 | efficiency | Add Page reuses existing track ids so the v4 encoder can drop position+metadata matching | PR #29 review r2 suggestion; src/state/sequencerReducer.ts ADD_PAGE | S | simpler codec, fewer edge cases | 0001-t2 review r2 | new |
| S7 | improvement | Carry per-track colour in share codes (lost today, pre-existing) | PR #29 review r2; shareCodec decode assigns palette colours by index | S | shared grooves keep their look | 0001-t2 review r2 | new |
| S8 | improvement | Groove mode, loop off: deleting the last page during its final step plays one extra bar before stopping | PR #30 review r2 (non-blocking) | S | correct stop | 0001-t4 review r2 | new |
| S9 | improvement | resolveGroove: accept `&s=` later in the hash (app does), clearer error for sync stock lookup before catalog load, report catalog fetch failure as a load error not `invalid` | PR #31 review r1 nits; src/player/resolveGroove.ts | S | fewer confusing player errors | 0001-t3 review r1 | new |
| S10 | improvement | useAutoFollow: pause only on horizontal wheel, not vertical — scrolling the page past an embedded player currently stops it following | PR #32 review r2; src/components/useAutoFollow.ts wheel handler | S | embedded player keeps following while the host page scrolls | 0001-t5 review r2 | accepted → 0004 |
| S11 | improvement | Step pads need screen-reader names (track, step, velocity) — read as the velocity letter or nothing today (paged grid too) | PR #32 review r2; src/components/Cell.tsx | S | accessibility | 0001-t5 review r2 | accepted → 0008 |
| S12 | improvement | Notation "Still loading" Retry reloads the whole page — on slow phones it throws away the half-done 2.3 MB download and the undo history; retry the import in place instead | PR #33 review r1 | S | better slow-connection UX | 0003 review r1 | accepted → 0005 |
| S13 | improvement | loadNotation caches a failed import, so a failed background prefetch sends the first tap straight to the error card | PR #33 review r1 | S | resilience | 0003 review r1 | accepted → 0005 |
| S14 | improvement | 2/2 with 16th steps: 5- or 7-sixteenth gaps become note + 16th rest (spec-allowed; no stock groove hits it) | PR #33 review r1; src/notation/beatToEvents.ts | S | notation correctness for user patterns | 0003 review r1 | new |
| S15 | risk | `src/notation/renderStaff.test.ts` occasionally times out at the 5 s default under parallel load (seen by implementer and reviewer; passes on rerun) — raise its timeout or share the verovio toolkit across tests | PR #35 review r1 | S | stops flaky verify runs | 0005 review r1 | accepted → 0007 |
| S16 | improvement | Add a `vite:preloadError` listener that reloads only when a deploy has removed a lazy chunk (old tabs after a release) | PR #35 review r1 | S | no dead tabs after deploys | 0005 review r1 | new |
| S17 | improvement | Endless notation >~222 bars: 64-bar chunks show a ~70 px staff break and repeat clef/time sig/bar no. at each join; clip later chunks' opening margin so barlines meet | PR #36 review r1 | S | seamless very long scores (rare) | 0001-t6 review r1 | new |
| S18 | improvement | Notation beat counts never restart per bar (bar 2 counts from "5"; long strips reach 3-digit counts) | PR #36 review r1 (pre-existing on main) | S | readable counts | 0001-t6 review r1 | accepted → 0006 |

Last health scan: never

## Log
<!-- One line per status change, newest first: YYYY-MM-DD NNNN old→new — note -->
2026-11-27 0001 t8 PR #38 head d0388ed (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-420cbbfc-51ed2bd0b49a27aa; 213 tests; one AudioContext per player instance — reviewer asked to judge vs spec "single shared AudioContext"); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t7 PR #37 head 79cd9c0 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-4cbaa03a-006b175ef1b3a193; 198 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0008 implementer blocked on scope: lead approved one-prop Grid.tsx change (beat size → TrackRow) and limiting sub-step tests to the paged grid
2026-11-27 0006/0007/0008 delegated in parallel → codex gpt-6.2-sol (high), base 3939539; threads thread:delegated-task:command%3Amcp%3Ab2ebda65-81ee-4554-a7a1-2b8cd4f6186d%3Adelegate-task%3A000{6,7,8}-impl-r1
2026-11-27 owner accepted S18, S15, S11 → quick items 0006, 0007, 0008 (disjoint Owns with each other and with t7/t8)
2026-11-27 0001 t7 + t8 delegated in parallel → codex gpt-6.2-sol (high), base 9024a38; threads thread:delegated-task:command%3Amcp%3Afbebc0a5-420a-44e6-ae7f-c62cd135f281%3Adelegate-task%3A0001-t7-impl-r1 / …%3A0001-t8-impl-r1
2026-11-27 0001 t6 merged (#36, 23c53b9) + 0005 merged (#35, d9291cc); owner OK; main verify ✓ 194 tests. t7 + t8 handoffs written for parallel dispatch (disjoint Owns)
2026-11-27 0001 t6 review r1 (opus) approved @ 29fd580 (wrapped identical on all 98 grooves; spikes are host noise, not t6); merge needs owner OK. Plan Task 7 note: pass currentGlobalStep -1 when stopped
2026-11-27 0005 fix r2 pushed @ 3fda96a (single module-level lazy loader; 192 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0005 review r1 (opus) approved @ 2f066fe with a minor regression (engine-phase flash on reopen); lead sent fix r2 before merge
2026-11-27 0001 t6 PR #36 head 29fd580 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-69c401c9-856a968687d76c84; 190 tests; p95 0.3–0.4 ms, max 16.5/9.7 ms); review r1 claudeAgent claude-opus-5-5
2026-11-27 0005 dispatched→in-review — PR #35 head 2f066fe (191 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001-t6 + 0005 delegated in parallel → codex gpt-6.2-sol (high), base 9e28762; threads thread:delegated-task:command%3Amcp%3A4fbff63f-c2e0-4e51-b5f0-bfe4e576facd%3Adelegate-task%3A0001-t6-impl-r1 / …%3A0005-impl-r1
2026-11-27 0003 merged (#33, e480679; owner OK; main verify ✓ 188 tests). 0001-t6 + quick 0005 (S12+S13) handoffs written for parallel dispatch (disjoint files)
2026-11-27 0004 merged (#34, 7f31818; owner OK; main verify ✓ 157 tests). Owner: auto-merge line count excludes docs/** (AGENTS.md addendum). 0003 review r1 (opus) approved @ 2ed0f53 — merge needs owner OK
2026-11-27 0004 dispatched→in-review — PR #34 head 83688eb (157 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0003 dispatched→in-review — PR #33 head 2ed0f53 (168 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0004 implementer asked to update EndlessGrid.test.tsx wheel fixture (zero-delta wheel expected to pause); lead granted, Owns extended
2026-11-27 0004 delegated → codex gpt-6.2-sol (high), base 4e16d74; thread thread:delegated-task:command%3Amcp%3Abfd96476-0150-4947-8267-ccd972872757%3Adelegate-task%3A0004-impl-r1
2026-11-27 0001 t5 merged (#32, 6a6cac0; owner OK; main verify ✓ 151 tests). Owner: arrow keys keep pausing auto-follow. 0004 quick (S10 vertical wheel) dispatched
2026-11-27 0001 t5 review r2 (opus) approved @ 1234f91 (re-measured 1 commit/step, worst 1.2 ms); merge needs owner OK
2026-11-27 0001 t5 fix r2 pushed @ 1234f91 (1 commit/step, worst 6.4 ms on 1024 cells; taps keep follow; roving tabindex; 141 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0003 scope change (owner): onset-based note durations replace upright-rest fix; spec/plan/handoff amended d077bf2; steered running implementer
2026-11-27 0003 delegated → codex gpt-6.2-sol (high), base 3b1e73c (added upright rests from owner screenshot); thread thread:delegated-task:command%3Amcp%3A787164b5-6ca8-42b7-a411-c88e199bf534%3Adelegate-task%3A0003-impl-r1
2026-11-27 0003 →dispatched — owner bug report (phone): notation "freeze" = 7.9 MB chunk (2.26 MB compressed) with no feedback; score overflows phone; toggle icon glyph from unloaded font. Must merge before 0001-t6 (same files)
2026-11-27 0001 t3 merged (#31, 21803c6; owner OK; main verify ✓ 137 tests). t5 in-review→changes-requested — opus r1 @ 13fb3f3: 68–189 ms render per playhead step on 8×8 (memo defeated, 3 commits/step); tap pauses auto-follow against spec. Fix r2 sent (target ≤1 commit, ≤10 ms/step). Plan notes added to Task 6 (reuse pattern) and Task 9 (Cell viewport breakpoints)
2026-11-27 0001 t3 review r1 (opus) approved @ 5a77841; merge needs owner OK
2026-11-27 0001 t5 PR #32 head 13fb3f3 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-39830e8f-8bfb427f8dedb40a); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t3 PR #31 head 5a77841 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-530fb0b0-98c68d0755ed593d); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t3 + t5 delegated in parallel → codex gpt-6.2-sol (high), base 95c8916; threads thread:delegated-task:command%3Amcp%3A3b15e043-5d66-4160-ba33-951ceee08f1a%3Adelegate-task%3A0001-t3-impl-r1 / …%3A0001-t5-impl-r1
2026-11-27 0001 t4 merged (#30, aa29ff2; owner OK; main verify ✓ 127 tests) — t3 + t5 handoffs written for parallel dispatch
2026-11-27 0001 t2 merged (#29, b45025e; owner OK; main verify ✓ 104 tests). t4 review r2 (opus) approved @ 5c2eb60 — merge needs owner OK. Review notes for t7/t8: hide stray playhead via currentPlayPage; extract mode-switch/page-removal rules into a tested helper
2026-11-27 0001 t2 review r2 (opus) approved @ 071f014; merge needs owner OK (share format is public, >50 lines)
2026-11-27 0001 t4 fix r2 pushed @ 5c2eb60 (mode-switch sync, cursor clamp/stop, unified audio-clock playhead; 115 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0001 t2 fix r2 pushed @ 071f014 (shared track table; 4-bar URL median 900 / max 1,515; 8-bar max 2,262); review r2 claudeAgent claude-opus-5-5
2026-11-27 0001 t4 in-review→changes-requested — opus r1 @ 8bbe9d6: groove→paged switch plays wrong page; removed page under cursor stalls playback. Lead: view follows audio on mode switch; clamp cursor, stop+onEnded at zero pages. Fix r2 sent
2026-11-27 0001 t2 in-review→changes-requested — opus r1 @ 4756f09: per-page track ids break engine cache (blocking); lead decision: v4 uses shared track table + per-page step strings (plan Task 2 amended), chainMode on for multi-page; fix r2 sent
2026-11-27 0001 t4 PR #30 head 8bbe9d6 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-eeb54834-d9f137a9d21066a6); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t2 PR #29 head 4756f09 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-34002d3d-f46d07781c04ab9f); review r1 claudeAgent claude-opus-5-5. t4 still implementing
2026-11-27 0001 t2 + t4 delegated in parallel → codex gpt-6.2-sol (high), base a947869; threads thread:delegated-task:command%3Amcp%3A066d5e40-7895-4940-a3bb-f3084117f784%3Adelegate-task%3A0001-t2-impl-r1 / …%3A0001-t4-impl-r1
2026-11-27 0001 t1 merged (#28, f8c05d6; owner OK; main verify ✓ 92 tests) — t2 + t4 handoffs written for parallel dispatch
2026-11-27 0001 in-review→ready — t1 review r2 (opus) approved @ 5e09ee8; merge needs owner OK (dev deps, size)
2026-11-27 0001 changes-requested→in-review — t1 fix pushed @ 5e09ee8 (12-rule fallback, 92 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0001 in-review→changes-requested — t1 review r1 (opus) @ 2aeae39: kit fallback maps app hihat-* groups to kick (plan table was wrong; plan Task 1 KIT_FALLBACKS amended); fix r2 sent to implementer thread
2026-11-27 0001 dispatched→in-review — t1 PR #28 head 2aeae39 (codex gpt-6.2-sol); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t1 delegated → codex gpt-6.2-sol (reasoningEffort high), base c585c5e
2026-11-27 0001 planned→dispatched — t1 handoff written (base 3384c8f)
2026-11-27 0002 in-review→merged→closed — codex r4 approved @ 570581f1; squash-merged 3384c8f; main verify typecheck/lint/build ✓
2026-11-27 0002 changes-requested→in-review — fix r2 pushed at 570581f1 (::after markers, label sizes); review r4 codex gpt-6.2-sol
2026-11-27 0002 in-review→changes-requested — codex r3 @ 0080528: r2 findings verified fixed; new 1×P2 (split-master focus hidden by marker outline) + 1×P3 (Notation/TAP/CLEAR/Page tab sizes); fix r2 sent to same implementer thread
2026-11-27 0002 changes-requested→in-review — fix r1 pushed at 00805286 (all 5 findings + body rule); review r3 codex gpt-6.2-sol
2026-11-27 0002 fix r1 dispatched → claudeAgent claude-sonnet-5-5 (effort high)
2026-11-27 0002 in-review→changes-requested — codex r2: 4×P2 (knob→BPM shortcut leak, hidden selection/split rings, hidden focus rings, theme-extension contract) + 1×P3 (label sizes); fix handoff docs/handoffs/2026-11-27-0002-review-fixes--lead-to-claude.md
2026-11-27 0002 review r1 ended unreviewed (child hit a setup prompt: worktree came from a pre-#26 checkout); r2 launched from main
2026-11-27 0002 →in-review — adopted PR #27 (pre-orch, Claude-authored); review r1 codex gpt-6.2-sol at 5535f51
2026-11-27 — PR #26 merged (ph-orch setup + 0001 spec/plan); main ruleset now has admin-role bypass for lead docs pushes
2026-11-27 0001 proposed→planned — spec approved by owner; plan approved; prerequisites: PR #26 (ph-orch setup), PR #27 (hardware pads)
