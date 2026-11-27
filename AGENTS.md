<!-- ph-orch:begin v6 — managed by orch-init; customise via .ph-orch.json, edit outside these markers, or re-run orch-init to upgrade -->
# Agent Operating Manual

Every agent working in this repo (Claude, Codex, or anything else) reads this first.
It covers where things live, who does what, and the words that trigger a protocol.

## 1. Where things live

| What | Path | Who writes it |
|---|---|---|
| Doc index (start here) | `docs/README.md` | lead |
| Specs (what and why) | `docs/specs/NNNN-<slug>.md` | lead |
| Plans (how, task breakdown) | `docs/plans/NNNN-<slug>.md` | lead |
| Handoffs (shared understanding between agents) | `docs/handoffs/YYYY-MM-DD-K-<slug>--<from>-to-<to>.md` | whoever is handing over |
| Decisions (ADRs) | `docs/decisions/<next free number>-<slug>.md` (their own numbering) | lead; implementers propose them in their return handoff |
| **WIP ledger** | `docs/wip/LEDGER.md` | **lead only, on `main`** |
| Cross-project memory | **GBrain** (MCP), see §8 | everyone reads; lead writes |
| Templates | `_TEMPLATE.md` in each folder | — |

`NNNN` is the work-item ID from the ledger, e.g. `0007`. The **task key** `K` is `NNNN` for a single-task item, or `NNNN-tN` for task N of a multi-task plan, e.g. `0007-t2`. Keys tie the spec, plan, handoffs, branch, PR, worktree, and port together.

Before starting any work, read the ledger and every doc linked from your ledger row or handoff. If a doc you were pointed at doesn't exist, stop and say so. Don't guess.

## 2. Roles

Any capable model can hold any role. Which one you are depends on where you're running and what your brief says, not on which model you are.

- **Lead** (Claude Opus or Codex, in the **main checkout**): talks with the human, writes specs and plans, records decisions, dispatches work, runs reviews, merges PRs, and owns the ledger and the GBrain write-back. It never writes code on the main checkout. Its playbooks are the `orch-dispatch` and `orch-sweep` skills.
- **Implementer** (in its **own worktree**): carries out one plan task within its declared scope, opens a PR, and hands back.
- **Reviewer** (the **other model family** from the implementer): reviews the PR against the spec, the plan, and the acceptance criteria. It never edits code. It follows the `orch-review` skill.

### What the lead does inline, and what it dispatches

The lead does these itself:
- edits docs: specs, plans, handoffs, ADRs, the ledger, `AGENTS.md`, `CLAUDE.md`, `.ph-orch.json`
- runs `git` and `gh` commands (commit and push docs, review state, merge)
- reads code, searches, and runs read-only commands, such as the verify command on `main` after a merge

Everything else is a task, however small: a one-line fix, a refactor, a dependency bump, a test that needs fixing. Dispatch it. Small things go through the **quick lane** (`orch-dispatch`, "Quick lane"). Hooks enforce this in the lead's checkout: `lead-guard` denies edits outside the lead's paths and pushes of code commits, `lead-post` flags any code a shell command changed or committed, and `lead-stop` stops the lead ending its turn while the ledger has work waiting on it.

### Routing (customise in `.ph-orch.json`; T3 `delegate_task` targets)

| Role | providerInstanceId | model | options |
|---|---|---|---|
| implement (default) | codex | latest:sol | {"reasoningEffort":"high"} |
| implement (alt) | claudeAgent | latest:sonnet | {"effort":"high"} |
| review Codex-family work | claudeAgent | latest:opus | {"effort":"high"} |
| review Claude-family work | codex | latest:sol | {"reasoningEffort":"high"} |

**`latest:<family>`** (e.g. `latest:sol`, `latest:sonnet`, `latest:opus`) tracks the newest model in that family; any other value is a pinned id, used as is. Whoever starts a `delegate_task` from this table resolves it once per dispatch round: call `orchestrator_capabilities` with `search: "<family>"` and take the first model listed for that row's providerInstanceId (the catalog lists newest first). Pass the resolved id as `model` and record it wherever the model is already recorded (ledger log line, PR, handoff). If nothing matches, or the resolved model doesn't list an option value from the row's options, stop and tell the human. Don't fall back or guess.

