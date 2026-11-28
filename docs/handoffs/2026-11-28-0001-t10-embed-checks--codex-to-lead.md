# Handoff: 0001-t10 — Demo page, embed checks, pack smoke (Codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Task 10 plan](../plans/0001-drumlet-player.md#task-10-demo-page-playwright-embed-checks-pack-smoke) · [Amended dispatch](2026-11-28-0001-t10-embed-checks--lead-to-codex.md)
- Branch: `orch/0001-t10-embed-checks`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-b8282c4d-05b6df5822805713`
- PR: [#46](https://github.com/pepperhorn/drumlet/pull/46) · [previous review](https://github.com/pepperhorn/drumlet/pull/46#pullrequestreview-6095662159)
- Base: `f2cfd53` (library build) and `1c1a370` (dispatch)
- Ports: 5210 for the local demo (stopped). The packed harness binds an OS-assigned loopback port.
- Status: review fixes ready for recheck

## Goal and scope

Add the dark/full and light/minimal local demo and check the package in a fresh Vite React host before Task 12 releases it. The dispatch amendments take precedence over the plan.

The branch changes only the demo HTML and TSX, the two pack and embed scripts, their entries in root `package.json`, and Task 10 handoffs. Task 11 owns and checks the legacy iframe route. The ledger, player package source and build, lockfile, and Task 11 files are unchanged.

## Production app parity

Removed the multi-page input. `vite.config.js` now matches `origin/main` and the demo runs at `/player-demo.html` on the Vite dev server. Its layout CSS lives in the demo HTML rather than adding Tailwind candidates to the app.

Built the previous head `1d9c1fd`, `origin/main` at `b04ec74`, and the fixed branch with the same installation. The 36 unchanged public files are `Social.png`, `favicon.svg`, `icons.svg`, `robots.txt`, `serve.json`, `sitemap.xml`, `fonts/Petaluma.zip`, and the 29 files under `samples/acoustic1/`. Generated files before and after:

| Previous head (49 total) | Fixed head and main (42 total) |
| --- | --- |
| `index.html`, `player-demo.html` | `index.html` |
| `assets/app-CajRAwyb.js` | `assets/index-DGXQIS7l.js` |
| `assets/NotationBoundary-BcU9O14d.css` | `assets/index-B9iSyJ4j.css` |
| `assets/chunk-7ZXdHUL4.js` | `assets/chunk-B3K2TuZy.js` |
| `assets/NotationView-C-urUwem.js` | `assets/NotationView-DJqrZlKV.js` |
| `assets/__vite-browser-external-Dyjssl4o.js` | `assets/__vite-browser-external-CmG9GjjO.js` |
| `assets/v4-TLZhjGe-.js`, `assets/NotationLoading-CoqASsfl.js`, `assets/NotationBoundary-CT7HRq7u.js`, `assets/stockRhythms-CaAjQoxu.js` | — |
| `assets/playerDemo-BHfqNS_v.js`, `assets/playerDemo-DuTooc39.css` | — |

The fixed build and main have identical sorted file paths and SHA-256 hashes across all 42 files. `cmp` found no change in `dist/index.html`. Its entry is `index-DGXQIS7l.js`, its single local modulepreload is `chunk-B3K2TuZy.js`, and its local stylesheet is `index-B9iSyJ4j.css`. The identical stylesheet includes no new demo utilities.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run build:lib && npm run verify:lib && npm run smoke:pack && npm run check:embed
```

Both commands passed after orch-deslop. Vitest passed 250 tests in 20 files. Lint reported 0 errors and the two existing `AuthModal.tsx` warnings. The app build matched main byte for byte. The library check verified scoped CSS, lazy notation, declarations, SSR import, and all 28 acoustic1 samples. Vite reported Verovio browser externalization and chunk-size warnings.

Chromium loaded the Vite dev demo, verified dark/full and light/minimal, and observed playback switch from A to B.

### Pack smoke output

```text
┌─────────┬─────────────────────────┬───────────────────────────────────────┐
│ (index) │ check                   │ result                                │
├─────────┼─────────────────────────┼───────────────────────────────────────┤
│ 0       │ 'npm pack'              │ 'pepperhorn-drumlet-player-0.1.0.tgz' │
│ 1       │ 'fresh host install'    │ 'tarball + React peers'               │
│ 2       │ 'Vite production build' │ 'standard and Tailwind hosts'         │
└─────────┴─────────────────────────┴───────────────────────────────────────┘
```

### Embedded browser check output

The matrix measures both full and minimal controls in each theme. Starting each of eight players reached a running context and a playback step. The context stayed unique and suspended after the last Stop.

