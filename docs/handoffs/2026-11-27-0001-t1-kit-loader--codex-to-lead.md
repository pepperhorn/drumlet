# Handoff: 0001-t1 — Kit loader and test harness (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Plan, Task 1](../plans/0001-drumlet-player.md#task-1-test-harness-re-encoded-kit-format-aware-kit-loader)
- Branch: `orch/0001-t1-kit-loader`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-2afd6bc2-3454cab65970f66a`
- PR: [Draft PR for this branch](https://github.com/pepperhorn/drumlet/pulls?q=is%3Apr+head%3Aorch%2F0001-t1-kit-loader)
- Base: `3384c8f` (audio sources) · `c585c5e` (dispatch)
- Port: 5211 (stopped)
- Status: open for review

## Goal and scope

Ship the approved acoustic1 variant B, one-format loading under a configurable base URL, nearest-voice fallback for kit tracks, and a Vitest/jsdom harness. The [dispatch handoff](2026-11-27-0001-t1-kit-loader--lead-to-codex.md) lists the owned files. The branch changes only those files and the two handoffs. The ledger, other audio sources, transport, player package, share codec, and UI are unchanged.

## Acceptance and evidence

- 19 tests pass. They cover the default and overridden URLs, both format choices, exact and fallback keys, decode and cache reuse, and sample fetch rejection and HTTP errors.
- The kit contains 14 Vorbis files (334,932 bytes total) and 14 AAC files (313,439 bytes total). The manifest adds only `formats`. All 28 files byte-match a regeneration from `3384c8f` with FFmpeg 8.1.3. FFprobe confirmed 44.1 kHz, the specified channel layout, and all four trimmed tails.
- Chromium loaded Basic 8th-Note Rock through the stock Library. Four `.ogg` samples returned HTTP 200. The running audio graph scheduled 11 sample starts and reached a peak of 0.436.
- With the Vorbis capability probe forced to return unsupported and external HTTPS blocked, a share fixture with only the missing `snare-rim` voice fetched `acoustic-SnareOn1.m4a` (HTTP 200). The graph scheduled three starts and reached a peak of 0.164. Neither run fetched the unused format or logged a playback error.
- The browser check measured audio output. It did not compare the result by ear with the A/B page or run on Safari hardware.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
orig_dir=$(mktemp -d)
out_dir=$(mktemp -d)
git archive 3384c8f public/samples/acoustic1 | tar -x -C "$orig_dir"
bash scripts/encode-acoustic-kit.sh "$orig_dir/public/samples/acoustic1" "$out_dir"
du -cb "$out_dir"/*.ogg | tail -1
npm run dev -- --host 0.0.0.0 --port 5211
```

Verification after orch-deslop:

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 1.85s
 Test Files  1 passed (1)
      Tests  19 passed (19)
334932  total
313439  total
28 regenerated files byte-match
```

Vitest also passed on Node 22.22.1. Lint reports the two existing `AuthModal.tsx` hook warnings. The build reports the Verovio externalization and chunk-size warnings. npm audit returned the same 19 packages and severity counts as the pinned base.

## Decisions and known gotchas

- The loader keys its manifest and buffer cache by kit directory URL so the same kit ID under two bases cannot reuse the wrong assets. Manifests without `formats` keep the filename they declare.
- An exact manifest key wins. If a legacy kit lacks both the nearest voice and kick, the loader uses its first available voice. The browser selects one format before fetching. Fetch and decode errors still reject to the caller.
- GBrain: `projects/drumlet` confirms the repository, protected-main workflow, and prior verification baseline. The spec, plan, and dispatch govern this task.

## Open questions

None. A listening comparison against the owner’s A/B page and playback on Safari remain unverified.

## Return

- Outcome: done, ready for review
- Commits: `9d5e1fd` receiver acknowledgment and `4bb436d` implementation
- Follow-ups: review Task 1 before releasing dependent Tasks 2 and 4.