If an instance isn't available, check `orchestrator_capabilities` and use the nearest equivalent. Never review work with the same model family that implemented it.

**T3 tools** come from the `t3-code` MCP server. They may be named `delegate_task`, `mcp__t3_code__delegate_task`, or (in Codex code mode) `tools.mcp__t3_code__delegate_task(...)`. They're the same tools.

## 3. Trigger vocabulary — "hand over" / "handoff"

When anyone (human or agent) says **"hand over"**, **"handover"**, **"hand off"**, **"handoff"**, **"hand this to …"**, or **"handoff to …"**, it means:

> Write a handoff doc in `docs/handoffs/` from `_TEMPLATE.md`, commit it, and refer to it by path.
> The receiving agent's understanding comes from that doc and the docs it links. It never comes from chat history.

Rules:
1. Self-contained: assume the receiver has no conversation context.
2. Link to specs, plans, and ADRs instead of copying them. Copy only what's needed to remove ambiguity.
3. Always fill in: goal, scope (in and out), files owned, acceptance criteria, verification commands, open questions, and the branch, worktree, or PR.
4. Commit it **before** dispatching. Worktrees are created from the last local commit, so uncommitted docs won't be there.
5. **Acknowledgement depends on your role.** An *implementer* first restates its understanding in the handoff's "Receiver ack" section and commits it on its branch, or writes `Blocked: …` there. A *reviewer* never edits files: its acknowledgement is the opening of its PR review comment. The *lead* acknowledges return handoffs through the ledger.
6. Finishing work is also a handoff (the "return handoff"): the implementer writes `…--<impl>-to-lead.md` on its branch.

Related words: **"park"** means write a handoff addressed to `future` and set the ledger row to `parked`. **"ledger"** always means `docs/wip/LEDGER.md`. **"the brain"** / **"GBrain"** means §8.

## 4. Worktrees and PRs — never share a checkout

- The main checkout (`main`) is for the lead, and only for docs and the ledger.
- Every implementation task runs in its **own worktree on its own branch**: `orch/K-<slug>`. One agent per worktree, always.
- Parallel tasks must own **disjoint files**, as declared in the plan. If you need to touch a file you don't own, stop and note it in your return handoff. Don't edit it.
- Every implementer **also owns its own handoff files** for its task key `K`: the ack section of its dispatch handoff, and its `…-K-…--<impl>-to-lead.md` return handoff. It owns no other docs.
- **Code reaches `main` only through a PR**: implementer opens it → reviewer reviews it → lead merges it. Docs and ledger commits by the lead go straight to `main`.
- Implementers push only their own branch (`git push -u origin orch/K-<slug>`) and open a **draft PR** against `main`. Never merge, never push to `main`, never rebase someone else's branch.
- All agents share one GitHub account, and GitHub won't let an account approve or request changes on its own PR. Reviewers post `gh pr review --comment` with a verdict line. The verdict is what decides the outcome, not GitHub's approval state.
- Worktrees don't get untracked files such as `.env`. The setup is: `npm ci; no secrets required for local checks (Directus auth hits apps.pepperhorn.com at runtime). For any .env needs, use the shared-env skill and confirm dev or prod with the user; never copy secrets into source.`.
- Dev servers in worktrees use the port from the handoff (`5200 + NNNN*10 + N`, where N = 0 for a single-task item), always with `--host 0.0.0.0`.

## 5. Ledger rules

- Only the lead edits the ledger, and only on `main`. This avoids merge conflicts across worktrees.
- Implementers report status (and their PR URL) through their return handoff. The lead copies it into the ledger.
- Status flow: `proposed → specced → planned → dispatched → in-review → changes-requested → ready → merged → closed`, plus `blocked` and `parked`. Quick items (`[quick]`) skip spec and plan: `proposed → dispatched → in-review → ready → merged → closed`.
- **Waiting on** says who has the next move: `child <taskId>`, `review <taskId>`, `ci`, `human: <why>`, or `lead: <next action>`. The lead sets it on every status change. A row needs the lead when Waiting on starts with `lead`, or when it's empty and the status is dispatched, in-review, changes-requested, ready, or merged. `blocked` and `parked` rows never need the lead.

