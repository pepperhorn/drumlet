# Handoff: 0001-t12 — Release workflow + docs (lead → codex)

- **Date:** 2026-11-28
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t12, "Task 12")
- **Branch:** orch/0001-t12-release · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** c0a37de (main with t1–t11 merged)
- **Port (if running a server):** 5212
- **Status:** open

## Goal
Implement plan **Task 12** with the amendments below: a tag-triggered GitHub Actions workflow that gates on the full release check and publishes `@pepperhorn/drumlet-player` to npm via trusted publishing (OIDC, provenance); a CI workflow for PRs; complete package docs; DESIGN.md and CHANGELOG entries; and the stale-build gap from the t10 review (ledger S31). Nothing is published by you — the owner does the first publish by hand.

## Amendments (lead, 2026-11-28 — these win over the plan text)
- **Port** `/home/shaun/module/.github/workflows/release.yml` (read it) to `.github/workflows/release-player.yml`, triggered by tags `player-v*`; the "tag matches package version" step compares against `player-v${version}`. Publish with `npm publish ./packages/drumlet-player --access public --provenance`.
- **The release job must run the whole gate before publishing:** `npm ci`, typecheck, lint, `npm test`, `build:lib`, `verify:lib`, `smoke:pack`, `check:embed`, `check:embed-route`. CI has no cached headless shell: install Chromium in the job (e.g. `npx playwright-core install chromium` / `npx playwright install --with-deps chromium`) and pass `CHROMIUM_PATH` / `PLAYWRIGHT_CORE_PATH` as the t10/t11 scripts expect. Read `scripts/pack-smoke.mjs`, `scripts/player-embed.check.mjs`, `scripts/embed-route.check.mjs` for their env vars.
- **Add `.github/workflows/ci.yml`** (PRs + pushes to main): the same gate minus publishing. Drumlet has no workflows yet, so keep it lean and use npm cache.
- **S31 (from #46 review r2):** `scripts/pack-smoke.mjs:~108` only checks `src/player|audio|components` (`.ts/.tsx/.css`) for staleness; the package also bundles `src/state`, `src/notation`, `src/plugins`, `src/util` and `.json` data. Scan all of `src/` except tests, `App.tsx`, `main.tsx` and `demo.tsx`, including `.json`. Show a touched `src/state` file now makes it refuse.
- **Docs:** `packages/drumlet-player/README.md` per the plan (install; usage incl. `style.css`; full props table incl. `groove` formats, `chrome`, `view`, `display`, `theme`, `bpm`, `assetBaseUrl`, callbacks, ref handle; chrome presets; theming — what `className` can and can't override; kits + jsDelivr default + self-hosting via `assetBaseUrl`; SSR/Astro `client:only="react"` / `client:visible`; one shared AudioContext; licence MIT vs app AGPL). Add a short "Releasing" section to the root README (bump version → tag `player-vX.Y.Z` → workflow publishes; first publish is manual). DESIGN.md decisions log: endless view; hardware player; unlayered scoped package CSS. CHANGELOG entry.
- **Version:** keep `0.1.0` for the first publish.

## Scope
- **Files you own:** `.github/workflows/**`, `scripts/pack-smoke.mjs` (staleness scan only), `packages/drumlet-player/README.md`, `README.md` (Releasing section only), `DESIGN.md` (decisions log only), `CHANGELOG.md`, root `package.json` (scripts only, if a combined `release:check` script helps).
- **Do not touch:** `docs/wip/LEDGER.md`, any `src/**`, the package build scripts beyond what's listed. Don't publish, don't push tags, don't configure npm.

## Acceptance criteria
- [ ] `npm run build:lib && npm run verify:lib && npm pack --dry-run -w packages/drumlet-player` lists only `dist/**`, README, LICENSE, package.json.
- [ ] Both workflows pass `actionlint` (run it via `npx actionlint` or the Docker image) and every command they run passes locally in the same order (paste the tail).
- [ ] S31: touching a `src/state/*.ts` or a `.json` after `build:lib` makes `smoke:pack` refuse with a clear message.
- [ ] README props table matches `DrumletPlayerProps` in `src/player/DrumletPlayer.tsx` exactly (names, types, defaults).
- [ ] Return handoff lists the exact steps the owner must do outside the repo for the first release: `npm login`; the manual first `npm publish` command (with `--access public`); then configure npm trusted publishing for `pepperhorn/drumlet` + `release-player.yml` on npmjs.com; and how later releases work.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run build:lib && npm run verify:lib && npm run smoke:pack && npm run check:embed && npm run check:embed-route
npm pack --dry-run -w packages/drumlet-player
```

## Known gotchas / decisions already made
- npm trusted publishing needs npm ≥ 11.5.1 in the job (the module workflow updates npm).
- Owner instruction (global): `npm login` and publish are separate steps, never chained.
- If the plan and this handoff disagree, this handoff's Amendments win; say so.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

I’ll add PR and main CI, a version-checked `player-v*` workflow for npm
trusted publishing, and the missing stale-source check. I’ll update the player
docs and record the owner’s first-release steps. The dispatch amendments take
precedence over Task 12. I’ll keep version 0.1.0 and leave the source, ledger,
npm configuration and tags unchanged. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
