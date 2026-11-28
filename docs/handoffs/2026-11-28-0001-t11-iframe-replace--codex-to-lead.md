# Handoff: 0001-t11 — Replace the iframe embed (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#replacing-the-iframe-embed) · [Task 11](../plans/0001-drumlet-player.md#task-11-replace-the-iframe-embed) · [Dispatch](2026-11-28-0001-t11-iframe-replace--lead-to-codex.md)
- Branch: `orch/0001-t11-iframe-replace`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-3f7aa9be-0fbe799fa197d659`
- Base: `f2cfd53` (player package build) · `1c1a370` (dispatch)
- Commits: `4885890` (ack) · `f7e3322` (implementation)
- Port: 5211 (stopped)
- Status: ready for review. The branch opens as a draft PR.

## Goal and scope

Plain `?embed=1#s=…` links now open a read-only DrumletPlayer with full chrome and endless view. Plugin and challenge shares still mount App. The Share modal keeps its share link and embed URL and gives the React/npm and iframe snippets separate copy buttons.

The diff stays within the two handoffs, `src/main.tsx`, `src/player/EmbedPage.tsx` and its test, `src/components/ShareModal.tsx`, the two snippet builders in `src/state/shareCodec.ts` and their tests, `scripts/embed-route.check.mjs`, and one script key in `package.json`. Task 10 files, package build, and ledger are unchanged.

## Acceptance and verification

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run check:embed-route
```

Final output after orch-deslop:

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 847ms
Test Files  21 passed (21)
     Tests  255 passed (255)
PASS v3 mounts the player, loads the local kick and advances playback
PASS v4 renders all three pages and 48 steps in the endless view
PASS 360×400 iframe is filled and only the grid scrolls horizontally
PASS embed defaults to light on a dark system and accepts ?theme=dark
PASS challenge metadata opens the full app’s challenge setup
PASS both Share modal embed buttons copy their snippets at 360×500
```

The browser check fetched the local acoustic1 kick with HTTP 200, observed at least two buffer starts in a running AudioContext, and saw the playhead reach step 5. Unit tests cover v1 and v2 read-only grids and both snippet builders. The browser check uses headless Chromium, not a listening test or a deployed app. Lint reported the two existing `AuthModal` hook warnings. The build still reports Verovio externalization and large chunks. orch-deslop removed a redundant host navigation and reused the iframe locator. The full verification passed again.

## Decisions and known gotchas

- The dispatch amendments win. EmbedPage omits `assetBaseUrl` to use the app’s `/samples/` path. Task 11 owns `check:embed-route`.
- App and EmbedPage load separately. Plain embeds do not need the full App chunk. Load order still gives valid `#dottl=` links precedence.
- The theme query applies to the iframe document and player without changing the saved app theme. Missing or unrecognized values use light.
- Chromium uses the repository’s playwright-core when present and the handoff’s sibling install otherwise. Set `CHROMIUM_PATH` to override the pinned browser executable.
- GBrain: `projects/drumlet` records the protected-main PR workflow. The dispatch governs Task 11.

## Return

Outcome: done, ready for exact-head review. No open questions. The lead can promote the shared sample-path decision to GBrain if it is useful for other hosts.