## 5a. Autonomy (lead)

- **Look it up, don't ask to.** Never ask permission for read-only investigation: just do it, then report what you found. That includes GBrain, this repo, sibling local checkouts (e.g. `ls ~/.t3/projects`), other GitHub repos (`gh repo list <owner>`, `gh search code`, `gh api repos/<o>/<r>/contents/<path>`), installed package source (`node_modules/<pkg>`), and public docs. If it's broad, hand it to a read-only research subagent. "Shall I go and look at X?" is never a question for the human.
- **Ask only what's theirs to decide**: product, design, or scope choices the code and docs can't settle. Research first so the question is informed, give your recommendation and the options, and batch the questions in one message. Keep researching anything that isn't blocked by the answer while you wait.
- **Suggest, with evidence.** Keep the ledger's Suggestions table current: next steps, improvements, code efficiencies, better libraries or stack, and risks. Sources are reviewer suggestions, implementer follow-ups, the health scan in `orch-sweep`, and anything you notice while reading code. Every suggestion cites evidence (file:line, a measurement, a benchmark or doc link) and gives effort and value. Don't re-suggest a declined one unless something has changed, and say what.
- **Suggesting isn't doing.** A suggestion becomes work only when the human accepts it (it then gets a `proposed` row), except a small efficiency or fix with clear evidence that fits the quick lane and §5a's merge limits. Stack, dependency, architecture, and API changes always wait for the human.
- **End reports with next steps.** After a merge, a sweep, or a status report, close with up to 3 top suggestions (new or still open), each with one line of why and your recommendation. No suggestions is fine. Filler isn't.
- **Be proactive.** When nothing is in flight, or at the start of a session, run `orch-sweep`: act on ledger rows that need you, adopt open PRs that aren't in the ledger, and turn small, clear fixes into quick items.
- **Merge without asking** only when all of these hold: `AUTO_MERGE` is `small` (this repo: `small`); the review verdict is approve; every check passes on the reviewed head; the diff is at most 50 changed lines; and it doesn't touch schema or migrations, public APIs, dependencies, CI or infra, or auth and secrets.
- Anything else: ask the human, and set Waiting on to `human: <why>`.
- Never close someone else's PR or issue without asking.

## 6. Definition of done (implementer)

- [ ] Acceptance criteria in the handoff are met
- [ ] Verification commands pass: `npm run typecheck && npm run lint && npm run build`
- [ ] Only the files you own were changed (`git diff --stat main...HEAD`)
- [ ] `orch-deslop` run on the diff and your prose, and verify re-run after it
- [ ] Return handoff written and committed on your branch
- [ ] Branch pushed and draft PR opened; its body links the handoffs and pastes the verification output
- [ ] No unrecorded decisions: anything non-obvious goes in the return handoff's "Decisions made" section

## 7. Escalate, don't improvise

First resolve what you can yourself: read the code, linked repos, packages, docs, and GBrain (§5a "Look it up"). Escalate only what's left. If the spec is still ambiguous, the plan is wrong, or scope needs to grow: stop, write the question into the return handoff, set it to `blocked`, and finish. A short honest handback is better than a confident wrong one.

## 8. GBrain (cross-project memory)

The repo docs are the **source of truth** for this project. GBrain is the **memory across projects and sessions**.

- **Everyone reads.** Before speccing, planning, or starting a task, search GBrain for this project (drumlet), the people involved, related past decisions, and known gotchas. Cite page names you used in your handoff.
- **The lead writes**, at these points:
  - spec approved → a project page entry
  - ADR accepted → a decision page
  - PR merged → an outcome summary with links to the spec, ADR, and PR
  - lessons learned → a gotchas page

  One page per idea. Link back to the repo paths and the PR URL. Don't paste whole docs.
- **Implementers and reviewers don't write to GBrain.** They put anything worth remembering under "Decisions made" or "Follow-ups" in their return handoff, and the lead promotes it.
- **Never** write secrets, tokens, `.env` values, or customer data to GBrain.
- If GBrain isn't available in your session, say so in your handoff (`GBrain: unavailable`) and carry on.
<!-- ph-orch:end -->
