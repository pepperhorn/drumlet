# Handoff: 0010 — Drumlet Player publish guard (codex → lead)

- **Date:** 2026-11-28
- **Type:** return
- **Ledger:** 0010 · **Spec and plan:** none (quick item S32)
- **Branch:** `orch/0010-prepublish-guard`
- **Worktree:** `/home/shaun/.t3/worktrees/drumlet/t3-fbf097dc-2383bca0469d0c11`
- **Base commit:** `ee8fe16` (dispatch docs at `4f55157`)
- **Implementation commit:** `a81eec7`
- **Status:** done, ready for review

## Goal and scope

[Dispatch handoff](2026-11-28-0010-prepublish-guard--lead-to-codex.md). A directory publish rebuilds the player and verifies the result before npm packs it. The only code change is the `scripts` section of [the player manifest](../../packages/drumlet-player/package.json). Release commands, workflows, dependencies, and lockfile are unchanged. No release tag or live publish was attempted.

## Acceptance and verification

- A root publish dry-run with no `dist/` rebuilt and passed both library checks. A dry-run from the package directory also passed and removed a stale file planted in `dist/`.
- The root and package-directory dry-runs produced matching tarball checksums. Both and the workspace pack dry-run listed the same 73 paths as the unhooked baseline. The only paths outside `dist/` were README.md, LICENSE, and package.json. All non-manifest file sizes matched the baseline.
- In a scratch copy, the library build removed the generated `dist/style.css` as its last step. The real `verify:lib` failed with `ENOENT` and npm exited 1 without printing a tarball listing.

```bash
npm ci
npm run typecheck && npm run lint && npm run build
npm test
# With packages/drumlet-player/dist removed:
npm publish ./packages/drumlet-player --dry-run --access public
(cd packages/drumlet-player && npm publish --dry-run --access public --provenance)
npm pack --dry-run -w packages/drumlet-player
npm run smoke:pack
```

```text
Test Files  21 passed (21)
     Tests  256 passed (256)
dist OK: scoped CSS, lazy notation, declarations and 28 matching acoustic1 samples.
SSR import passed with browser globals unavailable.
npm notice total files: 73
Packed-host smoke: tarball install and Vite builds for standard and Tailwind hosts passed.
```

The first full test run had two UI timeouts on the loaded host. A two-worker retry hit a separate async UI timeout. The full suite passed with `--maxWorkers=4 --testTimeout=60000 --retry=2` before and after orch-deslop, then passed with plain `npm test` once the host load dropped. Local runs used Node 26.12.0 and npm 11.20.0. The orch-deslop pass needed no code changes. The repeat install, typecheck, lint, build, clean publish dry-run, and workspace pack dry-run passed.

## Decisions made

- npm runs `prepublishOnly` in the package directory. Both commands use `npm --prefix ../..` to run the root scripts. `&&` stops on either failure, and Vite empties the old library output before rebuilding.
- [CI](../../.github/workflows/ci.yml) still needs its explicit build and verification. The pack and browser checks do not publish and do not run `prepublishOnly`.
- [The tag release](../../.github/workflows/release-player.yml) still needs its first build for smoke and browser checks. Its publish step then repeats only the clean library build and verifier. npm 11.20.0 runs the hook before packing and before OIDC token exchange. The hook does not touch authentication or the outer `--provenance` flag. The local provenance dry-run did not exercise live OIDC.

## Open questions and follow-ups

No open implementation questions. Lint reported two existing hook dependency warnings in `AuthModal.tsx` and no errors. Review the draft and its GitHub CI result before merging. The first live publish and trusted-publisher setup remain with the owner.

GBrain context: `default:projects/drumlet` records the first manual publish followed by trusted-publisher setup. The publish guard and scratch failure check are ready for the lead to record after merge.
