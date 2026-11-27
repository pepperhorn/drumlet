# Handoff: 0001-t2 — Share codec v4 (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Task 2 plan](../plans/0001-drumlet-player.md#task-2-share-codec-v4--all-pages)
- Branch: `orch/0001-t2-share-v4`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-34002d3d-f46d07781c04ab9f`
- Base: `f8c05d6` (v3 encoder) · `a947869` (dispatch)
- PR: draft to open after this commit from [the task branch](https://github.com/pepperhorn/drumlet/compare/main...orch/0001-t2-share-v4)
- Port: 5212 (stopped)
- Status: ready for review

## Goal and scope

Share every page, including names, steps, and section headings, while retaining single-page decoding for v1–v3. The [dispatch handoff](2026-11-27-0001-t2-share-v4--lead-to-codex.md) limits code changes to `src/state/shareCodec.ts` and `src/state/shareCodec.test.ts`. No app, transport, embed routing, or ledger files changed. The Task 4 plan amendment on main does not change Task 2.

## Acceptance and evidence

- A v4 code shares all three test pages from page 2. It carries per-page tracks and heading tuples, drops the top-level track field, and opens at page 1. Page 2 retains the split step and page 3 retains the step-4 Chorus heading.
- The v3 fixture comes from the encoder at `f8c05d6`. It decodes to one page with `[7, 0, [1, 3], 0]`, the Café Kick name, and plugin metadata. v1 and v2 fixtures decode as one page each. Garbage and invalid v4 headings return `null`.
- Before the codec change, the v4 version and Unicode tests failed. Both passed after the implementation.
- Chromium on port 5212 opened the v4 URL at Intro, showed the right pads on Verse and Finale, and rendered the Unicode Chorus heading. The Share modal emitted matching payloads for the share URL, embed URL, and iframe snippet.
- The v3 `?embed=1` link rendered one page with four cells and one split cell. Play scheduled local acoustic kit audio. The check blocked external requests and recorded no uncaught page errors. It did not measure physical audio output.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run dev -- --host 0.0.0.0 --port 5212
```

The full verification passed after orch-deslop flattened the page validator.

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 1.66s
 Test Files  2 passed (2)
      Tests  99 passed (99)
```

## Decisions made

- v4 emits ASCII JSON escapes for non-ASCII characters, so Unicode labels survive base64url without changing how the decoder reads legacy Latin-1 bytes.
- v4 uses the same track encoding, split-step behavior, and plugin metadata as v3. It derives page order from the pattern rather than the selected tab. The decoder generates page, track, and heading IDs.
- The v4 decoder checks page names and heading tuples before they reach the app. Zero-page and zero-track groove handling belongs to Task 3.
- GBrain: `projects/drumlet` confirms the protected-main workflow. The spec and plan govern the share format.

## Return

- Outcome: done, ready for review.
- Implementation: `689abf4` (receiver acknowledgement) and `3211d39` (v4 codec and tests), followed by the orch-deslop cleanup.
- Out-of-scope issues: the existing lint warnings in `AuthModal.tsx`, the Vite/Verovio build warnings, and npm's audit report remain.
- Open questions: none.
- Follow-up: Task 3 can use `decodePayload` to resolve shares. Task 11 owns the later embed routing change.
- For GBrain: the frozen v3 fixture includes raw Latin-1 and a split step. Keep it independent of the current encoder for future compatibility checks.
