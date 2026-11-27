# WIP Ledger

> Single writer: the **lead**, on the main branch only. Implementers report status through their return handoff.
> Status: proposed · specced · planned · dispatched · in-review · changes-requested · ready · merged · closed · blocked · parked
> Waiting on: `child <taskId>` · `review <taskId>` · `ci` · `human: <why>` · `lead: <next action>`. Set it on every status change. A row needs the lead when it starts with `lead`, or when it's empty and Status is dispatched, in-review, changes-requested, ready, or merged. The lead's Stop hook won't let the lead end its turn while any row needs it.
> Type: normal items have a spec and plan. Quick items have the title prefix `[quick]` (no spec or plan, a short handoff). PRs adopted by `orch-sweep` have the prefix `[pr]`.

Next ID: 0003

## Active

| K | Title | Status | Waiting on | Owner (provider/model) | Branch | PR | Worktree | T3 task/thread | Spec | Plan | Latest handoff | Updated |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0001 | Drumlet Player (embeddable component) + endless view | in-review | review 0001-t2-review-r2 (t2 #29), review 0001-t4-review-r2 (t4 #30) | codex/gpt-6.2-sol (t1) | orch/0001-t2-share-v4, orch/0001-t4-play-through | https://github.com/pepperhorn/drumlet/pull/29, https://github.com/pepperhorn/drumlet/pull/30 | /home/shaun/.t3/worktrees/drumlet/t3-2afd6bc2-3454cab65970f66a | t1 thread: thread:delegated-task:command%3Amcp%3A7e96baca-8201-49c3-af48-c6e3aea92013%3Adelegate-task%3A0001-t1-impl-r1 | docs/specs/0001-drumlet-player.md | docs/plans/0001-drumlet-player.md | docs/handoffs/2026-11-27-0001-t1-kit-loader--codex-to-lead.md @ 5e09ee8 | 2026-11-27 |

## Done / closed

| K | Title | PR | Merged | Notes |
|---|---|---|---|---|
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

Last health scan: never

## Log
<!-- One line per status change, newest first: YYYY-MM-DD NNNN old→new — note -->
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
