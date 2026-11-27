# Plan NNNN — <Title>

- **Spec:** ../specs/NNNN-<slug>.md
- **Base:** <main branch> @ <commit>
- **Verification (whole item):** `<cmd>`

## Approach
<!-- A short architecture sketch. Link any ADRs. -->

## Tasks
<!-- Each task goes to one worktree and one implementer. Owned files must not overlap between tasks that run in parallel. -->

### T1 — <name>
- **Depends on:** —
- **Route:** implement (default) | implement (alt)
- **Owns:** `src/foo/**`, `tests/foo/**`
- **May read:** anything
- **Acceptance:** AC1, AC2 (from the spec) + task-specific checks
- **Verify:** `<cmd>`
- **Notes / gotchas:**

### T2 — <name>
- **Depends on:** T1

## Merge order
T1 → T2

## Risks
