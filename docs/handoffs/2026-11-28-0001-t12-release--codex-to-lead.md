# Handoff: 0001-t12 — Drumlet Player release (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Task 12 plan](../plans/0001-drumlet-player.md#task-12-release-workflow--docs)
- Branch: `orch/0001-t12-release`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-420fb1e2-9927d595c24fc71b`
- PR: Draft to open from this branch
- Base: `c0a37de` (t11 merge) · `1c69350` (dispatch)
- Port: 5211 (iframe check only, stopped)
- Status: open for review

## Goal and scope

Gate the player release with CI and document how to install, use and publish
the package. The [dispatch amendments](2026-11-28-0001-t12-release--lead-to-codex.md) take precedence
over Task 12. The branch changes only the two workflows, the stale-source
scan in `scripts/pack-smoke.mjs`, the package README, the root README’s
Releasing section, the design decisions log, the changelog and the two
handoffs. It leaves the ledger, source, dependencies and version unchanged.

## Acceptance and verification

Both workflows passed actionlint. The shared gate ran in workflow order on
Ubuntu 24.04. The first run installed Chromium into a new directory. The tag
guard accepted `player-v0.1.0` and stopped on `player-v0.1.1`. The second run
followed CI after the orch-deslop pass, which tightened the README’s callback
and theming descriptions. Neither run published.

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run build:lib && npm run verify:lib && npm run smoke:pack
# Run the Chromium setup step from either workflow and load its GITHUB_ENV values.
npm run check:embed && npm run check:embed-route
npm pack --dry-run -w packages/drumlet-player
docker run --rm -v "$PWD:/repo:ro" -w /repo rhysd/actionlint:1.7.11 \
  .github/workflows/ci.yml .github/workflows/release-player.yml
```

```text
actionlint 1.7.11: both workflows passed
Node v24.22.3, npm 11.20.0: all non-publish workflow steps passed
Tests  256 passed (256)
dist OK: scoped CSS, lazy notation, declarations and 28 matching acoustic1 samples.
SSR import passed with browser globals unavailable.
│ 14      │ 'Shared audio'                 │ '8 players, 1 AudioContext, suspended at idle'                    │
PASS v3 mounts the player, loads the local kick and advances playback
PASS v4 renders all three pages and 48 steps in the endless view
PASS 360×400 iframe is filled and only the grid scrolls horizontally
PASS embed defaults to light on a dark system and accepts ?theme=dark
PASS challenge metadata opens the full app’s challenge setup
PASS garbage, unknown-version and empty embeds show the player error without requesting App
PASS both Share modal embed buttons copy their snippets at 360×500
README documents all 13 DrumletPlayerProps in declaration order
pepperhorn-drumlet-player-0.1.0.tgz: 73 files, only dist/**, README.md, LICENSE and package.json
Packed library is stale: src/state/sequencerReducer.ts is newer than dist/index.js. Run npm run build:lib first.
Packed library is stale: src/data/stockRhythms.json is newer than dist/index.js. Run npm run build:lib first.
::error::tag player-v0.1.1 does not match package version player-v0.1.0
```

Both stale-file checks advanced the source mtime past `dist/index.js` and
restored it after checking exit code 1. Lint reported the two existing
`AuthModal.tsx` hook warnings. The build still reports Verovio externalization
and large chunks. npm reported 19 audit findings and warnings for existing
dependency install scripts.

## Decisions made

- Both embed checks use Playwright Core 1.64.1 and its Chromium headless shell.
  The temporary install leaves the lockfile alone. The package check reads
  `PLAYWRIGHT_CORE_PATH`. The iframe check finds the module through `NODE_PATH`.
- CI caches npm downloads. The release job disables the cache and pins
  npm 11.20.0, above the trusted-publishing minimum. The tag workflow grants
  OIDC permission to the publish job.
- GBrain `projects/drumlet` records the protected-main workflow. The repo
  spec and dispatch govern this release.

## First release (owner)

1. After merge, check out the release commit on `main`. From the repo root,
   run `npm ci`, `npm run build:lib` and `npm run verify:lib`.
2. Run `npm login` and complete the npm prompts.
3. In a separate command, run
   `npm publish ./packages/drumlet-player --access public` to create version
   0.1.0. Do not push a `player-v0.1.0` tag for the manual publish.
4. In the package settings on npmjs.com, add a GitHub Actions trusted publisher
   for owner `pepperhorn`, repository `drumlet` and workflow filename
   `release-player.yml`. Leave the environment blank and allow publishing if
   prompted.
5. For later releases, bump the workspace version and update the root lockfile.
   Once the bump is merged, tag that commit with the matching `player-vX.Y.Z`
   tag and push that tag. The workflow verifies the package and publishes it
   with provenance.

## Return

Done and ready for review. No tags were created or pushed, nothing was published,
and no npm account or package settings were changed. Live GitHub Actions and
npm OIDC remain unverified. No open questions.
