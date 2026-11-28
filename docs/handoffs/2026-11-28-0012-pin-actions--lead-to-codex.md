# Handoff: 0012 — [quick] Pin workflow actions to commit SHAs (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0012 · **Spec:** none (quick; owner accepted ledger S34) · **Plan:** none
- **Branch:** orch/0012-pin-actions · **Worktree:** created by T3
- **Base commit:** aea44ca
- **Status:** open

## Goal
Pin every `uses:` in `.github/workflows/ci.yml` and `.github/workflows/release-player.yml` (`actions/checkout@v7`, `actions/setup-node@v7`, and any others) to full 40-char commit SHAs with the version as a trailing comment (e.g. `actions/checkout@<sha> # v7.x.y`). Resolve each SHA from the action's GitHub release tag (`gh api repos/actions/checkout/git/ref/tags/<tag>` → peel annotated tags to the commit). Also set `persist-credentials: false` on checkout in the release job if nothing later needs git push. (Tag protection for `player-v*` was already added by the lead as a repository ruleset.)

## Files you own
`.github/workflows/ci.yml`, `.github/workflows/release-player.yml`.

Parallel quick items right now (disjoint files): 0011 owns `src/App.tsx` (prefetch block) + `src/components/notationPrefetch.ts`; 0012 owns `.github/workflows/**`; 0013 owns `src/notation/**` + `src/components/NotationView.tsx`. Touch nothing else; note needs in your return handoff.

## Acceptance criteria
- [ ] No `uses:` left on a mutable tag/branch; each SHA verified to be the commit for the commented version.
- [ ] `npx actionlint` (or the actionlint Docker image) clean; CI passes on the PR.
- [ ] Contextual class names on any new element; no behaviour change outside the goal.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```


---
## Receiver ack

I’ll pin every action reference in the two owned workflows to a verified release commit and keep checkout credentials disabled in the release job. I’ll run the handoff checks and actionlint, then open a draft PR for the lead. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
