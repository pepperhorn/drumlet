# WIP Ledger

> Single writer: the **lead**, on the main branch only. Implementers report status through their return handoff.
> Status: proposed · specced · planned · dispatched · in-review · changes-requested · ready · merged · closed · blocked · parked
> Waiting on: `child <taskId>` · `review <taskId>` · `ci` · `human: <why>` · `lead: <next action>`. Set it on every status change. A row needs the lead when it starts with `lead`, or when it's empty and Status is dispatched, in-review, changes-requested, ready, or merged. The lead's Stop hook won't let the lead end its turn while any row needs it.
> Type: normal items have a spec and plan. Quick items have the title prefix `[quick]` (no spec or plan, a short handoff). PRs adopted by `orch-sweep` have the prefix `[pr]`.

Next ID: 0003

## Active

| K | Title | Status | Waiting on | Owner (provider/model) | Branch | PR | Worktree | T3 task/thread | Spec | Plan | Latest handoff | Updated |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0002 | [pr] Hardware look + glowing silicone step pads | in-review | review pr27-review-r1 | claudeAgent/claude-opus-5-5 | feat/hardware-pads | https://github.com/pepperhorn/drumlet/pull/27 | — | review: codex gpt-6.2-sol @ 5535f51 | — | — | — | 2026-11-27 |
| 0001 | Drumlet Player (embeddable component) + endless view | planned | review pr27-review-r1 (prereq #27 must merge before t1) | — | — | — | — | — | docs/specs/0001-drumlet-player.md | docs/plans/0001-drumlet-player.md | — | 2026-11-27 |

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
2026-11-27 0002 →in-review — adopted PR #27 (pre-orch, Claude-authored); review r1 codex gpt-6.2-sol at 5535f51
2026-11-27 — PR #26 merged (ph-orch setup + 0001 spec/plan); main ruleset now has admin-role bypass for lead docs pushes
2026-11-27 0001 proposed→planned — spec approved by owner; plan approved; prerequisites: PR #26 (ph-orch setup), PR #27 (hardware pads)
