# Handoff: 0001-t10 — Demo page, embed checks, pack smoke (Codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Task 10 plan](../plans/0001-drumlet-player.md#task-10-demo-page-playwright-embed-checks-pack-smoke) · [Amended dispatch](2026-11-28-0001-t10-embed-checks--lead-to-codex.md)
- Branch: `orch/0001-t10-embed-checks`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-b8282c4d-05b6df5822805713`
- PR: [branch comparison for the draft against main](https://github.com/pepperhorn/drumlet/compare/main...orch/0001-t10-embed-checks)
- Base: `f2cfd53` (library build) and `1c1a370` (dispatch)
- Port: 5210 (stopped)
- Status: ready for review

## Goal and scope

Add the dark/full and light/minimal local demo and check the package in a fresh Vite React host before Task 12 releases it. The dispatch amendments take precedence over the plan.

Changed only `player-demo.html`, `src/player/demo.tsx`, `scripts/player-embed.check.mjs`, `scripts/pack-smoke.mjs`, Vite multi-page input, the two root npm scripts, and Task 10 handoffs. Task 11 owns and checks the legacy iframe route. The ledger, package source and build, lockfile, and Task 11 files are unchanged.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run build:lib && npm run verify:lib && npm run smoke:pack && npm run check:embed
```

Both commands passed after orch-deslop. Vitest passed 250 tests in 20 files. Lint reported 0 errors and the two existing `AuthModal.tsx` warnings. The app build emitted `index.html` and `player-demo.html`. The library check verified scoped CSS, lazy notation, declarations, SSR import, and all 28 acoustic1 samples. Vite reported Verovio browser externalization and chunk-size warnings.

A separate Chromium check of the built `/player-demo.html` verified dark/full and light/minimal, a live playhead in each, and B stopping A.

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

### Deliberate break

Copied the scripts and built package into a temporary directory. Wrapped only its `dist/style.css` in `@layer regression { … }` and ran `npm run check:embed` there with `CHROMIUM_PATH` set explicitly. Exit code 1. The unlayered reset collapsed both controls. The working package was unchanged.

```text
AssertionError [ERR_ASSERTION]: button reset / light: pad/Play dimensions differ from clean host
+ actual - expected

  [
    {
      pad: [
+       11.5625,
+       24
-       36,
-       36
      ],
      play: [
+       16,
+       24
-       44,
-       44
      ],
      theme: 'light'
    },
```

## Decisions and known gotchas

- The demo imports source styles. Both release checks install a new tarball from `build:lib` and build a consumer. The browser serves this consumer's output and uses only loopback requests. The kit files under the override are copied from the installed package.
- Set `CHROMIUM_PATH` to the executable in CI. If unset, the check uses the cached Chromium headless shell revision 1254 in the handoff. Playwright is pinned in the temporary host, not added to the repo.
- The CSS snapshot compares every computed property except the package-private `--dp-tw-*` registrations, whose initial values Chromium exposes document-wide. The probes deliberately reuse classes such as `hw-btn`, `pad` and `step-cell` to catch leaking rules.
- The grid loads a shared `notationPrefetch` support chunk. The check treats the lazy NotationView/Verovio engine and Petaluma archive as notation requests. The Notation button provides a positive control by fetching the engine and font and drawing an SVG.
- GBrain: `projects/drumlet` confirms the repo and protected-main workflow. The amended dispatch governs this task.

## Open questions

None. Verification covered headless Chromium and Web Audio state, not physical audio devices or other browsers.

## Return

- Outcome: done. No package was published.
- Commits: `a5ee289` acknowledgment and `7413d0e` implementation.
- Follow-up: Review this draft and use both npm scripts as the Task 12 release gate.
