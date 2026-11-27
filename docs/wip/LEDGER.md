# WIP Ledger

> Single writer: the **lead**, on the main branch only. Implementers report status through their return handoff.
> Status: proposed · specced · planned · dispatched · in-review · changes-requested · ready · merged · closed · blocked · parked
> Waiting on: `child <taskId>` · `review <taskId>` · `ci` · `human: <why>` · `lead: <next action>`. Set it on every status change. A row needs the lead when it starts with `lead`, or when it's empty and Status is dispatched, in-review, changes-requested, ready, or merged. The lead's Stop hook won't let the lead end its turn while any row needs it.
> Type: normal items have a spec and plan. Quick items have the title prefix `[quick]` (no spec or plan, a short handoff). PRs adopted by `orch-sweep` have the prefix `[pr]`.

Next ID: 0003

## Active

| K | Title | Status | Waiting on | Owner (provider/model) | Branch | PR | Worktree | T3 task/thread | Spec | Plan | Latest handoff | Updated |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0002 | [pr] Hardware look + glowing silicone step pads | changes-requested | child 0002-impl-r2 | claudeAgent/claude-sonnet-5-5 (fix r1) | feat/hardware-pads (local feat/hardware-pads-r1) | https://github.com/pepperhorn/drumlet/pull/27 | /home/shaun/.t3/worktrees/drumlet/t3-71b68fc0-ad07b5ab60a0ee36 | impl r1 thread: thread:delegated-task:command%3Amcp%3A7e96baca-8201-49c3-af48-c6e3aea92013%3Adelegate-task%3A0002-impl-r1 | — | — | docs/handoffs/2026-11-27-0002-review-fixes--claude-to-lead.md @ 0080528 | 2026-11-27 |
| 0001 | Drumlet Player (embeddable component) + endless view | planned | child 0002-impl-r2 (prereq #27 must merge before t1) | — | — | — | — | — | docs/specs/0001-drumlet-player.md | docs/plans/0001-drumlet-player.md | — | 2026-11-27 |

## Done / closed

| K | Title | PR | Merged | Notes |
|---|---|---|---|---|

## Suggestions

> Lead-curated ideas: next steps, improvements, code efficiencies, stack changes, risks. Each needs evidence (file:line, a measurement, or a link). Status: `new` · `accepted → NNNN` · `declined: <why>` · `done`. Keep declined rows so they aren't suggested again. A PR mentioned here isn't tracked: only the PR column of Active or Done rows counts.

| S | Kind | Suggestion | Evidence | Effort (S/M/L) | Value | Source | Status |
|---|---|---|---|---|---|---|---|

Last health scan: never

## Log
<!-- One line per status change, newest first: YYYY-MM-DD NNNN old→new — note -->
2026-11-27 0002 in-review→changes-requested — codex r3 @ 0080528: r2 findings verified fixed; new 1×P2 (split-master focus hidden by marker outline) + 1×P3 (Notation/TAP/CLEAR/Page tab sizes); fix r2 sent to same implementer thread
2026-11-27 0002 changes-requested→in-review — fix r1 pushed at 00805286 (all 5 findings + body rule); review r3 codex gpt-6.2-sol
2026-11-27 0002 fix r1 dispatched → claudeAgent claude-sonnet-5-5 (effort high)
2026-11-27 0002 in-review→changes-requested — codex r2: 4×P2 (knob→BPM shortcut leak, hidden selection/split rings, hidden focus rings, theme-extension contract) + 1×P3 (label sizes); fix handoff docs/handoffs/2026-11-27-0002-review-fixes--lead-to-claude.md
2026-11-27 0002 review r1 ended unreviewed (child hit a setup prompt: worktree came from a pre-#26 checkout); r2 launched from main
2026-11-27 0002 →in-review — adopted PR #27 (pre-orch, Claude-authored); review r1 codex gpt-6.2-sol at 5535f51
2026-11-27 — PR #26 merged (ph-orch setup + 0001 spec/plan); main ruleset now has admin-role bypass for lead docs pushes
2026-11-27 0001 proposed→planned — spec approved by owner; plan approved; prerequisites: PR #26 (ph-orch setup), PR #27 (hardware pads)
