# Handoff: 0010 — [quick] prepublishOnly guard for @pepperhorn/drumlet-player (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0010 · **Spec:** none (quick; owner accepted ledger S32 from PR #47 review) · **Plan:** none
- **Branch:** orch/0010-prepublish-guard · **Worktree:** created by T3
- **Base commit:** ee8fe16
- **Status:** open

## Goal
The owner is about to publish `@pepperhorn/drumlet-player` by hand for the first time. Make `npm publish` (run from the repo root as `npm publish ./packages/drumlet-player --access public`, or from inside the package) impossible to run against a missing or stale `dist/`: add a `prepublishOnly` script to `packages/drumlet-player/package.json` that rebuilds the library from the repo root and runs the full `verify:lib` check (dist contents + SSR import), failing the publish on any error. Mirror `/home/shaun/module/packages/sound-module/package.json` (`prepublishOnly`), but rebuild first since this repo's release workflow and the owner's manual run both go through it. It must also work inside `.github/workflows/release-player.yml` (the job already builds; a second build there is fine, but confirm it doesn't break OIDC publish or double-run anything harmful).

## Files you own
`packages/drumlet-player/package.json` (scripts only), and a small helper script under `packages/drumlet-player/scripts/` if needed. Update the owner's release steps in `packages/drumlet-player/README.md` and the root `README.md` Releasing section only if the command they document changes.

## Acceptance criteria
- [ ] With `packages/drumlet-player/dist` deleted, `npm publish ./packages/drumlet-player --dry-run --access public` rebuilds, verifies and produces the same 73-file tarball; with a deliberately broken `dist` check (e.g. temporarily make `verify:lib` fail in a scratch copy) the dry-run aborts before packing.
- [ ] `npm pack --dry-run -w packages/drumlet-player` still lists only `dist/**`, README, LICENSE, package.json.
- [ ] CI (`ci.yml`) and `release-player.yml` still make sense with the hook (explain in the return handoff).

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
rm -rf packages/drumlet-player/dist && npm publish ./packages/drumlet-player --dry-run --access public
npm pack --dry-run -w packages/drumlet-player
```
Never run `npm publish` without `--dry-run`.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
