# Handoff: 0001-t1 — Kit loader and test harness (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Amended Task 1 plan](https://github.com/pepperhorn/drumlet/blob/9e56389/docs/plans/0001-drumlet-player.md#task-1-test-harness-re-encoded-kit-format-aware-kit-loader)
- Branch: `orch/0001-t1-kit-loader`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-2afd6bc2-3454cab65970f66a`
- PR: [#28](https://github.com/pepperhorn/drumlet/pull/28)
- Base: `3384c8f` (audio sources) · `c585c5e` (dispatch)
- Port: 5211 (stopped)
- Status: open for review

## Goal and scope

Ship the approved acoustic1 variant B, format selection under a configurable base URL, nearest-voice fallback for kit tracks, and a Vitest/jsdom harness. The [dispatch handoff](2026-11-27-0001-t1-kit-loader--lead-to-codex.md) lists the owned files. The branch changes only those files and the two handoffs. The ledger, other audio sources, transport, player package, share codec, and UI are unchanged.

## Review fix

The original fallback checked only `hh` and `hat` prefixes. It sent the app’s `hihat-closed`, `hihat-close`, `hihat-open`, and `mid-tom` groups to kick, and `hhopen` to closed hat. The loader now follows the 12 rules in amended Task 1 at `9e56389`. An exact key wins. When a rule’s target is missing, the loader keeps looking through the table. The [review](https://github.com/pepperhorn/drumlet/pull/28#pullrequestreview-6082790967) prompted the amendment.

The first format probe runs lazily once per module. A decode error triggers one fetch and decode of the other advertised format. Network, HTTP, and body-read errors do not trigger a retry. A successful alternate decode enters the sample cache without changing the preferred format for other samples. The encoder no longer expands an empty array under Bash’s nounset option.

## Acceptance and evidence

- 92 tests pass. The table test checks all 51 distinct names in `COMMON_GROUPS` and `MACHINE_GROUPS`. Every name resolves to a kit voice, and only kick groups resolve to kick. The expanded suite reproduced 39 failures against the original implementation.
- The format tests cover one probe across multiple samples, retries in both directions, cache reuse, and propagation when no alternate is available.
- The kit contains 14 Vorbis files (334,932 bytes total) and 14 AAC files (313,439 bytes total). The manifest adds only `formats`. All 28 files byte-match regeneration from `3384c8f` with FFmpeg 8.1.3 under both Bash 5 and GNU Bash 3.2.0 on Linux. The previous script failed under Bash 3.2 with `filters[@]: unbound variable`. FFprobe confirmed 44.1 kHz, the specified channel layout, and all four trimmed tails.
- Before the review fix, Chromium loaded Basic 8th-Note Rock through the stock Library. Four `.ogg` samples returned HTTP 200. The running audio graph scheduled 11 sample starts and reached a peak of 0.436.
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
✓ built in 1.82s
 Test Files  1 passed (1)
      Tests  92 passed (92)
334932  total
28 regenerated files byte-match
28 Bash 3.2 outputs byte-match
```

The initial implementation also passed Vitest on Node 22.22.1. Lint reports the two existing `AuthModal.tsx` hook warnings. The build reports the Verovio externalization and chunk-size warnings. npm audit returned the same 19 packages and severity counts as the pinned base.

## Decisions and known gotchas

- The loader keys its manifest and buffer cache by kit directory URL so the same kit ID under two bases cannot reuse the wrong assets. Manifests without `formats` keep the filename they declare.
- If no rule targets a voice in a nonempty legacy kit, the loader uses that kit’s first available voice.
- GBrain: `projects/drumlet` confirms the repository, protected-main workflow, and prior verification baseline. The spec, plan, and dispatch govern this task.

## Open questions

None. A listening comparison against the owner’s A/B page and playback on Safari remain unverified.

## Return

- Outcome: done, ready for review
- Commits: `9d5e1fd` receiver acknowledgment and `4bb436d` implementation
- Follow-ups: review Task 1 before releasing dependent Tasks 2 and 4.