```text
┌─────────┬────────────────────────────────┬───────────────────────────────────────────────────────────────────┐
│ (index) │ check                          │ result                                                            │
├─────────┼────────────────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 0       │ 'npm pack'                     │ 'pepperhorn-drumlet-player-0.1.0.tgz'                             │
│ 1       │ 'fresh host install'           │ 'tarball + React peers'                                           │
│ 2       │ 'Vite production build'        │ 'standard and Tailwind hosts'                                     │
│ 3       │ 'clean (light + dark)'         │ 'pad 36x36, Play 44x44'                                           │
│ 4       │ 'button reset (light + dark)'  │ 'pad 36x36, Play 44x44'                                           │
│ 5       │ 'large fonts (light + dark)'   │ 'pad 36x36, Play 44x44'                                           │
│ 6       │ 'button layout (light + dark)' │ 'pad 36x36, Play 44x44'                                           │
│ 7       │ 'div padding (light + dark)'   │ 'pad 36x36, Play 44x44'                                           │
│ 8       │ 'tailwind (light + dark)'      │ 'pad 36x36, Play 44x44'                                           │
│ 9       │ 'CSS isolation'                │ '12 host probes unchanged, host className applied'                │
│ 10      │ 'chrome="none"'                │ '0 kit/notation-engine requests, 0 AudioContexts'                 │
│ 11      │ 'Grid / notation'              │ '0 engine requests in grid, switch fetches chunk and renders SVG' │
│ 12      │ 'Playback handoff'             │ 'B plays and A stops'                                             │
│ 13      │ 'assetBaseUrl'                 │ 'manifest and samples use /custom-player-assets/kits/'            │
│ 14      │ 'Shared audio'                 │ '8 players, 1 AudioContext, suspended at idle'                    │
└─────────┴────────────────────────────────┴───────────────────────────────────────────────────────────────────┘
```

### Scratch mutations

Each case changed only a copy of the packed output. The test exited 1 in all four cases. The scratch runs reused `PLAYWRIGHT_CORE_PATH` and ran concurrently on different loopback ports.

```text
claimPlayback no longer stops the previous player
Error: player 1 never emitted stop
  [cause]: page.waitForFunction: Timeout 15000ms exceeded.

assetBaseUrl is ignored
Error: assetBaseUrl: requested https://cdn.jsdelivr.net/npm/@pepperhorn/drumlet-player@0.1.0/dist/kits/acoustic1/kit.json outside http://127.0.0.1:42529/custom-player-assets/kits/acoustic1/
  [cause]: Error: player 1 emitted error while waiting for play: Failed to fetch

each player creates its own AudioContext
AssertionError [ERR_ASSERTION]: 8 players share one AudioContext (running after player 2 starts)
+   'suspended',

style.css is wrapped in @layer regression
AssertionError [ERR_ASSERTION]: button reset / light: pad/Play dimensions differ from clean host
Full/light pad changed from 36×36 to 11.5625×24. Play changed from 44×44 to 16×24.
```

Both freshness guard cases exited 1 before packing or installing anything.

```text
Error: Missing packages/drumlet-player/dist/index.js. Run npm run build:lib first.
Error: Packed library is stale: src/audio/sharedAudioContext.ts is newer than dist/index.js. Run npm run build:lib first.
```

## Decisions and known gotchas

- Both release checks require fresh library output from `npm run build:lib` before packing. They compare the built entry's mtime to the player, audio, and component source files, excluding the demo and tests. The browser serves the consumer build, and the kit override uses samples copied from the installed package.
- Set `CHROMIUM_PATH` to the Chromium executable in CI, or use the cached headless shell revision 1254. Set `PLAYWRIGHT_CORE_PATH` to an existing Playwright Core package directory or entry file. Otherwise the temporary host installs the pinned version. Temporary npm installs time out after 120 seconds.
- The CSS snapshot compares every computed property except the package-private `--dp-tw-*` registrations, whose initial values Chromium exposes document-wide. The probes deliberately reuse classes such as `hw-btn`, `pad` and `step-cell` to catch leaking rules.
- The grid loads a shared `notationPrefetch` support chunk. The check treats the lazy NotationView/Verovio engine and Petaluma archive as notation requests. The Notation button provides a positive control by fetching the engine and font and drawing an SVG.
- GBrain: `projects/drumlet` confirms the repo and protected-main workflow. The amended dispatch governs this task.

## Open questions

None. Verification covered headless Chromium and Web Audio state, not physical audio devices or other browsers.

## Return

- Outcome: done. No package was published.
- Commits: `a5ee289` acknowledgment `7413d0e` implementation, and `7de0d61` review fixes.
- Follow-up: Recheck the fix head and run both scripts after `build:lib` in Task 12.
