# Handoff: 0001-t1 — Test harness, re-encoded kit, format-aware kit loader (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t1 / "Task 1")
- **Branch:** orch/0001-t1-kit-loader · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** 3384c8f (main after #27 merged)
- **Port (if running a server):** 5211
- **Status:** open

## Goal
Add a Vitest test harness to Drumlet, replace `public/samples/acoustic1` with the owner-approved smaller "variant B" encodes (both `.ogg` and `.m4a`), and make the kit loader pick a format per browser, use a configurable base URL, and fall back to the nearest acoustic voice when a requested sample key is missing — exactly as Task 1 of the plan specifies (Interfaces + steps).

## Context you need
- Plan Task 1 (Files, Interfaces, Steps) and the plan's Global Constraints + Review Focus item 5. Spec § "Default kit".
- Current loader: `src/audio/customKits.ts` (`loadKitManifest`, `loadKitSample`, hard-coded `/samples/${kitId}/…`), used by `src/audio/useAudioEngine.ts`.
- Variant B encode settings (owner A/B-approved): tails crash 5 s / ride 4.5 s / ride-bell 3.5 s / hh-open 2.5 s, each with `afade=t=out:st=<L-0.4>:d=0.4`; crash, ride, ride-bell, hh-open stereo (`-ac 2`), all others mono (`-ac 1`); `-ar 44100`; ogg = `-c:a libvorbis -q:a 3`; m4a = `-c:a aac -b:a 64k` (mono) / `96k` (stereo). Reference output measured ≈335 KB ogg total from the current 902 KB.
- No test runner exists yet (`package.json` has no `test` script).

## Scope
- **In:** everything in plan Task 1, including the `scripts/encode-acoustic-kit.sh` script and committing its output into `public/samples/acoustic1/` (28 audio files + `kit.json` with `"formats": ["ogg","m4a"]`).
- **Out:** share codec, player package, transport, anything visual.
- **Files you own:** `vitest.config.ts`, `src/test/**`, `scripts/encode-acoustic-kit.sh`, `public/samples/acoustic1/**`, `src/audio/customKits.ts`, `src/audio/customKits.test.ts`, `src/audio/useAudioEngine.ts` (only the kit-sample resolution call site), `package.json`, `package-lock.json`.
- **Do not touch:** `docs/wip/LEDGER.md`, other `src/**` files.

## Acceptance criteria
- [ ] `npm test` runs Vitest (jsdom) and all `customKits.test.ts` cases from the plan pass, including `resolveKitSampleKey` fallbacks (`snare-rim→snare-on1`, `tom-low→hi-tom`, `cowbell→kick`, `ride-bell→ride-bell`) and the fetch-reject case.
- [ ] `setKitBaseUrl` / `getKitBaseUrl` / `pickAudioFormat` / `kitSampleUrl` exist with the exact signatures in the plan; default base `/samples/`.
- [ ] `public/samples/acoustic1/` holds 14 `.ogg` + 14 `.m4a` from the script; ogg total within ±10% of 335 KB.
- [ ] The app still plays acoustic grooves (manual check: `npm run dev -- --host 0.0.0.0 --port 5211`, load a stock groove using acoustic1).
- [ ] Missing kit sample key in `useAudioEngine` resolves via `resolveKitSampleKey`, no throw, no silence.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
bash scripts/encode-acoustic-kit.sh <orig-dir> /tmp/kit-check && du -cb /tmp/kit-check/*.ogg | tail -1
```
(Original 48 kHz files for re-running the script are in git history: `git show 3384c8f:public/samples/acoustic1/<file>`.)

## Known gotchas / decisions already made
- Safari: `.m4a` exists so older Safari works; each browser downloads only one format (`canPlayType('audio/ogg; codecs="vorbis"')`).
- Samples are cleared for public redistribution (owner, 2026-11-27).
- The files the package bundles later get MIT SPDX headers in t9 — not your concern now.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
