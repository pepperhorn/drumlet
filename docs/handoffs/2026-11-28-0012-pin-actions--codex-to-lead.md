# Handoff: 0012 — Pin workflow actions to commit SHAs (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0012 · Spec: none · Plan: none
- Dispatch: [Lead handoff](2026-11-28-0012-pin-actions--lead-to-codex.md)
- Branch: `orch/0012-pin-actions`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-99ddf924-be19fd26e9e086ca`
- Base: `aea44ca`, with dispatch committed at `b4780a1`
- Implementation: `b8eb938e84d8f3287a0be3670db7fae1a9c3dcbb`
- Outcome: implementation and local checks complete. Draft PR opens after this handoff is committed.

## Scope and acceptance

Pinned all four `uses:` references in `.github/workflows/ci.yml` and `.github/workflows/release-player.yml`. The pins match the original `v7` commits. Both workflows already set `persist-credentials: false` on checkout. Replacing the pins with their original refs reproduces both files byte for byte. No other behavior, files outside scope, tags, or rulesets changed.

| Action | Commit SHA | Release |
| --- | --- | --- |
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) |
| `actions/setup-node` | `949feb2413d6458794dcd2491c4babbbce0c15c1` | [v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0) |

For each action, `gh api repos/actions/<action>/git/ref/tags/<version>` returned a commit object directly. No annotated tags needed peeling. The `v7` ref resolved to the same SHA, and `gh api repos/actions/<action>/git/commits/<sha>` returned that commit.

## Verification

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
docker run --rm --network none -v "$PWD:/repo:ro" -w /repo \
  rhysd/actionlint:1.7.11 .github/workflows/ci.yml .github/workflows/release-player.yml
git diff --check
```

```text
npm ci: added 279 packages
npm run typecheck: exit 0
npm run lint: 0 errors, 2 warnings in AuthModal.tsx
npm run build: built in 3.51s
npm test: 21 test files passed, 256 tests passed
actionlint 1.7.11: exit 0, no diagnostics
```

The orch-deslop pass found nothing to remove. The same verification passed again after that pass. The install reported dependency audit and install-script warnings. No dependency files changed.

## Open questions and follow-ups

No implementation questions. The lead can confirm GitHub CI and review on the draft PR. The release job was linted locally. No tag was pushed and no publish was run.

## Project context

GBrain: [default:projects/drumlet] documents the tag-triggered trusted npm publishing flow. The workflow and dispatch handoff define this change.
